export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Método não permitido." });
  }
  if (req.method === "HEAD") return res.status(200).end();
  return res.status(200).json({ status: "ok" });
}
