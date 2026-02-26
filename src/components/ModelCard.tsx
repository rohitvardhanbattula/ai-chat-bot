import { Check, Clock, Copy, MessageSquare } from "lucide-react";
import { ModelId, ModelResponse, MODELS } from "@/types/chat";
import MarkdownRenderer from "./MarkdownRenderer";
import { useState } from "react";

interface ModelCardProps {
  response?: ModelResponse;
  isLoading: boolean;
  onAccept: (modelId: ModelId) => void;
  modelId: ModelId;
}

const ModelCard = ({ response, isLoading, onAccept, modelId }: ModelCardProps) => {
  const model = MODELS[modelId];
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex flex-col rounded-xl border-t-2 border border-border bg-card overflow-hidden transition-all ${model.borderClass} ${
        isLoading ? "animate-pulse" : "animate-slide-up"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-muted-foreground animate-pulse-glow" : "bg-accent"}`} />
          <span className={`font-semibold text-sm ${model.colorClass}`}>{model.name}</span>
          <span className="text-xs text-muted-foreground">/ {model.provider}</span>
        </div>
        {response && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {(response.latency / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-4 py-3 max-h-[400px] scrollbar-thin">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-secondary rounded w-3/4" />
            <div className="h-4 bg-secondary rounded w-1/2" />
            <div className="h-24 bg-secondary rounded" />
            <div className="h-4 bg-secondary rounded w-2/3" />
          </div>
        ) : response?.error ? (
          <p className="text-destructive text-sm">{response.error}</p>
        ) : response ? (
          <MarkdownRenderer content={response.content} />
        ) : null}
      </div>

      {/* Footer */}
      {!isLoading && response && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-surface-hover transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy All"}
          </button>
          <button
            onClick={() => onAccept(modelId)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors ml-auto glow-primary"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Accept & Continue
          </button>
        </div>
      )}
    </div>
  );
};

export default ModelCard;
