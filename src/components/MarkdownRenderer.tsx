import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match;
          const codeString = String(children).replace(/\n$/, "");

          if (isInline) {
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-secondary text-primary font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <CodeBlock
              language={match[1]}
              value={codeString}
            />
          );
        },
        h2: ({ children }: any) => (
          <h2 className="text-lg font-semibold text-foreground mt-4 mb-2">{children}</h2>
        ),
        h3: ({ children }: any) => (
          <h3 className="text-base font-semibold text-foreground mt-3 mb-1">{children}</h3>
        ),
        p: ({ children }: any) => (
          <p className="text-secondary-foreground leading-relaxed mb-2 text-sm">{children}</p>
        ),
        strong: ({ children }: any) => (
          <strong className="text-foreground font-semibold">{children}</strong>
        ),
        table: ({ children }: any) => (
          <div className="overflow-x-auto my-3">
            <table className="text-xs border-collapse w-full">{children}</table>
          </div>
        ),
        th: ({ children }: any) => (
          <th className="border border-border px-2 py-1 text-left font-semibold bg-secondary/50">{children}</th>
        ),
        td: ({ children }: any) => (
          <td className="border border-border px-2 py-1 align-top">{children}</td>
        ),
        em: ({ children }: any) => (
          <em className="text-muted-foreground">{children}</em>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
