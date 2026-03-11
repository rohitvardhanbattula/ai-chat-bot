import { useState, useCallback, useEffect } from "react";
import { AppState, ChatMessage, ModelId, ModelResponse, ChatSession } from "@/types/chat";
import { fetchSessions, createSession, deleteSession, renameSession, fetchSessionMessages, streamChatMessage, streamComparison } from "@/lib/api";
import ChatInput from "@/components/ChatInput";
import ComparisonGrid from "@/components/ComparisonGrid";
import ActiveChat from "@/components/ActiveChat";
import Header from "@/components/Header";
import { Plus, MessageSquare, Trash2, Edit2, PanelLeftClose, PanelLeftOpen, Check, X } from "lucide-react";
import { useAutoLogout } from "@/hooks/useAutoLogout"; 

const Index = () => {
  useAutoLogout(20);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [appState, setAppState] = useState<AppState>("input");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    try { 
        const fetchedSessions = await fetchSessions();
        setSessions(fetchedSessions.map((s: any) => ({ ...s, messages: s.messages || [] })));
    } catch (error) {}
  };

  const activeSession = sessions.find((s) => s.ID === activeSessionId);

  const handleNewChat = () => {
    setAppState("input"); setActiveSessionId(null); setCurrentPrompt(""); setResponses([]);
  };

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setAppState("active-chat");
    const session = sessions.find((s) => s.ID === sessionId);
    
    if (session && (!session.messages || session.messages.length === 0)) {
      setIsLoading(true);
      try {
        const messages = await fetchSessionMessages(sessionId);
        setSessions((prev) => prev.map((s) => (s.ID === sessionId ? { ...s, messages: messages || [] } : s)));
      } finally { setIsLoading(false); }
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.ID !== sessionId));
      if (activeSessionId === sessionId) handleNewChat();
    } catch (error) {}
  };

  const startRename = (e: React.MouseEvent, session: ChatSession) => { e.stopPropagation(); setEditingSessionId(session.ID); setEditTitle(session.title); };
  const cancelRename = (e: React.MouseEvent) => { e.stopPropagation(); setEditingSessionId(null); setEditTitle(""); };
  const saveRename = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await renameSession(sessionId, editTitle);
      setSessions((prev) => prev.map((s) => (s.ID === sessionId ? { ...s, title: editTitle } : s)));
      setEditingSessionId(null);
    } catch (error) {}
  };

  const handleInitialPrompt = useCallback((prompt: string) => {
    setCurrentPrompt(prompt); 
    setAppState("comparison"); 
    setIsLoading(true);
    setResponses([]);

    const models: ModelId[] = ['gemini', 'gpt4o', 'perplexity', 'claude'];
    let completedCount = 0;

    models.forEach(modelId => {
        streamComparison(modelId, prompt, (status, content) => {
            if (status === 'thinking') {
                setIsLoading(true);
            } else if (status === 'chunk' && content) {
                setResponses(prev => {
                    const exists = prev.find(r => r.modelId === modelId);
                    if (exists) {
                        return prev.map(r => r.modelId === modelId ? { ...r, content: r.content + content } : r);
                    }
                    return [...prev, { modelId, content, latency: 0, error: "" }];
                });
            } else if (status === 'error') {
                setResponses(prev => {
                    const exists = prev.find(r => r.modelId === modelId);
                    if (exists) {
                        return prev.map(r => r.modelId === modelId ? { ...r, content: "model is not available at the moment" } : r);
                    }
                    return [...prev, { modelId, content: "model is not available at the moment", latency: 0, error: "" }];
                });
                completedCount++;
                if (completedCount === models.length) setIsLoading(false);
            } else if (status === 'done') {
                completedCount++;
                if (completedCount === models.length) setIsLoading(false);
            }
        });
    });
  }, []);

  const handleAccept = useCallback(async (modelId: ModelId) => {
    const response = responses.find((r) => r.modelId === modelId);
    if (!response) return;
    const title = currentPrompt.length > 30 ? currentPrompt.substring(0, 30) + "..." : currentPrompt;
    try {
      const newSession = await createSession(title, modelId, [
        { role: "user", content: currentPrompt, modelId, timestamp: undefined },
        { role: "assistant", content: response.content, modelId, timestamp: undefined }
      ]);
      const safeNewSession = { ...newSession, messages: newSession.messages || [] };
      setSessions((prev) => [safeNewSession, ...prev]);
      setActiveSessionId(safeNewSession.ID);
      setAppState("active-chat");
    } catch (error) {}
  }, [responses, currentPrompt]);

  const handleChatMessage = useCallback(async (prompt: string) => {
    if (!activeSessionId || !activeSession?.selectedModel) return;

    const userMsg: ChatMessage = { role: "user", content: prompt, modelId: activeSession.selectedModel, createdAt: new Date().toISOString(), timestamp: undefined };
    setSessions((prev) => prev.map((s) => s.ID === activeSessionId ? { ...s, messages: [...(s.messages || []), userMsg] } : s));
    
    setIsLoading(true);

    await streamChatMessage(activeSessionId, activeSession.selectedModel, prompt, (status, content) => {
        if (status === 'thinking') {
            setIsLoading(true);
        } else if (status === 'chunk' && content) {
            setIsLoading(false);
            
            setSessions((prev) => prev.map((s) => {
                if (s.ID !== activeSessionId) return s;
                
                const msgs = [...(s.messages || [])];
                const lastMsg = msgs[msgs.length - 1];
                
                if (lastMsg && lastMsg.role === 'assistant') {
                    const updatedMsg = { ...lastMsg, content: lastMsg.content + content };
                    return { ...s, messages: [...msgs.slice(0, -1), updatedMsg] };
                } else {
                    const newAssistantMsg: ChatMessage = { role: "assistant", content: content, modelId: activeSession.selectedModel, createdAt: new Date().toISOString(), timestamp: undefined };
                    return { ...s, messages: [...msgs, newAssistantMsg] };
                }
            }));
        } else if (status === 'done') {
            setIsLoading(false);
        } else if (status === 'error') {
            setIsLoading(false);
            const errorMsg: ChatMessage = { role: "assistant", content: "model is not available at the moment", modelId: activeSession.selectedModel, createdAt: new Date().toISOString(), timestamp: undefined };
            setSessions((prev) => prev.map((s) => s.ID === activeSessionId ? { ...s, messages: [...(s.messages || []), errorMsg] } : s));
        }
    });
  }, [activeSessionId, activeSession]);

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className={`bg-card border-r border-border transition-all duration-300 flex flex-col ${sidebarOpen ? "w-64 opacity-100" : "w-0 opacity-0 overflow-hidden"}`}>
          <div className="p-4 shrink-0">
            <button onClick={handleNewChat} className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow-sm">
              <Plus className="w-4 h-4" /> New Workspace
            </button>
          </div>
          <div className="px-3 pb-2 shrink-0"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Recent Sessions</h3></div>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
            {sessions.map((session) => (
              <div key={session.ID} onClick={() => handleSelectSession(session.ID)} className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors group cursor-pointer ${activeSessionId === session.ID ? "bg-muted text-foreground font-medium" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}`}>
                {editingSessionId === session.ID ? (
                  <div className="flex items-center gap-2 w-full">
                    <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Enter" && saveRename(e as any, session.ID)} className="flex-1 bg-background text-foreground border border-border rounded-sm px-2 py-1 text-xs outline-none" />
                    <button onClick={(e) => saveRename(e, session.ID)} className="text-green-500 hover:text-green-400 p-1"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={cancelRename} className="text-destructive hover:text-red-400 p-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 overflow-hidden flex-1"><MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" /><span className="truncate text-left text-xs">{session.title}</span></div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={(e) => startRename(e, session)} className="hover:text-primary p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => handleDeleteSession(e, session.ID)} className="hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border h-14 shrink-0 bg-card z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted">
                {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              </button>
              <div className="h-4 w-[1px] bg-border"></div>
              <span className="text-sm font-medium text-foreground">Multi Model Orchestration Gateway</span>
            </div>
          </header>
          <div className="flex-1 overflow-hidden relative">
            {appState === "input" && (
  <div className="h-full flex flex-col p-4 sm:p-8 overflow-y-auto">
    {/* Using m-auto here prevents the top from getting cut off while still centering it! */}
    <div className="m-auto w-full">
      <ChatInput onSubmit={handleInitialPrompt} isLoading={isLoading} />
    </div>
  </div>
)}{appState === "comparison" && <div className="h-full p-4 sm:p-6 bg-muted/20 overflow-hidden"><ComparisonGrid responses={responses} isLoading={isLoading} onAccept={handleAccept} prompt={currentPrompt} /></div>}
            {appState === "active-chat" && activeSession && (
              <div className="h-full overflow-hidden bg-muted/10 pb-2">
                <ActiveChat modelId={activeSession.selectedModel} messages={(activeSession.messages || []).map(m => ({ ...m, timestamp: m.timestamp || new Date(m.createdAt || Date.now()) }))} onSendMessage={handleChatMessage} onBack={handleNewChat} isLoading={isLoading} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
export default Index;