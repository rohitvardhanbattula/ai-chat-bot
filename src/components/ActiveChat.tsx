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
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border glass rounded-t-xl mb-2">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-2 h-2 rounded-full bg-accent" />
        <span className={`font-semibold text-sm ${model.colorClass}`}>{model.name}</span>
        <span className="text-xs text-muted-foreground">/ Active Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              }`}
            >
              {msg.role === "assistant" ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
              <p className="text-[10px] opacity-50 mt-1">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" style={{ animationDelay: "0.6s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <ChatInput
          onSubmit={onSendMessage}
          isLoading={isLoading}
          minimal
          placeholder={`Continue chatting with ${model.name}...`}
        />
      </div>
    </div>
  );
};

export default ActiveChat;
