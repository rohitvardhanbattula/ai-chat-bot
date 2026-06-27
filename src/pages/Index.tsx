import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, ChatMessage, ModelId, ModelResponse, ChatSession } from '@/types/chat';
import {
    fetchSessions, createSession, deleteSession, renameSession,
    fetchSessionMessages, streamChatMessage, streamComparison,
    authLogout, getStoredUsername
} from '@/lib/api';
import ChatInput      from '@/components/ChatInput';
import ComparisonGrid from '@/components/ComparisonGrid';
import ActiveChat     from '@/components/ActiveChat';
import Header         from '@/components/Header';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { useToast } from '@/components/ui/use-toast';
import { Plus, MessageSquare, Trash2, Edit2, PanelLeftClose, PanelLeftOpen, Check, X, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
    useAutoLogout(20);
    const navigate = useNavigate();
    const { toast } = useToast();

    const [sessions,         setSessions]         = useState<ChatSession[]>([]);
    const [activeSessionId,  setActiveSessionId]  = useState<string | null>(null);
    const [sidebarOpen,      setSidebarOpen]      = useState(true);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitle,        setEditTitle]        = useState('');
    const [appState,         setAppState]         = useState<AppState>('input');
    const [currentPrompt,    setCurrentPrompt]    = useState('');
    const [responses,        setResponses]        = useState<ModelResponse[]>([]);
    const [isLoading,        setIsLoading]        = useState(false);
    const [extractedText,    setExtractedText]    = useState<string | null>(null);
    const pendingStreamsRef = useRef(0);

    useEffect(() => { loadSessions(); }, []);

    const loadSessions = async () => {
        try {
            const fetched = await fetchSessions();
            setSessions(fetched.map((s: any) => ({ ...s, messages: s.messages || [] })));
        } catch (err: any) {
            console.error('[Index] loadSessions:', err);
            toast({
                title: 'Could not load chat sessions',
                description: err?.message || 'Please refresh the page.',
                variant: 'destructive'
            });
        }
    };

    const activeSession = sessions.find(s => s.ID === activeSessionId) ?? null;

    const handleNewChat = useCallback(() => {
        setAppState('input');
        setActiveSessionId(null);
        setCurrentPrompt('');
        setResponses([]);
        setExtractedText(null);
    }, []);

    const handleLogout = useCallback(async () => {
        try { await authLogout(); } catch { /* best effort */ }
        navigate('/login', { replace: true });
    }, [navigate]);

    const handleSelectSession = useCallback(async (sessionId: string) => {
        setActiveSessionId(sessionId);
        setAppState('active-chat');
        setExtractedText(null);
        const session = sessions.find(s => s.ID === sessionId);
        if (session && (!session.messages || session.messages.length === 0)) {
            setIsLoading(true);
            try {
                const messages = await fetchSessionMessages(sessionId);
                setSessions(prev => prev.map(s =>
                    s.ID === sessionId ? { ...s, messages: messages || [] } : s
                ));
            } catch (err: any) {
                console.error('[Index] fetchSessionMessages:', err);
                toast({
                    title: 'Could not load this conversation',
                    description: err?.message || 'Please try selecting it again.',
                    variant: 'destructive'
                });
            } finally {
                setIsLoading(false);
            }
        }
    }, [sessions]);

    const handleDeleteSession = useCallback(async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        try {
            await deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.ID !== sessionId));
            if (activeSessionId === sessionId) handleNewChat();
        } catch (err: any) {
            console.error('[Index] deleteSession:', err);
            toast({
                title: 'Could not delete chat',
                description: err?.message || 'Please try again.',
                variant: 'destructive'
            });
        }
    }, [activeSessionId, handleNewChat]);

    const startRename = useCallback((e: React.MouseEvent, session: ChatSession) => {
        e.stopPropagation();
        setEditingSessionId(session.ID);
        setEditTitle(session.title);
    }, []);

    const cancelRename = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSessionId(null);
        setEditTitle('');
    }, []);

    const saveRename = useCallback(async (e: React.MouseEvent | React.KeyboardEvent, sessionId: string) => {
        e.stopPropagation?.();
        const trimmed = editTitle.trim();
        if (!trimmed) return;
        try {
            await renameSession(sessionId, trimmed);
            setSessions(prev => prev.map(s => s.ID === sessionId ? { ...s, title: trimmed } : s));
            setEditingSessionId(null);
        } catch (err: any) {
            console.error('[Index] renameSession:', err);
            toast({
                title: 'Could not rename chat',
                description: err?.message || 'Please try again.',
                variant: 'destructive'
            });
        }
    }, [editTitle]);

    const handleInitialPrompt = useCallback((
        prompt: string, category: string, incomingText: string | null
    ) => {
        setCurrentPrompt(prompt);
        setExtractedText(incomingText);
        setAppState('comparison');
        setIsLoading(true);
        setResponses([]);

        const models: ModelId[] = ['gpt4o', 'claude'];
        pendingStreamsRef.current = models.length;

        const checkDone = () => {
            pendingStreamsRef.current--;
            if (pendingStreamsRef.current <= 0) setIsLoading(false);
        };

        models.forEach(modelId => {
            streamComparison(modelId, prompt, category, incomingText, (status, content) => {
                if (status === 'chunk' && content) {
                    setIsLoading(false);
                    setResponses(prev => {
                        const exists = prev.find(r => r.modelId === modelId);
                        if (exists) return prev.map(r => r.modelId === modelId ? { ...r, content: r.content + content } : r);
                        return [...prev, { modelId, content, latency: 0, error: '' }];
                    });
                } else if (status === 'error') {
                    const errContent = 'model is not available at the moment';
                    setResponses(prev => {
                        const exists = prev.find(r => r.modelId === modelId);
                        if (exists) return prev.map(r => r.modelId === modelId ? { ...r, content: errContent } : r);
                        return [...prev, { modelId, content: errContent, latency: 0, error: '' }];
                    });
                    checkDone();
                } else if (status === 'done') {
                    checkDone();
                }
            });
        });
    }, []);

    const handleAccept = useCallback(async (modelId: ModelId) => {
        const response = responses.find(r => r.modelId === modelId);
        if (!response) return;
        const title = currentPrompt.length > 50 ? currentPrompt.slice(0, 50) + '…' : currentPrompt;
        try {
            const newSession = await createSession(title, modelId, [
                { role: 'user',      content: currentPrompt,    modelId, timestamp: undefined },
                { role: 'assistant', content: response.content, modelId, timestamp: undefined }
            ], extractedText);
            setSessions(prev => [{ ...newSession, messages: newSession.messages || [] }, ...prev]);
            setActiveSessionId(newSession.ID);
            setAppState('active-chat');
        } catch (err: any) {
            console.error('[Index] createSession:', err);
            toast({
                title: 'Could not start chat',
                description: err?.message || 'Please try again.',
                variant: 'destructive'
            });
        }
    }, [responses, currentPrompt, extractedText]);

    const handleChatMessage = useCallback(async (
        prompt: string, category: string, currentExtractedText: string | null
    ) => {
        if (!activeSessionId || !activeSession?.selectedModel) return;

        const userMsg: ChatMessage = {
            role: 'user', content: prompt,
            modelId: activeSession.selectedModel,
            createdAt: new Date().toISOString(), timestamp: undefined
        };

        setSessions(prev => prev.map(s =>
            s.ID === activeSessionId ? { ...s, messages: [...(s.messages || []), userMsg] } : s
        ));
        setIsLoading(true);

        await streamChatMessage(
            activeSessionId, activeSession.selectedModel,
            prompt, category, currentExtractedText,
            (status, content) => {
                if (status === 'thinking') {
                    setIsLoading(true);
                } else if (status === 'chunk' && content) {
                    setIsLoading(false);
                    setSessions(prev => prev.map(s => {
                        if (s.ID !== activeSessionId) return s;
                        const msgs    = [...(s.messages || [])];
                        const lastMsg = msgs[msgs.length - 1];
                        if (lastMsg?.role === 'assistant') {
                            return { ...s, messages: [...msgs.slice(0, -1), { ...lastMsg, content: lastMsg.content + content }] };
                        }
                        const newMsg: ChatMessage = {
                            role: 'assistant', content,
                            modelId: activeSession.selectedModel,
                            createdAt: new Date().toISOString(), timestamp: undefined
                        };
                        return { ...s, messages: [...msgs, newMsg] };
                    }));
                } else if (status === 'done') {
                    setIsLoading(false);
                } else if (status === 'error') {
                    setIsLoading(false);
                    const errMsg: ChatMessage = {
                        role: 'assistant', content: 'model is not available at the moment',
                        modelId: activeSession.selectedModel,
                        createdAt: new Date().toISOString(), timestamp: undefined
                    };
                    setSessions(prev => prev.map(s =>
                        s.ID === activeSessionId ? { ...s, messages: [...(s.messages || []), errMsg] } : s
                    ));
                }
            }
        );
    }, [activeSessionId, activeSession]);

    return (
        <div className="flex flex-col h-screen w-full bg-background overflow-hidden font-sans">
            <Header />
            <div className="flex flex-1 overflow-hidden">

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <aside className={`bg-card border-r border-border transition-all duration-300 flex flex-col
                    ${sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}
                    aria-label="Chat sessions sidebar"
                >
                    <div className="p-4 shrink-0">
                        <button
                            onClick={handleNewChat}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> New Workspace
                        </button>
                    </div>

                    <div className="px-3 pb-2 shrink-0">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                            Recent Sessions
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
                        {sessions.length === 0 && (
                            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                                No sessions yet. Start a new workspace!
                            </p>
                        )}
                        {sessions.map(session => (
                            <div
                                key={session.ID}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSelectSession(session.ID)}
                                onKeyDown={e => e.key === 'Enter' && handleSelectSession(session.ID)}
                                className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors group cursor-pointer
                                    ${activeSessionId === session.ID
                                        ? 'bg-muted text-foreground font-medium'
                                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}
                            >
                                {editingSessionId === session.ID ? (
                                    <div className="flex items-center gap-1 w-full">
                                        <input
                                            autoFocus
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            onKeyDown={e => {
                                                e.stopPropagation();
                                                if (e.key === 'Enter')  saveRename(e, session.ID);
                                                if (e.key === 'Escape') cancelRename(e as any);
                                            }}
                                            maxLength={100}
                                            className="flex-1 min-w-0 bg-background text-foreground border border-border rounded-sm px-2 py-1 text-xs outline-none"
                                        />
                                        <button onClick={e => saveRename(e, session.ID)} className="text-green-500 hover:text-green-400 p-0.5 shrink-0"><Check className="w-3.5 h-3.5" /></button>
                                        <button onClick={cancelRename} className="text-destructive hover:text-red-400 p-0.5 shrink-0"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                            <span className="truncate text-xs">{session.title}</span>
                                        </div>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                                            <button onClick={e => startRename(e, session)} title="Rename" className="hover:text-primary p-0.5"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={e => handleDeleteSession(e, session.ID)} title="Delete" className="hover:text-destructive p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Logout button at bottom of sidebar */}
                    <div className="p-3 border-t border-border shrink-0">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Sign Out ({getStoredUsername()?.split('@')[0]})
                        </button>
                    </div>
                </aside>

                {/* ── Main content ─────────────────────────────────────────── */}
                <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
                    <header className="flex items-center justify-between px-4 py-3 border-b border-border h-14 shrink-0 bg-card z-10 shadow-sm">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(o => !o)}
                                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                            >
                                {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                            </button>
                            <div className="h-4 w-px bg-border" />
                            <span className="text-sm font-medium text-foreground">Multi Model Orchestration Gateway</span>
                        </div>
                    </header>

                    <div className="flex-1 overflow-hidden relative">
                        {appState === 'input' && (
                            <div className="h-full flex flex-col p-4 sm:p-8 overflow-y-auto">
                                <div className="m-auto w-full">
                                    <ChatInput onSubmit={handleInitialPrompt} isLoading={isLoading} />
                                </div>
                            </div>
                        )}
                        {appState === 'comparison' && (
                            <div className="h-full p-4 sm:p-6 bg-muted/20 overflow-hidden">
                                <ComparisonGrid
                                    responses={responses}
                                    isLoading={isLoading}
                                    onAccept={handleAccept}
                                    prompt={currentPrompt}
                                />
                            </div>
                        )}
                        {appState === 'active-chat' && activeSession && (
                            <div className="h-full overflow-hidden bg-muted/10 pb-2">
                                <ActiveChat
                                    chatId={activeSession.ID}
                                    modelId={activeSession.selectedModel}
                                    messages={(activeSession.messages || []).map(m => ({
                                        ...m,
                                        timestamp: m.timestamp || new Date(m.createdAt || Date.now())
                                    }))}
                                    onSendMessage={handleChatMessage}
                                    onBack={handleNewChat}
                                    isLoading={isLoading}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Index;
