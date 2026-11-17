
export default async function handler(req, res) {
  // Aceitar somente POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Nenhuma mensagem recebida."
      });
    }

    // Endereço do Ollama instalado no notebook
    const ollamaUrl =
      process.env.OLLAMA_URL || "http://127.0.0.1:11434";

    const model = process.env.OLLAMA_MODEL || "llama3.2:3b";

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || "Erro ao consultar o Ollama."
      });
    }

    if (!data.message?.content) {
      return res.status(502).json({
        error: "O Ollama retornou uma resposta vazia."
      });
    }

    return res.status(200).json({
      message: {
        role: "assistant",
        content: data.message.content
      }
    });

  } catch (error) {
    console.error("Erro no servidor Mindly:", error);

    return res.status(500).json({
      error: "Não foi possível conectar ao Ollama. Verifique se ele está iniciado."
    });
  }
}
