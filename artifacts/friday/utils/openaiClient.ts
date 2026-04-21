import { fetch } from "expo/fetch";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const allMessages: ChatMessage[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const domain = process.env["EXPO_PUBLIC_DOMAIN"] || "";
  const apiBase = domain ? `https://${domain}/api/friday` : "/api/friday";

  const response = await fetch(`${apiBase}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: allMessages }),
  });

  if (!response.ok) {
    throw new Error(`AI error: ${response.status}`);
  }

  const data = (await response.json()) as { content?: string };
  return data.content || "I'm sorry, I couldn't process that.";
}
