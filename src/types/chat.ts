export type ModelId = 'claude' | 'gpt4o';

export interface ModelInfo {
    id:          ModelId;
    name:        string;
    provider:    string;
    colorClass:  string;
    borderClass: string;
}

export const MODELS: Record<ModelId, ModelInfo> = {
    claude: {
        id:          'claude',
        name:        'Claude',
        provider:    'Anthropic',
        colorClass:  'text-model-claude',
        borderClass: 'model-card-claude',
    },
    gpt4o: {
        id:          'gpt4o',
        name:        'GPT',
        provider:    'OpenAI',
        colorClass:  'text-model-gpt',
        borderClass: 'model-card-gpt',
    },
};

export interface ModelResponse {
    modelId: ModelId;
    content: string;
    latency: number;
    error?:  string;
}

export interface ChatMessage {
    ID?:       string;
    role:      'user' | 'assistant';
    content:   string;
    modelId?:  ModelId;
    createdAt?: string;
    /** Legacy field — use createdAt where possible */
    timestamp: any;
}

export interface ChatSession {
    ID:            string;
    title:         string;
    selectedModel: ModelId;
    messages:      ChatMessage[];
    createdAt?:    string;
}

export type AppState = 'input' | 'comparison' | 'active-chat';


// ── Attachments ───────────────────────────────────────────────────────────────
export type AttachmentKind = 'pdf' | 'docx' | 'xlsx' | 'csv';

export interface SpreadsheetSheetMeta {
    name:      string;
    /** Data rows read (the header row is not counted). */
    rows:      number;
    columns:   number;
    truncated: boolean;
}

/** What the backend learned while extracting text from an uploaded file. */
export interface UploadMeta {
    kind:          AttachmentKind;
    /** Length of the extracted text sent to the model. */
    chars:         number;
    /** True when the file was larger than what the backend will read. */
    truncated:     boolean;
    pages?:        number;
    sheets?:       SpreadsheetSheetMeta[];
    hiddenSheets?: number;
}

export interface PiiFinding {
    type:  string;
    value: string;
}

/** A PII finding plus the user's decision: keep = let the AI see it, otherwise it is redacted. */
export interface PiiItem extends PiiFinding {
    keep: boolean;
}

export interface UploadResult {
    text:         string;
    piiList:      PiiFinding[];
    /** Findings beyond the review list that the server already redacted. */
    piiOverflow?: number;
    meta?:        UploadMeta;
}
