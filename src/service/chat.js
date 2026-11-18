import { generateWithLocalModel } from "@/api/localModel";

export async function sendMessage(messages, options = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Nenhuma mensagem foi enviada.");
  }
  const formattedMessages = messages.map((message) => ({ role: message.role, content: message.content }));
  return generateWithLocalModel({ messages: formattedMessages, signal: options.signal });
}

export async function checkConnection() {
  try {
    const response = await fetch("/api/health", { method: "GET", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
