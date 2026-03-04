import { useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { ChatMessage, ModelId, MODELS } from "@/types/chat";
import MarkdownRenderer from "./MarkdownRenderer";
import ChatInput from "./ChatInput";

interface ActiveChatProps {
  modelId: ModelId;
  messages: ChatMessage[];
  onSendMessage: (prompt: string) => void;
  onBack: () => void;
  isLoading: boolean;
}

const ActiveChat = ({ modelId, messages, onSendMessage, onBack, isLoading }: ActiveChatProps) => {
  const model = MODELS[modelId];
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-card border-x border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card mb-2">
        <button
          onClick={onBack}
          className="p-1.5 rounded hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="h-4 w-[1px] bg-border" />
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="font-semibold text-sm text-foreground">{model?.name || "AI Assistant"}</span>
        <span className="text-xs text-muted-foreground">| Active Session</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-md px-5 py-4 shadow-sm ${
                msg.role === "user"
                  ? "bg-primary/10 border border-primary/20 text-foreground"
                  : "bg-muted border border-border text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {msg.role === "user" ? "You" : model?.name || "Assistant"}
                </span>
              </div>
              {msg.role === "assistant" ? (
                <div className="text-sm prose prose-invert max-w-none">
                  <MarkdownRenderer content={msg.content} />
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-3 text-right">
                {msg.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted border border-border rounded-md px-5 py-4 shadow-sm flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
                {model?.name || "Assistant"}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <ChatInput
          onSubmit={onSendMessage}
          isLoading={isLoading}
          minimal
          placeholder={`Message ${model?.name || 'AI Assistant'}...`}
        />
      </div>
    </div>
  );
};

export default ActiveChat;