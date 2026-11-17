import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

function loadBackendEnv() {
  try {
    const content = readFileSync(new URL("./.env", import.meta.url), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
      process.env[match[1]] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

loadBackendEnv();

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "127.0.0.1";
const MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
const OLLAMA_BASE_URL = new URL(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434");
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_BODY_BYTES = 200 * 1024;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 10_000;
const MAX_TOTAL_CHARS = 30_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const MAX_CONCURRENT_REQUESTS = 3;
const FEEDBACK_DIR = new URL("./data/", import.meta.url);
const FEEDBACK_FILE = new URL("./data/feedback.json", import.meta.url);
let activeRequests = 0;
const TRUST_PROXY = process.env.TRUST_PROXY === "true";
const rateLimits = new Map();
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (!OLLAMA_BASE_URL.hostname || !["http:", "https:"].includes(OLLAMA_BASE_URL.protocol) || OLLAMA_BASE_URL.username || OLLAMA_BASE_URL.password) {
  throw new Error("OLLAMA_BASE_URL must be an HTTP(S) URL without credentials.");
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readFeedback() {
  try {
    const records = JSON.parse(await readFile(FEEDBACK_FILE, "utf8"));
    return Array.isArray(records) ? records : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function saveFeedback(records) {
  await mkdir(FEEDBACK_DIR, { recursive: true });
  const temporaryFile = new URL("./data/feedback.tmp", import.meta.url);
  await writeFile(temporaryFile, JSON.stringify(records, null, 2), "utf8");
  await rename(temporaryFile, FEEDBACK_FILE);
}

async function handleFeedback(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, { feedback: (await readFeedback()).slice(0, 200) });
    return;
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, { error: "Método não permitido." });
    return;
  }
  if (!checkRateLimit(request)) {
    response.setHeader("Retry-After", "60");
    sendJson(response, 429, { error: "Muitas solicitações. Aguarde um minuto e tente novamente." });
    return;
  }
  const body = await readJson(request);
  if (!Number.isInteger(body?.rating) || body.rating < 1 || body.rating > 5 || typeof body.comment !== "string" || body.comment.length > 500) {
    throw new HttpError(400, "Informe uma nota de 1 a 5 e um comentário de até 500 caracteres.");
  }
  const records = await readFeedback();
  const entry = { id: crypto.randomUUID(), rating: body.rating, comment: body.comment.trim(), created_date: new Date().toISOString() };
  await saveFeedback([entry, ...records].slice(0, 1000));
  sendJson(response, 201, { feedback: entry });
}

function setSecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
}

function sendJson(response, status, value) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status);
  response.end(JSON.stringify(value));
}

function applyCors(request, response) {
  const origin = request.headers.origin;
  if (!origin) return true;

  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const sameOrigin = originUrl.host === request.headers.host;
  const isAllowed = allowedOrigins.size > 0 ? allowedOrigins.has(origin) : sameOrigin;
  if (!isAllowed) return false;

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Max-Age", "600");
  return true;
}

function checkRateLimit(request) {
  const now = Date.now();
  const forwardedFor = TRUST_PROXY ? request.headers["x-forwarded-for"]?.split(",")[0]?.trim() : "";
  const key = forwardedFor || request.socket.remoteAddress || "unknown";
  const entry = rateLimits.get(key);
  if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
    rateLimits.set(key, { startedAt: now, count: 1 });
  } else if (entry.count >= RATE_LIMIT) {
    return false;
  } else {
    entry.count += 1;
  }

  if (rateLimits.size > 10_000) {
    for (const [address, value] of rateLimits) {
      if (now - value.startedAt >= RATE_WINDOW_MS) rateLimits.delete(address);
    }
  }
  return true;
}

async function readJson(request) {
  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > MAX_BODY_BYTES) throw new HttpError(413, "A solicitação excede o limite permitido.");

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "A solicitação excede o limite permitido.");
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "O corpo da solicitação precisa ser um JSON válido.");
  }
}

function validateChatBody(body) {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    throw new HttpError(400, `Envie entre 1 e ${MAX_MESSAGES} mensagens.`);
  }

  let totalChars = 0;
  let hasUserMessage = false;
  const messages = body.messages.map((message) => {
    if (!message || !["system", "user", "assistant"].includes(message.role) || typeof message.content !== "string") {
      throw new HttpError(400, "Uma ou mais mensagens têm formato inválido.");
    }
    const content = message.content.trim();
    if (!content || content.length > MAX_MESSAGE_CHARS) {
      throw new HttpError(400, "Cada mensagem deve conter texto de até 10.000 caracteres.");
    }
    totalChars += content.length;
    if (message.role === "user") hasUserMessage = true;
    return { role: message.role, content };
  });

  if (!hasUserMessage) throw new HttpError(400, "A conversa precisa incluir uma mensagem do usuário.");
  if (totalChars > MAX_TOTAL_CHARS) throw new HttpError(413, "O histórico excede o limite permitido.");

  let format;
  if (body.format !== undefined) {
    if (!body.format || typeof body.format !== "object" || Array.isArray(body.format)) {
      throw new HttpError(400, "O formato de resposta solicitado é inválido.");
    }
    format = body.format;
  }
  return { messages, format };
}

async function handleChat(request, response) {
  if (!checkRateLimit(request)) {
    response.setHeader("Retry-After", "60");
    sendJson(response, 429, { error: "Muitas solicitações. Aguarde um minuto e tente novamente." });
    return;
  }

  const body = await readJson(request);
  const { messages, format } = validateChatBody(body);
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    response.setHeader("Retry-After", "3");
    sendJson(response, 429, { error: "O serviço está ocupado. Aguarde um momento e tente novamente." });
    return;
  }
  activeRequests += 1;
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  response.on("close", () => {
    if (!response.writableEnded) controller.abort();
  });

  try {
    const ollamaResponse = await fetch(new URL("/api/chat", OLLAMA_BASE_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        options: { num_predict: 1024 },
        ...(format ? { format } : {}),
      }),
    });

    if (!ollamaResponse.ok) {
      sendJson(response, 503, { error: "O modelo local está indisponível. Verifique o Ollama e o modelo configurado." });
      return;
    }

    const result = await ollamaResponse.json();
    if (typeof result.message?.content !== "string" || !result.message.content.trim()) {
      sendJson(response, 502, { error: "O modelo local retornou uma resposta vazia ou inválida." });
      return;
    }
    sendJson(response, 200, { message: { content: result.message.content } });
  } catch (error) {
    if (response.writableEnded) return;
    if (timedOut) {
      sendJson(response, 504, { error: "O modelo demorou demais para responder. Tente novamente." });
      return;
    }
    if (error.name === "AbortError") return;
    sendJson(response, 503, { error: "Não foi possível conectar ao Ollama. Verifique a configuração do serviço." });
  } finally {
    clearTimeout(timeout);
    activeRequests -= 1;
  }
}

const server = createServer(async (request, response) => {
  setSecurityHeaders(response);
  if (!applyCors(request, response)) {
    sendJson(response, 403, { error: "Origem não autorizada." });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }
  if (request.url === "/api/feedback") {
    if (request.method !== "GET" && !request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
      sendJson(response, 415, { error: "Envie o conteúdo como application/json." });
      return;
    }
    try {
      await handleFeedback(request, response);
    } catch (error) {
      sendJson(response, error instanceof HttpError ? error.status : 500, {
        error: error instanceof HttpError ? error.message : "Não foi possível processar o feedback.",
      });
    }
    return;
  }
  if (request.method !== "POST" || request.url !== "/api/chat") {
    sendJson(response, 404, { error: "Rota não encontrada." });
    return;
  }
  if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    sendJson(response, 415, { error: "Envie o conteúdo como application/json." });
    return;
  }

  try {
    await handleChat(request, response);
  } catch (error) {
    sendJson(response, error instanceof HttpError ? error.status : 500, {
      error: error instanceof HttpError ? error.message : "Não foi possível processar a solicitação.",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mindly API listening on port ${PORT} (model: ${MODEL})`);
});
