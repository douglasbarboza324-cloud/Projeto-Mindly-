const inFlightRequests = new Map();

function requestChat(body, signal) {
  const key = JSON.stringify(body);
  const active = inFlightRequests.get(key);
  if (active) return active;
  const request = fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: key,
  }).then(async (response) => ({
    ok: response.ok,
    status: response.status,
    result: await response.json().catch(() => null),
  })).finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, request);
  return request;
}

export async function generateWithLocalModel({ prompt, messages, responseSchema, signal }) {
  const body = {
    messages: messages || [{ role: "user", content: prompt }],
    ...(responseSchema ? { format: responseSchema } : {}),
  };
  let response;
  try {
    response = await requestChat(body, signal);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Não foi possível conectar à API do Mindly. Confirme se a API local ou o serviço publicado está disponível.");
  }

  const result = response.result;
  if (!result) throw new Error("A API do Mindly retornou uma resposta inválida.");
  if (!response.ok) {
    throw new Error(result.error || `A API de IA não respondeu corretamente (${response.status}).`);
  }
  const content = result.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("O provedor de IA retornou uma resposta vazia.");
  }

  if (!responseSchema) return content.trim();

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("O provedor de IA retornou um resultado inválido. Tente novamente.");
  }
}
