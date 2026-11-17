
const API_URL = "/api/chat";

export async function sendMessage(messages, options = {}) {
  try {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Nenhuma mensagem foi enviada.");
    }

    const formattedMessages = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: options.signal,
      body: JSON.stringify({
        messages: formattedMessages,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Erro ao consultar o Mindly.");
    }

    const content = data.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Resposta inválida do servidor.");
    }

    return content.trim();

  } catch (error) {
    if (error.name === "AbortError") throw error;

    console.error("Erro no Mindly:", error);
    throw error;
  }
}

export async function checkConnection() {
  try {
    const response = await fetch("/api/health");
    return response.ok;
  } catch {
    return false;
  }
}
