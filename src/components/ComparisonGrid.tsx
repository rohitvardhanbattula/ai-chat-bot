import { ModelId, ModelResponse } from "@/types/chat";
import ModelCard from "./ModelCard";

const MODEL_ORDER: ModelId[] = ["gemini", "claude", "gpt4o", "perplexity"];

interface ComparisonGridProps {
  responses: ModelResponse[];
  isLoading: boolean;
  onAccept: (modelId: ModelId) => void;
  prompt: string;
}

const ComparisonGrid = ({ responses, isLoading, onAccept, prompt }: ComparisonGridProps) => {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
      <div className="mb-4 text-center shrink-0">
        <p className="text-xs text-muted-foreground font-mono mb-1">PROMPT</p>
        <p className="text-sm text-foreground max-w-2xl mx-auto line-clamp-3 glass px-4 py-2 rounded-lg inline-block shadow-sm">
          {prompt}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 pb-8 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODEL_ORDER.map((modelId) => {
            const response = responses.find((r) => r.modelId === modelId);
            return (
              <ModelCard
                key={modelId}
                modelId={modelId}
                response={response}
                isLoading={isLoading && !response}
                onAccept={onAccept}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ComparisonGrid;