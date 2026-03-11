import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MarkdownRenderer from "./MarkdownRenderer";
import { MODELS } from "@/types/chat"; 

const ModelCard = ({ modelId, response, isLoading, onAccept }: any) => {
    const isClaude = modelId.toLowerCase() === 'lovable';
    const modelName = MODELS && MODELS[modelId] ? MODELS[modelId].name : modelId.toUpperCase();
    
    const hasErrorText = response?.content?.includes("model is not available at the moment");
    const isDisabled = !response || !!response.error || isClaude || isLoading || hasErrorText;

    let displayContent = response?.content || "";
    let errorCount = 0;
    let hasAbapLint = false;

    // Grab the ABAP error count from the end of the stream
    if (displayContent) {
        const match = displayContent.match(/\*\* abaplint: (\d+) high-risk issue\(s\) found\*\*/i) || 
                      displayContent.match(/\*\* abaplint: (0) high-risk issues\*\*/i);
        
        if (match) {
            hasAbapLint = true;
            errorCount = parseInt(match[1], 10);
            
            // Remove the raw text from the markdown so it doesn't show at the bottom
            displayContent = displayContent.replace(/\*\* abaplint: \d+ high-risk issue\(s\) found\*\*\n\n/i, "");
            displayContent = displayContent.replace(/\*\* abaplint: 0 high-risk issues\*\*\n\n/i, "");
            
            if (errorCount === 0) {
                displayContent = displayContent.replace(/\n\n---\nNo high-risk syntax issues found in the generated ABAP code./i, "");
            }
        }
    }

    return (
        <Card className={`flex flex-col h-[400px] ${isClaude ? 'opacity-50 pointer-events-none grayscale' : 'hover:border-primary/50 transition-colors'}`}>
            <CardHeader className="pb-2 shrink-0 border-b">
                <CardTitle className="flex justify-between items-center text-lg">
                    <div className="flex items-center gap-2">
                        <span>{modelName}</span>
                    </div>
                    {/* RIGHT SIDE OF THE HEADER BAR */}
                    <div className="flex items-center gap-2">
                        {/* Red Badge for Errors */}
                        {hasAbapLint && errorCount > 0 && (
                            <Badge variant="destructive" className="text-xs font-bold">
                                {errorCount} ABAP Errors
                            </Badge>
                        )}
                        {/* Green/Outline Badge for No Errors */}
                        {hasAbapLint && errorCount === 0 && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 font-bold">
                                0 ABAP Errors
                            </Badge>
                        )}

                        {isClaude ? (
                            <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">Build in progress</Badge>
                        ) : response?.latency ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                                {response.latency}ms
                            </Badge>
                        ) : null}
                    </div>
                </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-4 bg-muted/10">
                {isLoading && (!response || !response.content) ? (
                    <div className="flex items-center gap-1 text-muted-foreground italic h-full justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "0.2s" }} />
                        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "0.4s" }} />
                        <span className="ml-2 text-sm font-medium">Thinking...</span>
                    </div>
                ) : response ? (
                    response.error || hasErrorText ? (
                        <p className="text-sm font-medium text-destructive mt-2">{response.error || response.content}</p>
                    ) : (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                            <MarkdownRenderer content={displayContent} />
                        </div>
                    )
                ) : (
                    <p className="text-sm text-muted-foreground mt-2">Waiting for input...</p>
                )}
            </CardContent>

            <CardFooter className="shrink-0 p-4 border-t bg-card">
                <Button 
                    className="w-full" 
                    variant={isDisabled ? "secondary" : "default"}
                    disabled={isDisabled} 
                    onClick={() => onAccept(modelId)}
                >
                    {isClaude || hasErrorText ? 'Unavailable' : 'Accept & Continue'}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default ModelCard;