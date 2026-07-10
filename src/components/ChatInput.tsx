import { useState, useRef, useCallback } from 'react';
import { Send, Zap, Code2, Database, Workflow, AlertCircle, Paperclip, X, Plug } from 'lucide-react';
import { uploadDocument } from '@/lib/api';
import { SAPConnectionModal } from './SAPConnectionModal';

interface ChatInputProps {
    onSubmit: (prompt: string, category: string, extractedText: string | null) => void;
    isLoading?: boolean;
    minimal?: boolean;
    placeholder?: string;
    isLimitReached?: boolean;
    /**
     * The session ID (or tempId) to use when connecting to SAP.
     * Required when minimal=true (active chat mode).
     * In pre-session mode Index.tsx supplies a client-generated tempId.
     */
    sapSessionId?: string;
    /**
     * Whether a SAP connection is currently active for this session.
     * Controlled externally so Index.tsx / ActiveChat can manage the source of truth.
     */
    isSapConnected?: boolean;
    /**
     * Called when a connection is successfully established so the parent
     * can record the connected state and the ID that was used.
     */
    onSapConnected?: (sessionId: string) => void;
}

interface PiiItem {
    type: string;
    value: string;
    keep: boolean;
}

const PROMPT_TEMPLATES = [
    { icon: Code2,    label: 'Optimize ABAP code',   prompt: 'Optimize this ABAP SELECT statement for better performance with large datasets' },
    { icon: Database, label: 'CAP Service Handler',   prompt: 'Create a CAPM service handler with CRUD operations and custom actions' },
    { icon: Workflow, label: 'BTP Integration',       prompt: 'Build a Node.js integration between SAP BTP and Azure services' },
    { icon: Zap,      label: 'Fiori Elements',        prompt: 'Generate a List Report Fiori Elements app with custom annotations' },
] as const;

const CATEGORIES = ['abap-simple', 'abap-complex', 'general'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — must match backend

const ChatInput = ({
    onSubmit,
    isLoading,
    minimal,
    placeholder,
    isLimitReached,
    sapSessionId,
    isSapConnected = false,
    onSapConnected,
}: ChatInputProps) => {
    const [input,          setInput]         = useState('');
    const [category,       setCategory]      = useState<string>(CATEGORIES[0]);
    const [file,           setFile]          = useState<File | null>(null);
    const [isUploading,    setIsUploading]   = useState(false);
    const [extractedText,  setExtractedText] = useState<string | null>(null);
    const [piiList,        setPiiList]       = useState<PiiItem[]>([]);
    const [uploadError,    setUploadError]   = useState<string | null>(null);
    const [isSapModalOpen, setIsSapModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isBusy = isLoading || isUploading || !!isLimitReached;

    const buildFinalExtractedText = useCallback((): string | null => {
        if (!extractedText || piiList.length === 0) return extractedText;
        let masked = extractedText;
        for (const item of piiList) {
            if (!item.keep) {
                const escaped = item.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                masked = masked.replace(new RegExp(escaped, 'g'), `[REDACTED_${item.type.toUpperCase()}]`);
            }
        }
        return masked;
    }, [extractedText, piiList]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isBusy) return;

        onSubmit(trimmed, category, buildFinalExtractedText());
        setInput('');
        // Keep file attached so the user can send follow-ups with the same doc
    }, [input, isBusy, category, buildFinalExtractedText, onSubmit]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    }, [handleSubmit]);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setUploadError(null);

        if (selected.size > MAX_FILE_SIZE) {
            setUploadError('File exceeds the 10 MB limit. Please upload a smaller document.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setFile(selected);
        setIsUploading(true);
        try {
            const data = await uploadDocument(selected);
            setExtractedText(data.text);
            setPiiList((data.piiList || []).map((p: any) => ({ ...p, keep: false })));
        } catch (err: any) {
            setUploadError(err.message || 'File extraction failed.');
            setFile(null);
            setExtractedText(null);
            setPiiList([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setIsUploading(false);
        }
    }, []);

    const removeFile = useCallback(() => {
        setFile(null);
        setExtractedText(null);
        setPiiList([]);
        setUploadError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const togglePii = useCallback((index: number) => {
        setPiiList(prev => prev.map((p, i) => i === index ? { ...p, keep: !p.keep } : p));
    }, []);

    const handleSapConnected = useCallback((connectedSessionId: string) => {
        onSapConnected?.(connectedSessionId);
        setIsSapModalOpen(false);
    }, [onSapConnected]);

    // SAP connection status dot
    const SapStatusDot = () => (
        <span
            title={isSapConnected ? 'SAP Connected' : 'SAP Not Connected'}
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${isSapConnected ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
        />
    );

    return (
        <div className={minimal ? 'w-full' : 'flex flex-col items-center gap-5 sm:gap-6 w-full max-w-3xl mx-auto py-4'}>
            {!minimal && (
                <div className="text-center animate-slide-up w-full flex flex-col items-center shrink-0">
                    <h1 className="text-2xl font-semibold text-foreground mb-2">Code Generation</h1>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Input your requirements or upload a Functional Spec (max 10 MB).
                    </p>
                </div>
            )}

            {isLimitReached && (
                <div className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md animate-in fade-in slide-in-from-bottom-2 shrink-0" role="alert">
                    <AlertCircle className="w-4 h-4" />
                    Maximum prompt limit (20) reached. Please start a new chat to continue.
                </div>
            )}

            {uploadError && (
                <div className="w-full flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {uploadError}
                    <button onClick={() => setUploadError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
                </div>
            )}

            <form onSubmit={handleSubmit} className={`w-full shrink-0 ${minimal ? '' : 'animate-slide-up'}`}>
                <div className={`relative flex flex-col transition-all duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/25
                    ${minimal ? 'bg-card border-2 border-primary/60 rounded-lg shadow-lg' : 'bg-accent/10 border-2 border-primary/40 rounded-xl shadow-md'}
                    ${isLimitReached ? 'opacity-50 pointer-events-none grayscale' : ''}`}
                >
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 p-2 border-b border-primary/10 bg-muted/10 flex-wrap">
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="text-xs bg-background text-foreground outline-none border border-border rounded px-2 py-1 cursor-pointer"
                            aria-label="Prompt category"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        {/* SAP Connect button — shown whenever a sapSessionId is available */}
                        {sapSessionId && (
                            <button
                                type="button"
                                onClick={() => setIsSapModalOpen(true)}
                                className={`text-xs flex items-center gap-1.5 transition-colors px-2 py-1 rounded border
                                    ${isSapConnected
                                        ? 'text-green-600 border-green-500/40 bg-green-500/10 hover:bg-green-500/20'
                                        : 'text-muted-foreground border-border hover:text-primary hover:border-primary/40'
                                    }`}
                                title={isSapConnected ? 'SAP connected — click to reconnect' : 'Connect to SAP system'}
                            >
                                <Plug className="w-3.5 h-3.5" />
                                <SapStatusDot />
                                {isSapConnected ? 'SAP Connected' : 'Connect SAP'}
                            </button>
                        )}

                        {!minimal && (
                            <>
                                <input
                                    type="file"
                                    accept=".pdf,.docx"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={isUploading}
                                    aria-label="Upload functional spec"
                                />
                                <button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs flex items-center gap-1 hover:text-primary transition-colors disabled:opacity-50"
                                >
                                    <Paperclip className="w-3.5 h-3.5" />
                                    {isUploading ? 'Uploading…' : 'Attach Spec'}
                                </button>

                                {file && (
                                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                                        <span className="truncate max-w-[150px]" title={file.name}>{file.name}</span>
                                        {isUploading ? (
                                            <span className="text-[10px] animate-pulse ml-1">Extracting…</span>
                                        ) : (
                                            <button type="button" onClick={removeFile} aria-label="Remove file">
                                                <X className="w-3 h-3 hover:text-destructive" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* PII Panel */}
                    {piiList.length > 0 && !minimal && (
                        <div className="px-4 py-3 border-b border-primary/10 bg-destructive/5 flex flex-col gap-2 max-h-40 overflow-y-auto">
                            <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Sensitive Data Detected
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                Check items to <strong>ALLOW</strong> the AI to see them. Unchecked items will be redacted.
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                {piiList.map((pii, idx) => (
                                    <label
                                        key={idx}
                                        className="flex items-center gap-2 text-xs text-foreground cursor-pointer bg-background/50 p-1.5 rounded border border-border/50 hover:bg-background transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={pii.keep}
                                            onChange={() => togglePii(idx)}
                                            className="rounded border-border accent-primary"
                                        />
                                        <span className="truncate max-w-[200px]" title={pii.value}>{pii.value}</span>
                                        <span className="text-[9px] text-muted-foreground ml-auto bg-muted px-1 rounded">{pii.type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Text area */}
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isLimitReached ? 'Chat limit reached…' : (placeholder || 'Type your message here…')}
                        rows={minimal ? 1 : 4}
                        className={`w-full bg-transparent text-foreground placeholder:text-foreground/50 resize-none focus:outline-none ${minimal ? 'px-4 py-3 text-sm' : 'px-5 py-4 text-base'}`}
                        disabled={isBusy}
                        aria-label="Message input"
                    />

                    {/* Footer */}
                    <div className={`flex items-center justify-between px-3 py-2 border-t-2 border-primary/10 bg-muted/20 ${minimal ? 'rounded-b-lg' : 'rounded-b-xl'}`}>
                        <span className="text-[11px] text-muted-foreground font-mono">
                            {input.length > 0 ? `${input.length} chars` : 'Shift + Enter for new line'}
                        </span>
                        <button
                            type="submit"
                            disabled={!input.trim() || isBusy}
                            className={`flex items-center gap-2 rounded-md bg-primary text-primary-foreground font-bold disabled:opacity-50 hover:bg-primary/90 transition-all shadow-sm active:scale-95 ${minimal ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}`}
                        >
                            <Send className={minimal ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                            {isUploading ? 'Uploading…' : isLoading ? 'Thinking…' : 'Send'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Prompt templates */}
            {!minimal && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 w-full shrink-0 animate-slide-up ${isLimitReached ? 'opacity-50 pointer-events-none' : ''}`} style={{ animationDelay: '0.1s' }}>
                    {PROMPT_TEMPLATES.map(t => (
                        <button
                            key={t.label}
                            type="button"
                            onClick={() => !isLimitReached && setInput(t.prompt)}
                            disabled={!!isLimitReached}
                            className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-left group shadow-sm"
                        >
                            <div className="p-2 bg-background rounded-md border border-border shrink-0">
                                <t.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="pt-0.5">
                                <p className="text-sm font-semibold text-foreground mb-1">{t.label}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{t.prompt}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* SAP Connection Modal */}
            {sapSessionId && (
                <SAPConnectionModal
                    isOpen={isSapModalOpen}
                    onClose={() => setIsSapModalOpen(false)}
                    sessionId={sapSessionId}
                    onConnected={handleSapConnected}
                />
            )}
        </div>
    );
};

export default ChatInput;
