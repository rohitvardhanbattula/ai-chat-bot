import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAccessToken, streamChatMessage, uploadDocument, clearAccessToken } from '@/lib/api';

const sse = (...events: object[]) =>
    new Response(new ReadableStream({
        start(c) { events.forEach(e => c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(e)}\n\n`))); c.close(); }
    }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });

const run = async () => {
    const calls: Array<[string, string | undefined]> = [];
    await streamChatMessage('s1', 'claude', 'hi', 'general', null, (status, content) => calls.push([status, content]));
    return calls;
};

describe('streamChatMessage', () => {
    beforeEach(() => { setAccessToken('tok', 900); });
    afterEach(() => { vi.restoreAllMocks(); clearAccessToken(); });

    it('delivers chunks then done', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse({ status: 'thinking' }, { status: 'chunk', content: 'a' }, { status: 'done' }));
        expect(await run()).toEqual([['thinking', undefined], ['chunk', 'a'], ['done', undefined]]);
    });

    it('turns an HTTP error (e.g. rate limit) into an error event instead of hanging', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), { status: 429 }));
        expect(await run()).toEqual([['error', 'Too many requests. Please slow down.']]);
    });

    it('reports an error when the stream ends without done/error', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(sse({ status: 'thinking' }, { status: 'chunk', content: 'partial' }));
        const calls = await run();
        expect(calls.at(-1)?.[0]).toBe('error');
        expect(calls.filter(c => c[0] === 'error' || c[0] === 'done')).toHaveLength(1);
    });

    it('reports a network failure', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        expect((await run())[0][0]).toBe('error');
    });

    it('retries once with a refreshed token after a 401', async () => {
        localStorage.setItem('refreshToken', 'rt');
        const fetchMock = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(new Response('{}', { status: 401 }))                                    // stream → 401
            .mockResolvedValueOnce(new Response(JSON.stringify({ value: { accessToken: 'new', refreshToken: 'rt2', expiresIn: 900 } }), { status: 200 })) // refresh
            .mockResolvedValueOnce(sse({ status: 'done' }));                                                // stream retry
        expect(await run()).toEqual([['done', undefined]]);
        expect(fetchMock).toHaveBeenCalledTimes(3);
        localStorage.clear();
    });
});

describe('uploadDocument', () => {
    beforeEach(() => { setAccessToken('tok', 900); });
    afterEach(() => { vi.restoreAllMocks(); clearAccessToken(); });

    it('returns the extraction result including spreadsheet metadata', async () => {
        const body = { text: 't', piiList: [], meta: { kind: 'xlsx', chars: 1, truncated: false } };
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
        const res = await uploadDocument(new File(['x'], 'a.xlsx'));
        expect(res.meta?.kind).toBe('xlsx');
    });

    it('surfaces the server error message', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'No data found in this spreadsheet.' }), { status: 422 }));
        await expect(uploadDocument(new File(['x'], 'a.xlsx'))).rejects.toThrow('No data found in this spreadsheet.');
    });

    it('maps a dropped connection to a friendly error', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        await expect(uploadDocument(new File(['x'], 'a.xlsx'))).rejects.toThrow('Network error during upload.');
    });
});
