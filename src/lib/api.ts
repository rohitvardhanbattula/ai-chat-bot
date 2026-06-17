const BASE_URL = '';
const getUserId = () => localStorage.getItem('token');

export const authUser = async (action: 'login' | 'register' |'verifyOTP', payload: any) => {
    const res = await fetch(`${BASE_URL}/odata/v4/ai/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Authentication failed");
    return data.value;
};

export const fetchSessions = async () => {
    const userId = getUserId();
    if (!userId) return [];
    const res = await fetch(`${BASE_URL}/odata/v4/ai/ChatSessions?$filter=userId eq '${userId}'&$orderby=createdAt desc`);
    const data = await res.json();
    return data.value || [];
};

export const fetchSessionMessages = async (sessionId: string) => {
    const res = await fetch(`${BASE_URL}/odata/v4/ai/ChatMessages?$filter=session_ID eq '${sessionId}'`);
    const data = await res.json();
    const messages = data.value || [];
    return messages.sort((a: any, b: any) => {
        const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        if (a.role === 'user' && b.role === 'assistant') return -1;
        if (a.role === 'assistant' && b.role === 'user') return 1;
        return 0;
    });
};

export const createSession = async (title: string, selectedModel: string, initialMessages: any[], functionalspec?: string | null) => {
    const res = await fetch(`${BASE_URL}/odata/v4/ai/ChatSessions`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ userId: getUserId(), title, selectedModel, messages: initialMessages, functionalspec }) 
    });
    return res.json();
};

export const deleteSession = async (sessionId: string) => await fetch(`${BASE_URL}/odata/v4/ai/ChatSessions/${sessionId}`, { method: 'DELETE' });

export const renameSession = async (sessionId: string, title: string) => await fetch(`${BASE_URL}/odata/v4/ai/ChatSessions/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });

export const submitRating = async (userId: string, modelId: string, category: string, rating: number) => {
    return fetch(`${BASE_URL}/odata/v4/ai/submitRating`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, modelId, category, rating }) });
};

// UPDATED: Return the full data object instead of just data.text
export const uploadDocument = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/odata/uploadDoc`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data; // Returns { text: string, piiList: Array }
};

export const streamChatMessage = async (
  sessionId: string, modelId: string, prompt: string, category: string, extractedText: string | null,
  onUpdate: (status: 'thinking' | 'chunk' | 'done' | 'error', content?: string) => void
) => {
    try {
        const response = await fetch(`${BASE_URL}/odata/streamChatMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, modelId, prompt, category, extractedText }) });
        if (!response.body) throw new Error("ReadableStream not supported");
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n').filter(Boolean);
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.replace('data: ', ''));
                    if (data.status === 'thinking') onUpdate('thinking');
                    else if (data.status === 'chunk') onUpdate('chunk', data.content);
                    else if (data.status === 'done') onUpdate('done');
                    else if (data.status === 'error') onUpdate('error', data.message);
                }
            }
        }
    } catch (error) { onUpdate('error', 'model is not available at the moment'); }
};

export const streamComparison = async (
  modelId: string, prompt: string, category: string, extractedText: string | null,
  onUpdate: (status: 'thinking' | 'chunk' | 'done' | 'error', content?: string) => void
) => {
    try {
        const response = await fetch(`${BASE_URL}/odata/streamComparison`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId, prompt, category, extractedText }) });
        if (!response.body) throw new Error("ReadableStream not supported");
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n').filter(Boolean);
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.replace('data: ', ''));
                    if (data.status === 'thinking') onUpdate('thinking');
                    else if (data.status === 'chunk') onUpdate('chunk', data.content);
                    else if (data.status === 'done') onUpdate('done');
                    else if (data.status === 'error') onUpdate('error', data.message);
                }
            }
        }
    } catch (error) { onUpdate('error', 'model is not available at the moment'); }
};