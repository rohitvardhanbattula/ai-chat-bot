import { useState, useCallback } from "react";
import { AppState, ChatMessage, ModelId, ModelResponse, MODELS } from "@/types/chat";
import { generateMultiModelResponse, sendChatMessage } from "@/lib/api";
import ChatInput from "@/components/ChatInput";
import ComparisonGrid from "@/components/ComparisonGrid";
import ActiveChat from "@/components/ActiveChat";
import { RotateCcw } from "lucide-react";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("input");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleInitialPrompt = useCallback(async (prompt: string) => {
    setCurrentPrompt(prompt);
    setAppState("comparison");
    setIsLoading(true);
    setResponses([]);

    try {
      const results = await generateMultiModelResponse(prompt);
      setResponses(results);
    } catch (err) {
      console.error("Failed to generate responses:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAccept = useCallback(
    (modelId: ModelId) => {
      const response = responses.find((r) => r.modelId === modelId);
      if (!response) return;

      setSelectedModel(modelId);
      setChatMessages([
        { role: "user", content: currentPrompt, timestamp: new Date() },
        {
          role: "assistant",
          content: response.content,
          modelId,
          timestamp: new Date(),
        },
      ]);
      setAppState("active-chat");
    },
    [responses, currentPrompt]
  );

  const handleChatMessage = useCallback(
    async (prompt: string) => {
      if (!selectedModel) return;

      const userMsg: ChatMessage = {
        role: "user",
        content: prompt,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const reply = await sendChatMessage(
          selectedModel,
          prompt,
          chatMessages.map((m) => ({ role: m.role, content: m.content }))
        );
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply,
            modelId: selectedModel,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        console.error("Chat error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModel, chatMessages]
  );

  const handleReset = () => {
    setAppState("input");
    setResponses([]);
    setCurrentPrompt("");
    setSelectedModel(null);
    setChatMessages([]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary glow-primary" />
          <span className="font-mono text-xs text-muted-foreground tracking-wider uppercase">
            AI Gateway
          </span>
        </div>
        {appState !== "input" && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Session
          </button>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        {appState === "input" && (
          <ChatInput onSubmit={handleInitialPrompt} isLoading={isLoading} />
        )}

        {appState === "comparison" && (
          <ComparisonGrid
            responses={responses}
            isLoading={isLoading}
            onAccept={handleAccept}
            prompt={currentPrompt}
          />
        )}

        {appState === "active-chat" && selectedModel && (
          <ActiveChat
            modelId={selectedModel}
            messages={chatMessages}
            onSendMessage={handleChatMessage}
            onBack={handleReset}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
