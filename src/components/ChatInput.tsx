import { useState, useRef } from "react";
import { Send, Zap, Code2, Database, Workflow, AlertCircle, Paperclip, X } from "lucide-react";
import { uploadDocument } from "@/lib/api";

interface ChatInputProps {
  onSubmit: (prompt: string, category: string, extractedText: string | null) => void;
  isLoading?: boolean;
  minimal?: boolean;
  placeholder?: string;
  isLimitReached?: boolean;
}

interface PiiItem {
  type: string;
  value: string;
  keep: boolean;
}

const PROMPT_TEMPLATES = [
  { icon: Code2, label: "Optimize ABAP code", prompt: "Optimize this ABAP SELECT statement for better performance with large datasets" },
  { icon: Database, label: "CAP Service Handler", prompt: "Create a CAPM service handler with CRUD operations and custom actions" },
  { icon: Workflow, label: "BTP Integration", prompt: "Build a Node.js integration between SAP BTP and Azure services" },
  { icon: Zap, label: "Fiori Elements", prompt: "Generate a List Report Fiori Elements app with custom annotations" },
];

const CATEGORIES = ["abap-simple", "abap-complex"];

const ChatInput = ({ onSubmit, isLoading, minimal, placeholder, isLimitReached }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("abap-simple");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [piiList, setPiiList] = useState<PiiItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isLimitReached || isUploading) return;
    
    // Apply local masking based on user checkbox selections
    let finalExtractedText = extractedText;
    if (finalExtractedText && piiList.length > 0) {
        piiList.forEach(item => {
            if (!item.keep) {
                const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapeRegExp(item.value), 'g');
                finalExtractedText = finalExtractedText!.replace(regex, `[REDACTED_${item.type.toUpperCase()}]`);
            }
        });
    }
    
    onSubmit(input.trim(), category, finalExtractedText);
    setInput("");
  };

  const handleTemplate = (prompt: string) => {
    if (isLimitReached) return;
    setInput(prompt);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      
      // UPDATED: Block files larger than 70KB (71,680 bytes) instantly on the client
      /*if (selectedFile.size > 70 * 1024) {
          alert("File size exceeds the 70KB limit. Please upload a smaller document.");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
      }*/

      setFile(selectedFile);
      setIsUploading(true);
      try {
        const data = await uploadDocument(selectedFile);
        setExtractedText(data.text);
        
        if (data.piiList && data.piiList.length > 0) {
            setPiiList(data.piiList.map((p: any) => ({ ...p, keep: false })));
        } else {
            setPiiList([]);
        }
      } catch (err: any) {
        alert(err.message || "File extraction failed");
        setFile(null);
        setExtractedText(null);
        setPiiList([]);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeFile = () => {
      setFile(null);
      setExtractedText(null);
      setPiiList([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const togglePii = (index: number) => {
      setPiiList(prev => prev.map((p, i) => i === index ? { ...p, keep: !p.keep } : p));
  };

  return (
    <div className={minimal ? "w-full" : "flex flex-col items-center gap-5 sm:gap-6 w-full max-w-3xl mx-auto py-4"}>
      {!minimal && (
        <div className="text-center animate-slide-up w-full flex flex-col items-center shrink-0">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Code Generation</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">Input your requirements or upload a Functional Spec (Max 70KB).</p>
        </div>
      )}

      {isLimitReached && (
        <div className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md animate-in fade-in slide-in-from-bottom-2 shrink-0">
          <AlertCircle className="w-4 h-4" />
          Maximum prompt limit (20) reached. Please start a new chat to continue.
        </div>
      )}

      <form onSubmit={handleSubmit} className={`w-full shrink-0 ${minimal ? "" : "animate-slide-up"}`}>
        <div className={`relative flex flex-col transition-all duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/25 ${minimal ? "bg-card border-2 border-primary/60 rounded-lg shadow-lg" : "bg-accent/10 border-2 border-primary/40 rounded-xl shadow-md"} ${isLimitReached ? "opacity-50 pointer-events-none grayscale" : ""}`}>
          
          <div className="flex items-center gap-2 p-2 border-b border-primary/10 bg-muted/10">
            <select value={category} onChange={(e) => setCategory(e.target.value) }
              className="text-xs bg-background text-foreground outline-none border border-border rounded px-2 py-1 cursor-pointer">   
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            {!minimal && (
              <>
                <input type="file" accept=".pdf,.docx" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isUploading} />
                <button type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="text-xs flex items-center gap-1 hover:text-primary transition-colors disabled:opacity-50">
                  <Paperclip className="w-3.5 h-3.5" /> Attach Spec
                </button>
                {file && (
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    {isUploading ? (
                       <span className="text-[10px] animate-pulse">Extracting...</span>
                    ) : (
                       <button type="button" onClick={removeFile}><X className="w-3 h-3 hover:text-destructive" /></button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {piiList.length > 0 && !minimal && (
            <div className="px-4 py-3 border-b border-primary/10 bg-destructive/5 flex flex-col gap-2 max-h-40 overflow-y-auto">
              <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Sensitive Data Detected
              </span>
              <span className="text-[10px] text-muted-foreground">
                Select items to <strong>ALLOW</strong> the AI to see. Unchecked items will be redacted.
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {piiList.map((pii, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-xs text-foreground cursor-pointer bg-background/50 p-1.5 rounded border border-border/50 hover:bg-background transition-colors">
                    <input 
                      type="checkbox" 
                      checked={pii.keep} 
                      onChange={() => togglePii(idx)}
                      className="rounded border-border accent-primary"
                    />
                    <span className="truncate max-w-[200px]" title={pii.value}>{pii.value}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto bg-muted px-1 rounded">{pii.type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
            placeholder={isLimitReached ? "Chat limit reached..." : (placeholder || "Type your message here...")}
            rows={minimal ? 1 : 4}
            className={`w-full bg-transparent text-foreground placeholder:text-foreground/50 resize-none focus:outline-none ${minimal ? "px-4 py-3 text-sm" : "px-5 py-4 text-base"}`}
            disabled={isLoading || isLimitReached || isUploading}
          />
          
          <div className={`flex items-center justify-between px-3 py-2 border-t-2 border-primary/10 bg-muted/20 ${minimal ? "rounded-b-lg" : "rounded-b-xl"}`}>
            <span className="text-[11px] text-muted-foreground font-mono">
              {input.length > 0 ? `${input.length} characters` : "Shift + Enter for new line"}
            </span>
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isLimitReached || isUploading}
              className={`flex items-center gap-2 rounded-md bg-primary text-primary-foreground font-bold disabled:opacity-50 hover:bg-primary/90 transition-all shadow-sm active:scale-95 ${minimal ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
            >
              <Send className={`${minimal ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
              {isLoading || isUploading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      </form>

      {!minimal && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 w-full shrink-0 animate-slide-up ${isLimitReached ? "opacity-50 pointer-events-none" : ""}`} style={{ animationDelay: "0.1s" }}>
          {PROMPT_TEMPLATES.map((t) => (
            <button key={t.label} onClick={() => handleTemplate(t.prompt)} disabled={isLimitReached} className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-left group shadow-sm">
              <div className="p-2 bg-background rounded-md border border-border shrink-0"><t.icon className="w-4 h-4 text-primary" /></div>
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