/**
 * API layer — all calls to the CAP backend.
 *
 * Auth flow:
 *   1. login / verifyOTP  → { accessToken, refreshToken, expiresIn }
 *   2. accessToken stored in memory (not localStorage — XSS safe)
 *   3. refreshToken stored in localStorage (survives page reload)
 *   4. On 401, automatically refresh once then retry
 *   5. logout / 401 on refresh → clear everything
 */

const BASE_URL = '';

// ── In-memory access token (never persisted) ──────────────────────────────────
let _accessToken: string | null = null;
let _accessTokenExpiresAt: number = 0;  // epoch ms

export function setAccessToken(token: string, expiresIn: number) {
    _accessToken = token;
    // Subtract 30 s buffer so we refresh before actual expiry
    _accessTokenExpiresAt = Date.now() + (expiresIn - 30) * 1000;
}

export function clearAccessToken() {
    _accessToken = null;
    _accessTokenExpiresAt = 0;
}

export function isAccessTokenValid(): boolean {
    return !!_accessToken && Date.now() < _accessTokenExpiresAt;
}

/**
 * Decode the userId ('sub' claim) out of the current access token.
 * This is a plain base64 decode for display/attribution purposes only —
 * it is NOT a signature check, and must never be trusted for authorization
 * (the backend independently re-verifies the token on every request).
 */
export function getUserId(): string | null {
    if (!_accessToken) return null;
    try {
        const payloadB64 = _accessToken.split('.')[1];
        const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
        return payload.sub || null;
    } catch {
        return null;
    }
}

// ── Refresh token (localStorage) ──────────────────────────────────────────────
const REFRESH_KEY  = 'refreshToken';
const USERNAME_KEY = 'username';

export function getRefreshToken(): string | null      { return localStorage.getItem(REFRESH_KEY); }
export function setRefreshToken(t: string)            { localStorage.setItem(REFRESH_KEY, t); }
export function clearRefreshToken()                   { localStorage.removeItem(REFRESH_KEY); }
export function getStoredUsername(): string | null    { return localStorage.getItem(USERNAME_KEY); }
export function setStoredUsername(u: string)          { localStorage.setItem(USERNAME_KEY, u); }
export function clearStoredUsername()                 { localStorage.removeItem(USERNAME_KEY); }

export function isLoggedIn(): boolean {
    return isAccessTokenValid() || !!getRefreshToken();
}

function clearAllAuth() {
    clearAccessToken();
    clearRefreshToken();
    clearStoredUsername();
}

// ── Token refresh ─────────────────────────────────────────────────────────────
let _refreshPromise: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
    const rt = getRefreshToken();
    if (!rt) throw new Error('No refresh token — please log in again.');

    const res = await fetch(`${BASE_URL}/odata/v4/ai/refreshToken`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: rt })
    });

    if (!res.ok) {
        clearAllAuth();
        window.location.replace('/login');
        throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json();
    const { accessToken, refreshToken, expiresIn } = data.value ?? data;
    setAccessToken(accessToken, expiresIn);
    setRefreshToken(refreshToken);
}

async function ensureValidToken(): Promise<void> {
    if (isAccessTokenValid()) return;
    // Deduplicate concurrent refresh calls
    if (!_refreshPromise) {
        _refreshPromise = doRefresh().finally(() => { _refreshPromise = null; });
    }
    await _refreshPromise;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
function getAuthHeaders(): Record<string, string> {
    return _accessToken ? { 'x-custom-auth': _accessToken } : {};
}

function extractErrorMessage(data: any, fallback: string): string {
    return (
        data?.error?.message ||
        data?.error?.innererror?.message ||
        data?.message ||
        fallback
    );
}

/**
 * Authenticated fetch with automatic token refresh on 401.
 * Pass `skipAuth: true` for public endpoints (login, register, refresh).
 */
async function apiFetch(
    input: string,
    init: RequestInit = {},
    options: { skipAuth?: boolean; isRetry?: boolean } = {}
): Promise<any> {
    if (!options.skipAuth) {
        await ensureValidToken();
        init.headers = { ...init.headers, ...getAuthHeaders() };
    }

    let res: Response;
    try {
        res = await fetch(`${BASE_URL}${input}`, init);
    } catch {
        throw new Error('Network error — please check your connection.');
    }

    // Auto-retry once on 401 (token may have just expired between ensureValid and fetch)
    if (res.status === 401 && !options.skipAuth && !options.isRetry) {
        _accessToken = null; // force refresh
        try {
            await ensureValidToken();
            init.headers = { ...init.headers, ...getAuthHeaders() };
            res = await fetch(`${BASE_URL}${input}`, init);
        } catch {
            clearAllAuth();
            window.location.replace('/login');
            throw new Error('Session expired.');
        }
    }

    if (res.status === 204 || res.headers.get('content-length') === '0') return null;

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = {}; }

    if (!res.ok) throw new Error(extractErrorMessage(data, `Request failed (${res.status})`));
    return data;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────
type AuthPayload = Record<string, string>;

async function callAuthAction(action: string, payload: AuthPayload) {
    const data = await apiFetch(`/odata/v4/ai/${action}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
    }, { skipAuth: true });
    return data?.value ?? data;
}

export const authRegister  = (payload: AuthPayload) => callAuthAction('register', payload);
export const authVerifyOTP = (payload: AuthPayload) => callAuthAction('verifyOTP', payload);
export const authLogin     = (payload: AuthPayload) => callAuthAction('login', payload);

export const authLogout = async () => {
    const rt = getRefreshToken();
    if (rt) {
        try {
            await callAuthAction('logout', { refreshToken: rt });
        } catch { /* best-effort */ }
    }
    clearAllAuth();
};

// ── Sessions ──────────────────────────────────────────────────────────────────
export const fetchSessions = async () => {
    const data = await apiFetch('/odata/v4/ai/getChatSessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    return data?.value || [];
};

export const fetchSessionMessages = async (sessionId: string) => {
    const data = await apiFetch('/odata/v4/ai/getChatMessages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
    });
    const messages = data?.value || [];
    return messages.sort((a: any, b: any) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (diff !== 0) return diff;
        if (a.role === 'user' && b.role === 'assistant') return -1;
        if (a.role === 'assistant' && b.role === 'user') return 1;
        return 0;
    });
};

export const createSession = async (
    title: string, selectedModel: string,
    initialMessages: any[], functionalspec?: string | null
) => {
    const data = await apiFetch('/odata/v4/ai/createSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: title.slice(0, 100),
            selectedModel,
            messages: initialMessages.map(m => ({
                role:    m.role,
                content: m.content,
                modelId: m.modelId || selectedModel
            })),
            functionalspec: functionalspec ?? null
        })
    });
    return data?.value ?? data;
};

export const deleteSession = async (sessionId: string) => {
    await apiFetch('/odata/v4/ai/deleteSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
    });
};

export const renameSession = async (sessionId: string, title: string) => {
    await apiFetch('/odata/v4/ai/renameSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, title: title.slice(0, 100) })
    });
};

// ── Ratings ───────────────────────────────────────────────────────────────────
export const submitRating = async (
    userId: string, modelId: string, category: string, rating: number
) => {
    await apiFetch('/odata/v4/ai/submitRating', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, modelId, category, rating })
    });
};

// ── Document upload ───────────────────────────────────────────────────────────
export const uploadDocument = async (file: File): Promise<{ text: string; piiList: any[] }> => {
    await ensureValidToken();
    const formData = new FormData();
    formData.append('file', file);

    let res: Response;
    try {
        res = await fetch(`${BASE_URL}/odata/uploadDoc`, {
            method:  'POST',
            headers: getAuthHeaders(),
            body:    formData
        });
    } catch {
        throw new Error('Network error during upload.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status}).`);
    return data;
};

// ── SSE streaming ─────────────────────────────────────────────────────────────
type StreamStatus  = 'thinking' | 'chunk' | 'done' | 'error';
type StreamCallback = (status: StreamStatus, content?: string) => void;

async function consumeSSE(
    path: string,
    body: Record<string, unknown>,
    onUpdate: StreamCallback
): Promise<void> {
    await ensureValidToken();

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body:    JSON.stringify(body)
        });
    } catch {
        onUpdate('error', 'Network error — could not reach the server.');
        return;
    }

    if (response.status === 401) {
        onUpdate('error', 'Session expired. Please refresh the page.');
        clearAllAuth();
        return;
    }

    if (!response.body) {
        onUpdate('error', 'Streaming not supported in this browser.');
        return;
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer    = '';

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE events (delimited by \n\n)
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';   // keep incomplete tail in buffer

            for (const event of events) {
                for (const line of event.split('\n')) {
                    if (line.startsWith(': ')) continue;       // heartbeat comment
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if      (data.status === 'thinking') onUpdate('thinking');
                        else if (data.status === 'chunk')    onUpdate('chunk', data.content);
                        else if (data.status === 'done')     onUpdate('done');
                        else if (data.status === 'error')    onUpdate('error', data.message);
                    } catch { /* malformed JSON — skip */ }
                }
            }
        }
    } catch (err: any) {
        onUpdate('error', err.message || 'Stream read error.');
    } finally {
        reader.releaseLock();
    }
}

export const streamChatMessage = (
    sessionId: string, modelId: string, prompt: string,
    category: string, extractedText: string | null,
    onUpdate: StreamCallback
) => consumeSSE('/odata/streamChatMessage', { sessionId, modelId, prompt, category, extractedText }, onUpdate);

export const streamComparison = (
    modelId: string, prompt: string, category: string,
    extractedText: string | null, onUpdate: StreamCallback,
    connectionId?: string | null
) => consumeSSE('/odata/streamComparison', { modelId, prompt, category, extractedText, connectionId }, onUpdate);

// ── SAP connection ────────────────────────────────────────────────────────────

/** Active destination names for the "Connect to SAP System" dropdown. */
export const fetchDestinations = async (): Promise<Array<{ ID: string; name: string; description?: string }>> => {
    const data = await apiFetch('/odata/v4/ai/getDestinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    return data?.value || [];
};

/** Initial connect. sessionId may be a real DB UUID or a client-generated tempId. */
export const establishConnection = async (sessionId: string, credentials: {
    destinationName: string; user: string; password: string; client: string; language: string;
}) => {
    const data = await apiFetch('/odata/v4/ai/establishConnection', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, ...credentials })
    });
    return data?.value ?? data;
};

/**
 * Move the bridge connection from a temporary pre-session ID to the real DB
 * session UUID. Call immediately after createSession() succeeds.
 */
export const remapConnection = async (tempId: string, newSessionId: string): Promise<string> => {
    const data = await apiFetch('/odata/v4/ai/remapConnection', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tempId, newSessionId })
    });
    return data?.value ?? data ?? '';
};

/**
 * Ping the SAP connection health for a session.
 * Returns { connected: boolean, message: string }.
 */
export const checkConnection = async (sessionId: string): Promise<{ connected: boolean; message: string }> => {
    const data = await apiFetch('/odata/v4/ai/checkConnection', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId })
    });
    return data?.value ?? data ?? { connected: false, message: 'Unknown error' };
};