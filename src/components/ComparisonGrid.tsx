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
       {/* PROMPT SECTION 
        Added max-h-[150px] and overflow-y-auto so a huge prompt 
         gets its own scrollbar and doesn't push the models off-screen.
          */}
           <div className="mb-4 flex flex-col items-center shrink-0 w-full px-2">
            <p className="text-xs text-muted-foreground font-mono mb-1 text-center">PROMPT</p>
             <div className="w-full max-w-3xl glass rounded-lg shadow-sm border border-border/50 bg-background/50 overflow-hidden flex flex-col max-h-[150px]">
              <div className="p-3 overflow-y-auto custom-scrollbar text-sm text-foreground text-left whitespace-pre-wrap">
               {prompt}
                </div>
                 </div>
                  </div>

                   {/* MODELS SECTION 
                    This continues to take up the rest of the space (flex-1) 
                     and has its own independent scrollbar.
                      */}
                       <div className="flex-1 overflow-y-auto pr-2 pb-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
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