import { describe, it, expect } from 'vitest';
import {
    validateAttachment, describeAttachment, redactPii, formatBytes, MAX_FILE_SIZE
} from '@/lib/attachments';
import type { PiiItem, UploadMeta } from '@/types/chat';

const fileOf = (name: string, size = 100) => {
    const f = new File(['x'], name);
    Object.defineProperty(f, 'size', { value: size });
    return f;
};

describe('validateAttachment', () => {
    it.each(['spec.pdf', 'spec.docx', 'data.xlsx', 'data.csv', 'DATA.XLSX'])('accepts %s', name => {
        expect(validateAttachment(fileOf(name))).toBeNull();
    });

    it('explains how to convert legacy .xls files', () => {
        expect(validateAttachment(fileOf('old.xls'))).toMatch(/Save As.*\.xlsx/);
    });

    it('rejects unsupported types, empty files and oversized files', () => {
        expect(validateAttachment(fileOf('run.exe'))).toMatch(/Unsupported file type/);
        expect(validateAttachment(fileOf('a.xlsx', 0))).toMatch(/empty/);
        expect(validateAttachment(fileOf('a.xlsx', MAX_FILE_SIZE + 1))).toMatch(/limit/);
    });
});

describe('describeAttachment', () => {
    it('summarises multi-sheet workbooks, single sheets, CSVs and PDFs', () => {
        const sheets = (n: number): UploadMeta['sheets'] =>
            Array.from({ length: n }, (_, i) => ({ name: `S${i}`, rows: 600, columns: 3, truncated: false }));
        expect(describeAttachment({ kind: 'xlsx', chars: 1, truncated: false, sheets: sheets(2) })).toBe('2 sheets · 1,200 rows');
        expect(describeAttachment({ kind: 'xlsx', chars: 1, truncated: false, sheets: sheets(1) })).toBe('600 rows');
        expect(describeAttachment({ kind: 'csv', chars: 1, truncated: false, sheets: sheets(1) })).toBe('600 rows');
        expect(describeAttachment({ kind: 'pdf', chars: 1, truncated: false, pages: 1 })).toBe('1 page');
        expect(describeAttachment(undefined)).toBe('');
    });
});

describe('redactPii', () => {
    const items: PiiItem[] = [
        { type: 'Email', value: 'a@b.com', keep: false },
        { type: 'Phone', value: '(415) 555-2671', keep: false },
        { type: 'Email', value: 'keep@b.com', keep: true }
    ];

    it('redacts unchecked values (including regex metacharacters) and keeps allowed ones', () => {
        const out = redactPii('mail a@b.com or keep@b.com, call (415) 555-2671.', items);
        expect(out).toBe('mail [REDACTED_EMAIL] or keep@b.com, call [REDACTED_PHONE].');
    });

    it('prefers the longest match and is a single pass', () => {
        const out = redactPii('x@y.com.au', [
            { type: 'Email', value: 'x@y.com', keep: false },
            { type: 'Email', value: 'x@y.com.au', keep: false }
        ]);
        expect(out).toBe('[REDACTED_EMAIL]');
    });

    it('handles hundreds of findings quickly', () => {
        const many: PiiItem[] = Array.from({ length: 300 }, (_, i) => ({ type: 'Email', value: `u${i}@corp.com`, keep: false }));
        const text = many.map(m => m.value).join('\n').repeat(50);
        const t0 = performance.now();
        const out = redactPii(text, many);
        expect(performance.now() - t0).toBeLessThan(500);
        expect(out).not.toMatch(/@corp\.com/);
    });

    it('returns the text untouched when everything is allowed', () => {
        expect(redactPii('a@b.com', [{ type: 'Email', value: 'a@b.com', keep: true }])).toBe('a@b.com');
    });
});

describe('formatBytes', () => {
    it('formats sizes', () => {
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(2048)).toBe('2 KB');
        expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    });
});
