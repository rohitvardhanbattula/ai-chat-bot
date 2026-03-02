import { useState, useCallback, useEffect } from "react";
import { AppState, ChatMessage, ModelId, ModelResponse, ChatSession } from "@/types/chat";
import { generateMultiModelResponse, sendChatMessage, fetchSessions, createSession, deleteSession, renameSession, fetchSessionMessages } from "@/lib/api";
import ChatInput from "@/components/ChatInput";
import ComparisonGrid from "@/components/ComparisonGrid";
import ActiveChat from "@/components/ActiveChat";
import { Plus, MessageSquare, Trash2, Edit2, PanelLeftClose, PanelLeftOpen, Check, X } from "lucide-react";

const Index = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [appState, setAppState] = useState<AppState>("input");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (error) {}
  };

  const activeSession = sessions.find((s) => s.ID === activeSessionId);

  const handleNewChat = () => {
    setAppState("input");
    setActiveSessionId(null);
    setCurrentPrompt("");
    setResponses([]);
  };

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setAppState("active-chat");

    const session = sessions.find((s) => s.ID === sessionId);
    
    if (session && session.messages.length === 0) {
      setIsLoading(true);
      try {
        const messages = await fetchSessionMessages(sessionId);
        setSessions((prev) => 
          prev.map((s) => (s.ID === sessionId ? { ...s, messages } : s))
        );
      } catch (error) {
        console.error("Failed to fetch messages for session:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.ID !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch (error) {}
  };

  const startRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.ID);
    setEditTitle(session.title);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
    setEditTitle("");
  };

  const saveRename = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      await renameSession(sessionId, editTitle);
      setSessions((prev) => prev.map((s) => (s.ID === sessionId ? { ...s, title: editTitle } : s)));
      setEditingSessionId(null);
    } catch (error) {}
  };

  const handleInitialPrompt = useCallback(async (prompt: string) => {
    setCurrentPrompt(prompt);
    setAppState("comparison");
    setIsLoading(true);
    setResponses([]);

    try {
      const results = await generateMultiModelResponse(prompt);
      setResponses(results);
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAccept = useCallback(async (modelId: ModelId) => {
    const response = responses.find((r) => r.modelId === modelId);
    if (!response) return;

    const title = currentPrompt.length > 30 ? currentPrompt.substring(0, 30) + "..." : currentPrompt;

    try {
      const newSession = await createSession(title, modelId, [
        { role: "user", content: currentPrompt, modelId: modelId },
        { role: "assistant", content: response.content, modelId: modelId }
      ]);
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.ID);
      setAppState("active-chat");
    } catch (error) {}
  }, [responses, currentPrompt]);

  const handleChatMessage = useCallback(async (prompt: string) => {
    if (!activeSessionId || !activeSession?.selectedModel) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: prompt,
      modelId: activeSession.selectedModel,
      createdAt: new Date().toISOString()
    };

    setSessions((prev) => prev.map((s) => s.ID === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s));
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(activeSessionId, activeSession.selectedModel, prompt);
      
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: reply,
        modelId: activeSession.selectedModel,
        createdAt: new Date().toISOString()
      };

      setSessions((prev) => prev.map((s) => s.ID === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, activeSession]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className={`bg-card border-r border-border transition-all duration-300 flex flex-col ${sidebarOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden"}`}>
        <div className="p-4 border-b border-border">
          <button onClick={handleNewChat} className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">No chat history</p>}
          {sessions.map((session) => (
            <div key={session.ID} onClick={() => handleSelectSession(session.ID)} className={`flex items-center justify-between w-full px-3 py-3 text-sm rounded-md transition-colors group cursor-pointer ${activeSessionId === session.ID ? "bg-secondary text-foreground" : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"}`}>
              {editingSessionId === session.ID ? (
                <div className="flex items-center gap-2 w-full">
                  <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Enter" && saveRename(e as any, session.ID)} className="flex-1 bg-background text-foreground border border-border rounded px-2 py-1 text-xs outline-none" />
                  <button onClick={(e) => saveRename(e, session.ID)} className="text-green-500 hover:text-green-400 p-1"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={cancelRename} className="text-destructive hover:text-red-400 p-1"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="truncate text-left">{session.title}</span>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={(e) => startRename(e, session)} className="hover:text-primary p-1.5"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => handleDeleteSession(e, session.ID)} className="hover:text-destructive p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center px-4 py-3 border-b border-border h-14 shrink-0 gap-4 bg-background z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <span className="font-mono text-xs text-muted-foreground tracking-wider uppercase font-semibold">AI Gateway</span>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          {appState === "input" && (
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
              <ChatInput onSubmit={handleInitialPrompt} isLoading={isLoading} />
            </div>
          )}

          {appState === "comparison" && (
            <div className="flex-1 p-6 overflow-y-auto">
              <ComparisonGrid responses={responses} isLoading={isLoading} onAccept={handleAccept} prompt={currentPrompt} />
            </div>
          )}

          {appState === "active-chat" && activeSession && (
            <div className="flex-1 overflow-hidden pb-4">
              <ActiveChat modelId={activeSession.selectedModel} messages={activeSession.messages.map(m => ({ ...m, timestamp: new Date(m.createdAt || Date.now()) }))} onSendMessage={handleChatMessage} onBack={handleNewChat} isLoading={isLoading} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;