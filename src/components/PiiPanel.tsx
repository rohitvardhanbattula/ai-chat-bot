import { AlertCircle } from 'lucide-react';
import type { PiiItem } from '@/types/chat';

// A spreadsheet can yield hundreds of findings; rendering them all makes the input sluggish.
const MAX_VISIBLE = 100;

interface PiiPanelProps {
    items: PiiItem[];
    onToggle: (index: number) => void;
    onSetAll: (keep: boolean) => void;
}

/** Lets the user decide, per sensitive value, whether the AI may see it. Unchecked = redacted. */
export const PiiPanel = ({ items, onToggle, onSetAll }: PiiPanelProps) => {
    if (items.length === 0) return null;
    const hidden = items.length - MAX_VISIBLE;

    return (
        <div className="px-4 py-3 border-b border-primary/10 bg-destructive/5 flex flex-col gap-2 max-h-40 overflow-y-auto">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Sensitive Data Detected ({items.length})
                </span>
                <div className="ml-auto flex gap-3 text-[10px]">
                    <button type="button" className="text-muted-foreground hover:text-foreground underline" onClick={() => onSetAll(true)}>Allow all</button>
                    <button type="button" className="text-muted-foreground hover:text-foreground underline" onClick={() => onSetAll(false)}>Redact all</button>
                </div>
            </div>
            <span className="text-[10px] text-muted-foreground">
                Check items to <strong>ALLOW</strong> the AI to see them. Unchecked items will be redacted.
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {items.slice(0, MAX_VISIBLE).map((pii, idx) => (
                    <label
                        key={`${pii.type}:${pii.value}`}
                        className="flex items-center gap-2 text-xs text-foreground cursor-pointer bg-background/50 p-1.5 rounded border border-border/50 hover:bg-background transition-colors"
                    >
                        <input
                            type="checkbox"
                            checked={pii.keep}
                            onChange={() => onToggle(idx)}
                            className="rounded border-border accent-primary"
                        />
                        <span className="truncate max-w-[200px]" title={pii.value}>{pii.value}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto bg-muted px-1 rounded">{pii.type}</span>
                    </label>
                ))}
            </div>
            {hidden > 0 && (
                <span className="text-[10px] text-muted-foreground">
                    +{hidden} more not shown — they stay redacted unless you choose "Allow all".
                </span>
            )}
        </div>
    );
};
