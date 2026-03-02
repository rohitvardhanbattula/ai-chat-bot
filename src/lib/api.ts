import { ModelId, ModelResponse, ChatSession, ChatMessage } from "@/types/chat";

const API_BASE_URL = "/odata/v4/ai";

export async function generateMultiModelResponse(prompt: string): Promise<ModelResponse[]> {
  const response = await fetch(`${API_BASE_URL}/generateMultiModelResponse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) throw new Error("Failed to fetch multi-model responses");
  const data = await response.json();
  return data.value || data;
}

export async function fetchSessions(): Promise<ChatSession[]> {
  // Removed $expand=messages to only fetch lightweight metadata
  const response = await fetch(`${API_BASE_URL}/ChatSessions?$orderby=createdAt desc`);
  if (!response.ok) throw new Error("Failed to fetch sessions");
  const data = await response.json();
  
  // Initialize messages as an empty array so UI doesn't crash before loading
  return data.value.map((session: any) => ({ ...session, messages: [] }));
}

// New function to lazy-load messages for a specific session
export async function fetchSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/ChatSessions/${sessionId}/messages?$orderby=createdAt asc`);
  if (!response.ok) throw new Error("Failed to fetch session messages");
  const data = await response.json();
  return data.value;
}

export async function createSession(title: string, selectedModel: string, messages: any[]): Promise<ChatSession> {
  const response = await fetch(`${API_BASE_URL}/ChatSessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, selectedModel, messages }),
  });
  if (!response.ok) throw new Error("Failed to create session");
  return await response.json();
}

export async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ChatSessions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete session");
}

export async function renameSession(id: string, title: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ChatSessions/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("Failed to rename session");
}

export async function sendChatMessage(sessionId: string, modelId: ModelId, prompt: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/sendChatMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      modelId,
      prompt,
    }),
  });

  if (!response.ok) throw new Error("Failed to send chat message");
  const data = await response.json();
  return data.value || data.content || data;
}