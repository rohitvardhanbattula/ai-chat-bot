/**
 * Attachment rules shared by the chat input — what can be attached, how it is
 * validated before upload, and how the user's PII choices are applied.
 *
 * Keep MAX_FILE_SIZE and the extension list in sync with the backend
 * (srv/lib/utils/constants.js and srv/lib/files/file-types.js). The backend
 * re-validates everything; these checks only give faster, friendlier feedback.
 */
import type { PiiItem, UploadMeta } from '@/types/chat';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.csv'] as const;
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');
export const ACCEPTED_LABEL = 'PDF, DOCX, XLSX or CSV';

/** Some models only read roughly this many characters of an attachment (GPT: ~10k tokens). */
export const LARGE_ATTACHMENT_CHARS = 40_000;

/** Prompt length the backend accepts. */
export const MAX_PROMPT_CHARS = 50_000;

export const isSpreadsheetName = (name: string): boolean => /\.(xlsx|csv)$/i.test(name);

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an error message, or null when the file may be uploaded. */
export function validateAttachment(file: File): string | null {
    const lower = file.name.toLowerCase();

    if (lower.endsWith('.xls')) {
        return 'Legacy .xls files are not supported. Open it in Excel, choose Save As → .xlsx, and attach that file.';
    }
    if (!ACCEPTED_EXTENSIONS.some(ext => lower.endsWith(ext))) {
        return `Unsupported file type. Please attach a ${ACCEPTED_LABEL} file.`;
    }
    if (file.size === 0) return 'This file is empty.';
    if (file.size > MAX_FILE_SIZE) {
        return `File is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_FILE_SIZE)}. Please attach a smaller file.`;
    }
    return null;
}

/** One-line summary for the attachment chip, e.g. "2 sheets · 1,204 rows". */
export function describeAttachment(meta?: UploadMeta): string {
    if (!meta) return '';
    if (meta.kind === 'xlsx' || meta.kind === 'csv') {
        const sheets = meta.sheets ?? [];
        const rows   = sheets.reduce((n, s) => n + s.rows, 0);
        const rowText = `${rows.toLocaleString()} ${rows === 1 ? 'row' : 'rows'}`;
        return meta.kind === 'csv' || sheets.length <= 1
            ? rowText
            : `${sheets.length} sheets · ${rowText}`;
    }
    if (meta.kind === 'pdf' && meta.pages) return `${meta.pages} ${meta.pages === 1 ? 'page' : 'pages'}`;
    return '';
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replace every PII value the user did NOT choose to keep with [REDACTED_<TYPE>].
 * Single pass over the text (longest values first), so it stays fast even when a
 * spreadsheet yields hundreds of findings.
 */
export function redactPii(text: string, items: PiiItem[]): string {
    const typeByValue = new Map<string, string>();
    for (const item of items) {
        if (!item.keep && item.value) typeByValue.set(item.value, item.type);
    }
    if (typeByValue.size === 0) return text;

    const pattern = [...typeByValue.keys()]
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|');
    return text.replace(new RegExp(pattern, 'g'), m => `[REDACTED_${(typeByValue.get(m) ?? 'PII').toUpperCase()}]`);
}
