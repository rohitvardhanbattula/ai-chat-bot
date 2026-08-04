import { useRef, useEffect, useState } from "react";
import { ArrowLeft, Star, Copy, Check, Download } from "lucide-react";
import { ChatMessage, ModelId, MODELS } from "@/types/chat";
import MarkdownRenderer from "./MarkdownRenderer";
import ChatInput from "./ChatInput";
import RatingPopup from "./RatingPopup";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { checkConnection } from "@/lib/api";

// How often to ping the SAP connection (ms)
const SAP_POLL_INTERVAL_MS = 45_000;

interface ActiveChatProps {
  modelId: ModelId;
  chatId: string;
  messages: ChatMessage[];
  onSendMessage: (prompt: string, category: string, extractedText: string | null) => void;
  onBack: () => void;
  isLoading: boolean;
  /** Whether a SAP connection was established for this session (lifted from Index). */
  isSapConnected: boolean;
  /** Called when a (re-)connection succeeds so Index can update its state. */
  onSapConnected: (sessionId: string) => void;
  /** Called when the poll detects the connection has dropped. */
  onSapDisconnected: () => void;
}

const ActiveChat = ({
  modelId,
  chatId,
  messages,
  onSendMessage,
  onBack,
  isLoading,
  isSapConnected,
  onSapConnected,
  onSapDisconnected,
}: ActiveChatProps) => {
  const model = MODELS[modelId];
  const bottomRef = useRef<HTMLDivElement>(null);
  const [ratingModal, setRatingModal] = useState({ isOpen: false, modelId: '' });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── SAP connection polling ───────────────────────────────────────────────
  useEffect(() => {
    if (!isSapConnected) return; // nothing to poll if not connected

    const poll = async () => {
      try {
        const status = await checkConnection(chatId);
        if (!status.connected) {
          console.warn(`[ActiveChat] SAP connection lost for ${chatId}:`, status.message);
          onSapDisconnected();
        }
      } catch (err) {
        // Network error — don't flip the indicator, it's probably a transient glitch
        console.warn('[ActiveChat] SAP poll network error:', err);
      }
    };

    const timer = setInterval(poll, SAP_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isSapConnected, chatId, onSapDisconnected]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  /**
   * Strip markdown syntax from a prose block so jsPDF renders clean plain text.
   * Handles: bold/italic, inline code, links, images, headings, horizontal rules,
   * bullet/numbered lists, blockquotes, HTML entities, trailing whitespace,
   * and emoji/non-Latin-1 Unicode characters that corrupt jsPDF's default font.
   */
  const stripMarkdown = (text: string): string => {
    return text
      // HTML entities → real characters (fixes &*&S&t&a&t&u&s&:& style corruption)
      .replace(/&amp;/g,  '&')
      .replace(/&lt;/g,   '<')
      .replace(/&gt;/g,   '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g,  "'")
      .replace(/&nbsp;/g, ' ')
      // Headings (### Heading → Heading)
      .replace(/^#{1,6}\s+/gm, '')
      // Bold + italic (***text*** or ___text___)
      .replace(/\*{3}(.+?)\*{3}/g, '$1')
      .replace(/_{3}(.+?)_{3}/g,   '$1')
      // Bold (**text** or __text__)
      .replace(/\*{2}(.+?)\*{2}/g, '$1')
      .replace(/_{2}(.+?)_{2}/g,   '$1')
      // Italic (*text* or _text_) — only when surrounded by word boundaries to
      // avoid stripping lone * used as bullet points
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
      .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g,       '$1')
      // Inline code (`code`)
      .replace(/`([^`]+)`/g, '$1')
      // Images ![alt](url) → alt text
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Links [text](url) → text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Blockquotes (> quote)
      .replace(/^>\s?/gm, '')
      // Horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '─────────────────────')
      // Bullet lists (* item  /  - item  /  + item)
      .replace(/^[\s]*[-*+]\s+/gm, '• ')
      // Numbered lists (1. item)
      .replace(/^[\s]*\d+\.\s+/gm, (match) => match.trimStart())
      // Strikethrough (~~text~~)
      .replace(/~~(.+?)~~/g, '$1')
      // Trailing spaces on each line
      .replace(/[ \t]+$/gm, '')
      // Collapse 3+ blank lines to 2
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      // ── Strip emoji and non-Latin-1 Unicode ──────────────────────────────
      // jsPDF's built-in helvetica font uses single-byte Latin-1 encoding.
      // Multi-byte Unicode codepoints (emoji, special symbols) corrupt the byte
      // stream and garble all surrounding text in the PDF output.
      // Emoji ranges
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      // Miscellaneous symbols (☀ ☁ ★ etc.)
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      // Dingbats (✂ ✈ ✉ etc.)
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      // Supplemental symbols and pictographs
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
      // Symbols and pictographs extended-A
      .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
      // Any remaining non-Latin-1 character (catch-all)
      .replace(/[^\x00-\xFF]/gu, '');
  };

  const handleDownloadPDF = (content: string, dateStr?: string | Date) => {
    const doc = new jsPDF();
    const time = formatTime(dateStr);
    const fileName = `SAP_AI_Code_Gen_${new Date().getTime()}.pdf`;
    const PAGE_WIDTH   = 182; // printable width (210 – 14 margin × 2)
    const PAGE_BOTTOM  = 280; // leave room for footer
    const FOOTER_Y     = 290;

    // ── Header ──────────────────────────────────────────────────────────────
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("AnswerThink AI Code Generation", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Model: ${model?.name || "AI Assistant"} | Time: ${time}`, 14, 28);
    doc.setTextColor(0);

    let yOffset = 38;

    // ── Split on code fences, alternate prose / code ─────────────────────
    const parts = content.split("```");

    parts.forEach((part, index) => {
      if (index % 2 !== 0) {
        // ── Code block ────────────────────────────────────────────────────
        const codeLines   = part.split("\n");
        // First line is often the language tag (e.g. "abap", "js") — strip it
        const codeContent = (codeLines.length > 1 && !codeLines[0].trim().includes(" "))
          ? codeLines.slice(1).join("\n").trimEnd()
          : part.trimEnd();

        autoTable(doc, {
          startY: yOffset,
          head:   [],
          body:   [[codeContent]],
          theme:  'plain',
          styles: {
            font:        "courier",
            fontSize:    9,
            fillColor:   [240, 240, 240],
            textColor:   [40, 40, 40],
            cellPadding: 4,
          },
          margin: { left: 14, right: 14 },
          didDrawPage: (data: any) => {
            yOffset = (data.cursor?.y ?? yOffset) + 10;
          },
        });
        // didDrawPage gives us the final cursor; add a small gap after the table
        yOffset += 6;

      } else {
        // ── Prose block — strip markdown before rendering ─────────────────
        const cleanText = stripMarkdown(part);
        if (!cleanText) return;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0);

        // Split long prose into lines that fit the page width
        const lines: string[] = doc.splitTextToSize(cleanText, PAGE_WIDTH);

        for (const line of lines) {
          if (yOffset > PAGE_BOTTOM) {
            doc.addPage();
            yOffset = 20;
          }
          doc.text(line, 14, yOffset);
          yOffset += 6; // line height
        }
        yOffset += 4; // paragraph gap after prose block
      }
    });

    // ── Footer on every page ──────────────────────────────────────────────
    const pageCount = (doc.internal as any).getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Generated by AnswerThink Enterprise AI Hub | Page ${i} of ${pageCount}`,
        14,
        FOOTER_Y
      );
    }

    doc.save(fileName);
  };

  // ── SAP connection badge ─────────────────────────────────────────────────
  const SapBadge = () => {
    if (isSapConnected) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-500/10 border border-green-500/30 rounded px-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          SAP Live
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full bg-card border-x border-border shadow-sm relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded hover:bg-muted transition-colors border border-transparent hover:border-border"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="h-4 w-[1px] bg-border" />
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="font-semibold text-sm text-foreground">{model?.name || "AI Assistant"}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Connect / reconnect SAP from the message toolbar below — this badge is status-only. */}
          <SapBadge />
        </div>
      </div>

      {/* Messages */}
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
                    <button
                      onClick={() => handleDownloadPDF(msg.content, msg.createdAt || msg.timestamp)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Save as PDF
                    </button>
                  </div>
                ) : (
                  <div />
                )}
                <p className="text[10px] text-muted-foreground ml-auto">
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
        <ChatInput
          onSubmit={onSendMessage}
          isLoading={isLoading}
          minimal
          placeholder={`Message ${model?.name || 'AI Assistant'}...`}
          sapSessionId={chatId}
          isSapConnected={isSapConnected}
          onSapConnected={onSapConnected}
        />
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
