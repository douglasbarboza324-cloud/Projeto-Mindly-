
import { Buffer } from "node:buffer";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 10000;
const MAX_TOTAL_CHARS = 30000;

const rateLimits = new Map<
  string,
  { startedAt: number; count: number }
>();

let activeRequests = 0;

function validate(body: any) {
  if (
    !Array.isArray(body?.messages) ||
    !body.messages.length ||
    body.messages.length > MAX_MESSAGES
  ) {
    return "Envie entre 1 e 40 mensagens.";
  }

  let total = 0;
  let hasUser = false;

  for (const item of body.messages) {
    if (
      !item ||
      !["system", "user", "assistant"].includes(item.role) ||
      typeof item.content !== "string"
    ) {
      return "Uma ou mais mensagens têm formato inválido.";
    }

    if (
      !item.content.trim() ||
      item.content.length > MAX_MESSAGE_CHARS
    ) {
      return "Cada mensagem deve conter até 10.000 caracteres.";
    }

    total += item.content.length;

    if (item.role === "user") hasUser = true;
  }

  if (!hasUser) {
    return "A conversa precisa incluir uma mensagem do usuário.";
  }

  if (total > MAX_TOTAL_CHARS) {
    return "O histórico excede o limite permitido.";
  }

  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  const validationError = validate(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError
    });
  }

  if (
    Buffer.byteLength(JSON.stringify(req.body)) >
    200 * 1024
  ) {
    return res.status(413).json({
      error: "A solicitação excede o limite permitido."
    });
  }

  const apiKey = process.env.AI_API_KEY;
  const model = "glm-5.3-flash:cloud";

  const baseUrl = (
    process.env.AI_BASE_URL || "https://ollama.com/v1"
  ).replace(/\/+$/, "");

  if (!apiKey || !model) {
    return res.status(500).json({
      error: "Configure AI_API_KEY e AI_MODEL na Vercel."
    });
  }

  let endpoint: URL;

  try {
    endpoint = new URL(`${baseUrl}/chat/completions`);

    if (
      endpoint.protocol !== "https:" &&
      !(
        endpoint.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(endpoint.hostname)
      )
    ) {
      throw new Error("Endereço não permitido");
    }
  } catch {
    return res.status(500).json({
      error: "Endereço do Ollama inválido."
    });
  }

  const ip = String(
    req.headers["x-forwarded-for"] || "unknown"
  ).split(",")[0].trim();

  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (
    limit &&
    now - limit.startedAt < 60000 &&
    limit.count >= 20
  ) {
    res.setHeader("Retry-After", "60");

    return res.status(429).json({
      error: "Muitas solicitações. Aguarde um minuto."
    });
  }

  if (!limit || now - limit.startedAt >= 60000) {
    rateLimits.set(ip, {
      startedAt: now,
      count: 1
    });
  } else {
    limit.count++;
  }

  if (activeRequests >= 5) {
    return res.status(429).json({
      error: "O serviço está ocupado."
    });
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    55000
  );

  activeRequests++;

  try {
    const upstream = await fetch(endpoint.toString(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: req.body.messages,
        stream: false,
        max_tokens: 1024,
        ...(req.body.format
          ? { response_format: { type: "json_object" } }
          : {})
      })
    });

    const result = await upstream.json().catch(() => null);

    if (!upstream.ok) {
  console.error("ERRO OLLAMA:", {
    status: upstream.status,
    response: result
  });

  return res.status(502).json({
    error: "Falha no provedor de IA.",
    providerStatus: upstream.status,
    providerMessage:
      result?.error?.message ||
      result?.message ||
      "O provedor não informou o motivo."
  });
}

    const content =
      result?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      console.error("Resposta inválida:", result);

      return res.status(502).json({
        error: "A IA retornou uma resposta vazia ou inválida."
      });
    }

    return res.status(200).json({
      message: { content }
    });

  } catch (error: any) {
    console.error("Erro API Mindly:", error);

    return res.status(
      error.name === "AbortError" ? 504 : 503
    ).json({
      error:
        error.name === "AbortError"
          ? "A resposta demorou demais."
          : "Não foi possível conectar ao Ollama."
    });

  } finally {
    clearTimeout(timeout);
    activeRequests--;
  }
}
