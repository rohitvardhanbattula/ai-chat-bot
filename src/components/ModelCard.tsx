import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MarkdownRenderer from "./MarkdownRenderer";
// Assuming MODELS is exported from your chat types based on your ActiveChat component
import { MODELS } from "@/types/chat"; 

const ModelCard = ({ modelId, response, isLoading, onAccept }: any) => {
    // Check if the current card is Claude to disable it
    const isClaude = modelId.toLowerCase() === 'claude';
    
    // Fallback name if MODELS isn't perfectly mapped
    const modelName = MODELS && MODELS[modelId] ? MODELS[modelId].name : modelId.toUpperCase();

    return (
        <Card className={`flex flex-col h-[400px] ${isClaude ? 'opacity-50 pointer-events-none grayscale' : 'hover:border-primary/50 transition-colors'}`}>
            <CardHeader className="pb-2 shrink-0 border-b">
                <CardTitle className="flex justify-between items-center text-lg">
                    <div className="flex items-center gap-2">
                        {modelName}
                    </div>
                    {isClaude ? (
                        <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">Build in progress</Badge>
                    ) : response?.latency ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                            {response.latency}ms
                        </Badge>
                    ) : null}
                </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-4 bg-muted/10">
                {isLoading ? (
                    <div className="flex items-center gap-1 text-muted-foreground italic h-full justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "0.2s" }} />
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "0.4s" }} />
                        <span className="ml-2 text-sm font-medium">Thinking...</span>
                    </div>
                ) : response ? (
                    response.error ? (
                        <p className="text-sm font-medium text-destructive mt-2">{response.error}</p>
                    ) : (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                            <MarkdownRenderer content={response.content} />
                        </div>
                    )
                ) : (
                    <p className="text-sm text-muted-foreground mt-2">Waiting for input...</p>
                )}
            </CardContent>

            <CardFooter className="shrink-0 p-4 border-t bg-card">
                <Button 
                    className="w-full" 
                    variant={response && !response.error ? "default" : "secondary"}
                    disabled={!response || !!response.error || isClaude || isLoading} 
                    onClick={() => onAccept(modelId)}
                >
                    {isClaude ? 'Unavailable' : 'Accept & Continue'}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default ModelCard;