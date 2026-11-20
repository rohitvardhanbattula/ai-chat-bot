import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { uploadDocument } from '@/lib/api';
import { validateAttachment, redactPii } from '@/lib/attachments';
import type { PiiItem, UploadResult } from '@/types/chat';

/**
 * Everything about a file attached to the chat input: validate → upload/extract
 * → let the user review sensitive values → expose the text to send.
 *
 * Stale-response safe: if the user removes or replaces the file while an upload
 * is in flight, that upload is cancelled and its result is ignored.
 */
export function useAttachment() {
    const [file,        setFile]        = useState<File | null>(null);
    const [result,      setResult]      = useState<UploadResult | null>(null);
    const [piiList,     setPiiList]     = useState<PiiItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error,       setError]       = useState<string | null>(null);

    const requestIdRef  = useRef(0);
    const controllerRef = useRef<AbortController | null>(null);

    const cancelInFlight = useCallback(() => {
        requestIdRef.current += 1;
        controllerRef.current?.abort();
        controllerRef.current = null;
    }, []);

    // Don't leave an upload running if the input unmounts (e.g. user opens another chat).
    useEffect(() => cancelInFlight, [cancelInFlight]);

    const clear = useCallback(() => {
        cancelInFlight();
        setFile(null);
        setResult(null);
        setPiiList([]);
        setError(null);
        setIsUploading(false);
    }, [cancelInFlight]);

    const attach = useCallback(async (selected: File) => {
        const validationError = validateAttachment(selected);
        if (validationError) {
            setError(validationError);
            return;
        }

        cancelInFlight();
        const requestId  = requestIdRef.current;
        const controller = new AbortController();
        controllerRef.current = controller;

        setError(null);
        setFile(selected);
        setResult(null);
        setPiiList([]);
        setIsUploading(true);

        try {
            const data = await uploadDocument(selected, controller.signal);
            if (requestId !== requestIdRef.current) return;   // superseded or removed
            setResult(data);
            // Safe default: every sensitive value is redacted until the user opts to keep it.
            setPiiList((data.piiList ?? []).map(p => ({ ...p, keep: false })));
        } catch (err: unknown) {
            if (requestId !== requestIdRef.current) return;
            console.error('[useAttachment] upload failed:', err);
            setError((err instanceof Error && err.message) || 'File extraction failed.');
            setFile(null);
            setResult(null);
            setPiiList([]);
        } finally {
            if (requestId === requestIdRef.current) setIsUploading(false);
        }
    }, [cancelInFlight]);

    const togglePii = useCallback((index: number) => {
        setPiiList(prev => prev.map((p, i) => (i === index ? { ...p, keep: !p.keep } : p)));
    }, []);

    const setAllPii = useCallback((keep: boolean) => {
        setPiiList(prev => prev.map(p => ({ ...p, keep })));
    }, []);

    /** Extracted text with the user's redaction choices applied — what gets sent to the model. */
    const textToSend = useMemo(
        () => (result ? redactPii(result.text, piiList) : null),
        [result, piiList]
    );

    return {
        file, result, piiList, isUploading, error,
        textToSend,
        attach, clear, togglePii, setAllPii,
        dismissError: useCallback(() => setError(null), [])
    };
}
