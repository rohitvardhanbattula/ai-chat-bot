import { useState } from "react";
import { Send, Zap, Code2, Database, Workflow, AlertCircle } from "lucide-react";

interface ChatInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  minimal?: boolean;
  placeholder?: string;
  isLimitReached?: boolean;
}

const PROMPT_TEMPLATES = [
  { icon: Code2, label: "Optimize ABAP code", prompt: "Optimize this ABAP SELECT statement for better performance with large datasets" },
  { icon: Database, label: "CAP Service Handler", prompt: "Create a CAPM service handler with CRUD operations and custom actions" },
  { icon: Workflow, label: "BTP Integration", prompt: "Build a Node.js integration between SAP BTP and Azure services" },
  { icon: Zap, label: "Fiori Elements", prompt: "Generate a List Report Fiori Elements app with custom annotations" },
];

const ChatInput = ({ onSubmit, isLoading, minimal, placeholder, isLimitReached }: ChatInputProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isLimitReached) return;
    onSubmit(input.trim());
    setInput("");
  };

  const handleTemplate = (prompt: string) => {
    if (isLimitReached) return;
    setInput(prompt);
  };

  return (
    // Reverted to standard "w-full" for minimal so it spans the entire chat area naturally
    <div className={minimal ? "w-full" : "flex flex-col items-center gap-5 sm:gap-6 w-full max-w-3xl mx-auto py-4"}>
      {!minimal && (
        <div className="text-center animate-slide-up w-full flex flex-col items-center shrink-0">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Code Generation
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Input your requirements. Our gateway evaluates responses across optimal LLMs to ensure code quality and accuracy.
          </p>
        </div>
      )}

      {isLimitReached && (
        <div className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md animate-in fade-in slide-in-from-bottom-2 shrink-0">
          <AlertCircle className="w-4 h-4" />
          Maximum prompt limit (20) reached. Please start a new chat to continue.
        </div>
      )}

      <form onSubmit={handleSubmit} className={`w-full shrink-0 ${minimal ? "" : "animate-slide-up"}`}>
        <div 
          className={`relative flex flex-col transition-all duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/25 
            ${minimal 
              ? "bg-card border-2 border-primary/60 rounded-lg shadow-lg shadow-primary/5 hover:border-primary/80" 
              : "bg-accent/10 border-2 border-primary/40 rounded-xl shadow-md"
            } 
            ${isLimitReached ? "opacity-50 pointer-events-none grayscale" : ""}`}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={isLimitReached ? "Chat limit reached..." : (placeholder || "Type your message here...")}
            rows={minimal ? 1 : 4} // Reverted to original 1 row so it doesn't take up too much vertical space initially
            className={`w-full bg-transparent text-foreground placeholder:text-foreground/50 resize-none focus:outline-none ${minimal ? "px-4 py-3 text-sm" : "px-5 py-4 text-base"}`}
            disabled={isLoading || isLimitReached}
          />
          
          <div className={`flex items-center justify-between px-3 py-2 border-t-2 border-primary/10 bg-muted/20 ${minimal ? "rounded-b-lg" : "rounded-b-xl"}`}>
            <span className="text-[11px] text-muted-foreground font-mono">
              {input.length > 0 ? `${input.length} characters` : "Shift + Enter for new line"}
            </span>
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isLimitReached}
              className={`flex items-center gap-2 rounded-md bg-primary text-primary-foreground font-bold disabled:opacity-50 hover:bg-primary/90 transition-all shadow-sm active:scale-95 ${minimal ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
            >
              <Send className={`${minimal ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      </form>

      {!minimal && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 w-full shrink-0 animate-slide-up ${isLimitReached ? "opacity-50 pointer-events-none" : ""}`} style={{ animationDelay: "0.1s" }}>
          {PROMPT_TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => handleTemplate(t.prompt)}
              disabled={isLimitReached}
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-left group shadow-sm"
            >
              <div className="p-2 bg-background rounded-md border border-border shrink-0">
                <t.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-foreground mb-1">{t.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{t.prompt}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatInput;