export type ModelId = "gemini" | "claude" | "gpt4o" | "azure";

export interface ModelInfo {
  id: ModelId;
  name: string;
  provider: string;
  colorClass: string;
  borderClass: string;
}

export const MODELS: Record<ModelId, ModelInfo> = {
  gemini: {
    id: "gemini",
    name: "Gemini Pro",
    provider: "Google",
    colorClass: "text-model-gemini",
    borderClass: "model-card-gemini",
  },
  claude: {
    id: "claude",
    name: "Claude 3.5",
    provider: "Anthropic",
    colorClass: "text-model-claude",
    borderClass: "model-card-claude",
  },
  gpt4o: {
    id: "gpt4o",
    name: "GPT-4o",
    provider: "OpenAI",
    colorClass: "text-model-gpt",
    borderClass: "model-card-gpt",
  },
  azure: {
    id: "azure",
    name: "Azure Copilot",
    provider: "Microsoft",
    colorClass: "text-model-azure",
    borderClass: "model-card-azure",
  },
};

export interface ModelResponse {
  modelId: ModelId;
  content: string;
  latency: number;
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  modelId?: ModelId;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  selectedModel: ModelId | null;
  messages: ChatMessage[];
  createdAt: Date;
}

export type AppState = "input" | "comparison" | "active-chat";
