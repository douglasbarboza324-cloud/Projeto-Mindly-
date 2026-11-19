const inFlightRequests = new Map();

async function readApiResponse(response) {
  const raw = await response.text();
  let result = null;

  if (raw) {
    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error("CHAT_UNAVAILABLE");
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
    throw new Error("CHAT_UNAVAILABLE");
  }

  const result = response.result;
  if (!result) {
    throw new Error("CHAT_UNAVAILABLE");
  }
  if (!response.ok) {
    throw new Error("CHAT_UNAVAILABLE");
  }

  const content = result.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("CHAT_UNAVAILABLE");
  }

  if (!responseSchema) return content.trim();

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("CHAT_UNAVAILABLE");
  }
}
