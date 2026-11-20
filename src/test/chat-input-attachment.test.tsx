import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInput from '@/components/ChatInput';
import * as api from '@/lib/api';

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, uploadDocument: vi.fn() };
});

const xlsxResult = {
    text: 'Spreadsheet: orders.xlsx\n\n| email | po |\n| --- | --- |\n| jane@acme.com | 4500012345 |',
    piiList: [{ type: 'Email', value: 'jane@acme.com' }],
    piiOverflow: 12,
    meta: { kind: 'xlsx', chars: 90, truncated: false, hiddenSheets: 1, sheets: [{ name: 'Orders', rows: 1, columns: 2, truncated: false }] }
};

const attach = (container: HTMLElement, file: File) => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
};
const xlsx = (name = 'orders.xlsx') => new File(['PK'], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

describe('ChatInput attachments', () => {
    beforeEach(() => { vi.mocked(api.uploadDocument).mockReset(); });

    it('accepts Excel/CSV in the file picker', () => {
        const { container } = render(<ChatInput onSubmit={vi.fn()} />);
        const accept = (container.querySelector('input[type="file"]') as HTMLInputElement).accept;
        expect(accept).toContain('.xlsx');
        expect(accept).toContain('.csv');
    });

    it('attaches an Excel file, shows what was read, and sends redacted text', async () => {
        vi.mocked(api.uploadDocument).mockResolvedValue(xlsxResult as never);
        const onSubmit = vi.fn();
        const { container } = render(<ChatInput onSubmit={onSubmit} />);

        attach(container, xlsx());

        expect(await screen.findByText(/1 row/)).toBeInTheDocument();           // chip summary
        expect(screen.getByText(/1 hidden sheet was skipped/)).toBeInTheDocument();
        expect(screen.getByText(/12 more sensitive values were redacted automatically/)).toBeInTheDocument();
        expect(screen.getByText('jane@acme.com')).toBeInTheDocument();           // PII review panel

        fireEvent.change(screen.getByLabelText('Message input'), { target: { value: 'summarise the orders' } });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
        const [prompt, , text] = onSubmit.mock.calls[0];
        expect(prompt).toBe('summarise the orders');
        expect(text).toContain('[REDACTED_EMAIL]');          // unchecked PII is redacted by default
        expect(text).not.toContain('jane@acme.com');
        expect(text).toContain('4500012345');                // business data is untouched
    });

    it('lets the user keep a sensitive value', async () => {
        vi.mocked(api.uploadDocument).mockResolvedValue(xlsxResult as never);
        const onSubmit = vi.fn();
        const { container } = render(<ChatInput onSubmit={onSubmit} />);
        attach(container, xlsx());
        await screen.findByText('jane@acme.com');

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.change(screen.getByLabelText('Message input'), { target: { value: 'go' } });
        fireEvent.click(screen.getByRole('button', { name: /send/i }));

        expect(onSubmit.mock.calls[0][2]).toContain('jane@acme.com');
    });

    it('is available in the active-chat (minimal) input too', () => {
        const { container } = render(<ChatInput onSubmit={vi.fn()} minimal />);
        expect(container.querySelector('input[type="file"]')).not.toBeNull();
    });

    it('blocks legacy .xls and unsupported types without calling the server', async () => {
        const { container } = render(<ChatInput onSubmit={vi.fn()} />);
        attach(container, new File(['x'], 'old.xls'));
        expect(await screen.findByText(/Legacy \.xls files are not supported/)).toBeInTheDocument();
        expect(api.uploadDocument).not.toHaveBeenCalled();
    });

    it('shows the server message when extraction fails and clears the file', async () => {
        vi.mocked(api.uploadDocument).mockRejectedValue(new Error('No data found in this spreadsheet.'));
        const { container } = render(<ChatInput onSubmit={vi.fn()} />);
        attach(container, xlsx('empty.xlsx'));
        expect(await screen.findByText('No data found in this spreadsheet.')).toBeInTheDocument();
        expect(screen.queryByText('empty.xlsx')).not.toBeInTheDocument();
    });

    it('ignores a slow upload that finished after the file was removed', async () => {
        let resolveUpload!: (v: unknown) => void;
        vi.mocked(api.uploadDocument).mockReturnValue(new Promise(r => { resolveUpload = r; }) as never);
        const onSubmit = vi.fn();
        const { container } = render(<ChatInput onSubmit={onSubmit} />);

        attach(container, xlsx());
        expect(await screen.findByText('Reading…', { selector: 'span' })).toBeInTheDocument();
        // Replace with a second file while the first is still uploading.
        vi.mocked(api.uploadDocument).mockResolvedValue({ ...xlsxResult, text: 'SECOND', piiList: [] } as never);
        attach(container, xlsx('second.xlsx'));
        resolveUpload({ ...xlsxResult, text: 'FIRST', piiList: [] });

        await waitFor(() => expect(screen.getByText('second.xlsx')).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText('Message input'), { target: { value: 'go' } });
        await waitFor(() => expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled());
        fireEvent.click(screen.getByRole('button', { name: /send/i }));
        expect(onSubmit.mock.calls[0][2]).toBe('SECOND');
    });
});
