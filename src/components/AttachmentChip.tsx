import { X, FileText, FileSpreadsheet, Loader2, AlertTriangle, Info } from 'lucide-react';
import type { UploadResult } from '@/types/chat';
import {
    describeAttachment, formatBytes, isSpreadsheetName, LARGE_ATTACHMENT_CHARS
} from '@/lib/attachments';

interface AttachmentChipProps {
    file: File;
    result: UploadResult | null;
    isUploading: boolean;
    onRemove: () => void;
}

/** The attached file as a small pill: icon, name, size, what was read, and a remove button. */
export const AttachmentChip = ({ file, result, isUploading, onRemove }: AttachmentChipProps) => {
    const Icon    = isSpreadsheetName(file.name) ? FileSpreadsheet : FileText;
    const summary = describeAttachment(result?.meta);

    return (
        <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded text-xs max-w-full">
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[160px]" title={file.name}>{file.name}</span>
            <span className="text-[10px] text-primary/70 shrink-0">
                {isUploading ? 'Reading…' : [formatBytes(file.size), summary].filter(Boolean).join(' · ')}
            </span>
            {isUploading ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" aria-label="Reading file" />
            ) : (
                <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}>
                    <X className="w-3 h-3 hover:text-destructive" />
                </button>
            )}
        </div>
    );
};

/** Heads-up lines about what the model will (not) see — partial reads, hidden sheets, auto-redactions. */
export const AttachmentNotices = ({ result }: { result: UploadResult | null }) => {
    if (!result) return null;
    const { meta } = result;

    const warnings: string[] = [];
    if (meta?.truncated) {
        warnings.push('This file is very large, so only the first part was read (spreadsheets: the first rows of each sheet).');
    } else if (result.text.length > LARGE_ATTACHMENT_CHARS) {
        warnings.push(`Large attachment — some models only read roughly the first ${LARGE_ATTACHMENT_CHARS.toLocaleString()} characters.`);
    }

    const infos: string[] = [];
    if (meta?.hiddenSheets) {
        infos.push(`${meta.hiddenSheets} hidden sheet${meta.hiddenSheets > 1 ? 's were' : ' was'} skipped.`);
    }
    if (result.piiOverflow) {
        infos.push(`${result.piiOverflow.toLocaleString()} more sensitive value${result.piiOverflow > 1 ? 's were' : ' was'} redacted automatically.`);
    }

    if (warnings.length === 0 && infos.length === 0) return null;

    return (
        <div className="flex flex-col gap-1 w-full px-1" role="status">
            {warnings.map(w => (
                <span key={w} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{w}
                </span>
            ))}
            {infos.map(i => (
                <span key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />{i}
                </span>
            ))}
        </div>
    );
};
