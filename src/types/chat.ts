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
