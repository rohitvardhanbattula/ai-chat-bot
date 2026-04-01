import { useRef, useEffect, useState } from "react";
import { ArrowLeft, Star, Copy, Check } from "lucide-react";
import { ChatMessage, ModelId, MODELS } from "@/types/chat";
import MarkdownRenderer from "./MarkdownRenderer";
import ChatInput from "./ChatInput";
import RatingPopup from "./RatingPopup";

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
  const [ratingModal, setRatingModal] = useState({ isOpen: false, modelId: '' });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const formatTime = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-card border-x border-border shadow-sm relative">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card mb-2">
        <button onClick={onBack} className="p-1.5 rounded hover:bg-muted transition-colors border border-transparent hover:border-border">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="h-4 w-[1px] bg-border" />
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="font-semibold text-sm text-foreground">{model?.name || "AI Assistant"}</span>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-md px-5 py-4 shadow-sm ${msg.role === "user" ? "bg-primary/10 border border-primary/20 text-foreground" : "bg-muted border border-border text-foreground"}`}>
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
              
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/30">
                  {msg.role === "assistant" ? (
                      <div className="flex items-center gap-4">
                          <button 
                              onClick={() => setRatingModal({ isOpen: true, modelId: modelId })} 
                              className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
                          >
                              <Star className="w-3 h-3" /> Rate Response
                          </button>
                          <button 
                              onClick={() => handleCopy(msg.content, i)} 
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          >
                              {copiedIndex === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedIndex === i ? "Copied!" : "Copy"}
                          </button>
                      </div>
                  ) : (
                      <div /> /* Empty div to keep the timestamp right-aligned for user messages */
                  )}
                  <p className="text-[10px] text-muted-foreground ml-auto">
                    {formatTime(msg.createdAt || msg.timestamp)}
                  </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted border border-border rounded-md px-5 py-4 shadow-sm flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
                Thinking...
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

      <div className="p-4 border-t border-border bg-card">
        <ChatInput onSubmit={onSendMessage} isLoading={isLoading} minimal placeholder={`Message ${model?.name || 'AI Assistant'}...`} />
      </div>

      {ratingModal.isOpen && (
          <RatingPopup 
              isOpen={ratingModal.isOpen} 
              onClose={() => setRatingModal({ isOpen: false, modelId: '' })} 
              modelId={ratingModal.modelId} 
          />
      )}
    </div>
  );
};

export default ActiveChat;