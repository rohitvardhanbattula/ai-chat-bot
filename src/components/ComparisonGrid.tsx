import { useEffect, useRef } from "react";
import { ModelId, ModelResponse } from "@/types/chat";
import ModelCard from "./ModelCard";

const MODEL_ORDER: ModelId[] = ["claude", "gpt4o"];

interface ComparisonGridProps {
  responses: ModelResponse[];
  isLoading: boolean;
  onAccept: (modelId: ModelId) => void;
  prompt: string;
}

const ComparisonGrid = ({ responses, isLoading, onAccept, prompt }: ComparisonGridProps) => {
  const modelsStartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Give the DOM a tiny moment to render the potentially large prompt text,
    // then smoothly scroll down to the models section automatically.
    const timer = setTimeout(() => {
      modelsStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    // Replaced the dual-scrollbar split with a single unified scrollable container
    <div className="w-full max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar pr-2 pb-8">
      
      {/* PROMPT SECTION */}
      {/* Allowed to expand to its full natural height without inner scrollbars */}
      <div className="mb-8 flex flex-col items-center w-full px-2 pt-4">
        <p className="text-xs text-muted-foreground font-mono mb-2 text-center tracking-wider">PROMPT</p>
        <div className="w-full max-w-4xl glass rounded-xl shadow-sm border border-border/50 bg-background/50 p-5 text-sm text-foreground text-left whitespace-pre-wrap leading-relaxed">
          {prompt}
        </div>
      </div>

      {/* INVISIBLE SCROLL ANCHOR - This is what the page jumps to */}
      <div ref={modelsStartRef} className="scroll-mt-4" />

      {/* MODELS SECTION */}
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
  );
};

export default ComparisonGrid;