import { fetch } from "expo/fetch";

const BASE_URL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] || "";
const API_KEY = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] || "";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TTSOptions {
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  speed?: number;
}

export async function chatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const allMessages: ChatMessage[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const domain = process.env["EXPO_PUBLIC_DOMAIN"] || "";
  const apiBase = domain
    ? `https://${domain}/api/friday`
    : "/api/friday";

  try {
    const response = await fetch(`${apiBase}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = (await response.json()) as { content?: string; error?: string };
    return data.content || "I'm sorry, I couldn't process that.";
  } catch (error) {
    throw error;
  }
}

export async function transcribeAudio(audioBase64: string): Promise<string> {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"] || "";
  const apiBase = domain
    ? `https://${domain}/api/friday`
    : "/api/friday";

  const response = await fetch(`${apiBase}/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audio: audioBase64 }),
  });

  if (!response.ok) {
    throw new Error(`Transcription error: ${response.status}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text || "";
}

export async function textToSpeech(
  text: string,
  voice: string = "alloy"
): Promise<string> {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"] || "";
  const apiBase = domain
    ? `https://${domain}/api/friday`
    : "/api/friday";

  const response = await fetch(`${apiBase}/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    throw new Error(`TTS error: ${response.status}`);
  }

  const data = (await response.json()) as { audio?: string };
  return data.audio || "";
}
