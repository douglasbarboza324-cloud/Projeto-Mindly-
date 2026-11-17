export async function generateWithLocalModel({ prompt, messages, responseSchema, signal }) {
  let response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        messages: messages || [{ role: "user", content: prompt }],
        ...(responseSchema ? { format: responseSchema } : {}),
      }),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Inicie a API do Mindly e confirme que o Ollama está ativo. Seus dados continuam salvos neste navegador.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("A API local retornou uma resposta inválida.");
  }
  if (!response.ok) {
    throw new Error(result.error || `A API de IA não respondeu corretamente (${response.status}).`);
  }
  const content = result.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("O modelo local retornou uma resposta vazia.");
  }

  if (!responseSchema) return content.trim();

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("O modelo local retornou um resultado inválido. Tente novamente.");
  }
}
