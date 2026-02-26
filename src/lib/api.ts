import { ModelId, ModelResponse } from "@/types/chat";

// We use an environment variable for the API URL, falling back to the default local CAP port
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4004/odata/v4/ai";

export async function generateMultiModelResponse(
  prompt: string
): Promise<ModelResponse[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/generateMultiModelResponse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // CAP OData actions expect parameters in the body
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Backend Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // OData V4 typically wraps action results in a 'value' property
    return data.value || data; 
  } catch (error) {
    console.error("Failed to fetch multi-model responses from backend:", error);
    // Return empty array or throw error depending on how you want the UI to handle failures
    throw error; 
  }
}

export async function sendChatMessage(
  modelId: ModelId,
  prompt: string,
  history: { role: string; content: string }[]
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/sendChatMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modelId,
        prompt,
        history,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract the string response. Checking 'value' for standard OData V4 wrapper, 
    // or 'content' depending on how we structure the CAP return object later.
    return data.value || data.content || data;
  } catch (error) {
    console.error(`Failed to send chat message to ${modelId}:`, error);
    throw error;
  }
}