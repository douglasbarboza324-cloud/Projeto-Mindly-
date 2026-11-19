const inFlightRequests = new Map();

async function readApiResponse(response) {
  const raw = await response.text();
  let result = null;

  if (raw) {
    try {
      result = JSON.parse(raw);
    } catch {
      const preview = raw.replace(/\s+/g, " ").trim().slice(0, 180);
      throw new Error(
        `A rota /api/chat retornou conteúdo que não é JSON (HTTP ${response.status}). ` +
        `Isso geralmente indica que a função da Vercel não foi publicada ou retornou uma página de erro. ` +
        (preview ? `Resposta recebida: ${preview}` : "A resposta veio vazia.")
      );
    }
  }

  return { ok: response.ok, status: response.status, result };
}

function requestChat(body, signal) {
  const key = JSON.stringify(body);
  const active = inFlightRequests.get(key);
  if (active) return active;

  const request = fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    signal,
    body: key,
  })
    .then(readApiResponse)
    .finally(() => inFlightRequests.delete(key));

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
    if (error.message?.includes("/api/chat")) throw error;
    throw new Error(
      "Não foi possível conectar à API do Mindly. Verifique a publicação da função /api/chat na Vercel e tente novamente."
    );
  }

  const result = response.result;
  if (!result) {
    throw new Error(`A API do Mindly não enviou JSON válido (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(result.error || `A API de IA não respondeu corretamente (${response.status}).`);
  }

  const content = result.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("O provedor de IA retornou uma resposta vazia ou em formato incompatível.");
  }

  if (!responseSchema) return content.trim();

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("O provedor de IA retornou um resultado inválido. Tente novamente.");
  }
}
