import { useState } from "react";
import { Send, Zap, Code2, Database, Workflow } from "lucide-react";

interface ChatInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  minimal?: boolean;
  placeholder?: string;
}

const PROMPT_TEMPLATES = [
  { icon: Code2, label: "Optimize ABAP code", prompt: "Optimize this ABAP SELECT statement for better performance with large datasets" },
  { icon: Database, label: "CAP Service Handler", prompt: "Create a CAPM service handler with CRUD operations and custom actions" },
  { icon: Workflow, label: "BTP Integration", prompt: "Build a Node.js integration between SAP BTP and Azure services" },
  { icon: Zap, label: "Fiori Elements", prompt: "Generate a List Report Fiori Elements app with custom annotations" },
];

const ChatInput = ({ onSubmit, isLoading, minimal, placeholder }: ChatInputProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim());
    setInput("");
  };

  const handleTemplate = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className={minimal ? "" : "flex flex-col items-center gap-8 w-full max-w-3xl mx-auto"}>
      {!minimal && (
        <div className="text-center animate-slide-up">
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Multi-Model Code Generation
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Send your prompt to Gemini, Claude, GPT-4o. Compare responses and choose the best one.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`w-full ${minimal ? "" : "animate-slide-up"}`}>
        <div className="relative glass rounded-xl p-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={placeholder || "Describe what you need — ABAP, Node.js, CAP, Fiori..."}
            rows={minimal ? 1 : 3}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none px-4 py-3 text-sm"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-xs text-muted-foreground font-mono">
              {input.length > 0 ? `${input.length} chars` : "Shift+Enter for new line"}
            </span>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-30 hover:opacity-90 transition-all glow-primary disabled:shadow-none"
            >
              <Send className="w-4 h-4" />
              {isLoading ? "Generating..." : minimal ? "Send" : "Send to 3 Models"}
            </button>
          </div>
        </div>
      </form>

      {!minimal && (
        <div className="grid grid-cols-2 gap-3 w-full animate-slide-up" style={{ animationDelay: "0.1s" }}>
          {PROMPT_TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => handleTemplate(t.prompt)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-surface-hover transition-colors text-left group"
            >
              <t.icon className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{t.prompt}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatInput;
