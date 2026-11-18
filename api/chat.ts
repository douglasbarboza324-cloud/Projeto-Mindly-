const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 10000;
const MAX_TOTAL_CHARS = 30000;
const rateLimits = new Map();
let activeRequests = 0;

function validate(body) {
  if (!Array.isArray(body?.messages) || !body.messages.length || body.messages.length > MAX_MESSAGES) return "Envie entre 1 e 40 mensagens.";
  let total = 0;
  let hasUser = false;
  for (const item of body.messages) {
    if (!item || !["system", "user", "assistant"].includes(item.role) || typeof item.content !== "string") return "Uma ou mais mensagens têm formato inválido.";
    if (!item.content.trim() || item.content.length > MAX_MESSAGE_CHARS) return "Cada mensagem deve conter até 10.000 caracteres.";
    total += item.content.length;
    if (item.role === "user") hasUser = true;
  }
  if (!hasUser) return "A conversa precisa incluir uma mensagem do usuário.";
  if (total > MAX_TOTAL_CHARS) return "O histórico excede o limite permitido.";
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Método não permitido." }); }
  const validationError = validate(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  if (Buffer.byteLength(JSON.stringify(req.body)) > 200 * 1024) return res.status(413).json({ error: "A solicitação excede o limite permitido." });

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const now = Date.now();
  const limit = rateLimits.get(ip);
  if (limit && now - limit.startedAt < 60000 && limit.count >= 20) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({ error: "Muitas solicitações. Aguarde um minuto e tente novamente." });
  }
  if (!limit || now - limit.startedAt >= 60000) rateLimits.set(ip, { startedAt: now, count: 1 });
  else limit.count += 1;
  if (rateLimits.size > 10000) {
    for (const [address, entry] of rateLimits) if (now - entry.startedAt >= 60000) rateLimits.delete(address);
  }

  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "O provedor de IA ainda não está configurado. Defina AI_API_KEY, AI_MODEL e opcionalmente AI_BASE_URL nas variáveis da Vercel." });
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  let endpoint;
  try {
    endpoint = new URL(`${baseUrl.replace(/\/+$/, "")}/chat/completions`);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) throw new Error("Invalid AI endpoint");
  } catch { return res.status(500).json({ error: "AI_BASE_URL precisa ser uma URL HTTPS válida." }); }

  if (activeRequests >= 5) {
    res.setHeader("Retry-After", "3");
    return res.status(429).json({ error: "O serviço está ocupado. Aguarde um momento e tente novamente." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  activeRequests += 1;
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model, messages: req.body.messages, stream: false, max_tokens: 1024,
        ...(req.body.format ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status === 429 ? 429 : 502).json({ error: upstream.status === 429 ? "O provedor está ocupado. Tente novamente em instantes." : "O provedor de IA não conseguiu concluir a solicitação." });
    const content = result.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return res.status(502).json({ error: "O provedor de IA retornou uma resposta vazia." });
    return res.status(200).json({ message: { content } });
  } catch (error) {
    return res.status(error.name === "AbortError" ? 504 : 503).json({ error: error.name === "AbortError" ? "A resposta demorou demais. Tente novamente." : "Não foi possível conectar ao provedor de IA." });
  } finally { clearTimeout(timeout); activeRequests -= 1; }
}
