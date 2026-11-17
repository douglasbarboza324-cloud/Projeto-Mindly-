
import express from "express";

const app = express();
const PORT = 3001;

app.use(express.json({ limit: "10mb" }));

// Rota de teste
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "API do Mindly funcionando!"
  });
});

// Rota principal do chat
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, messages, format } = req.body;

    const chatMessages = messages || [
      { role: "user", content: prompt }
    ];

    if (!chatMessages || !chatMessages.length) {
      return res.status(400).json({
        error: "Nenhuma mensagem foi enviada."
      });
    }

    const ollamaResponse = await fetch(
      "http://127.0.0.1:11434/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3.2:3b",
          messages: chatMessages,
          stream: false,
          ...(format ? { format } : {})
        })
      }
    );

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();

      return res.status(ollamaResponse.status).json({
        error: "Erro ao consultar o Ollama.",
        details: errorText
      });
    }

    const data = await ollamaResponse.json();

    res.json({
      ...data,
      content: data.message?.content || ""
    });

  } catch (error) {
    console.error("Erro na API:", error);

    res.status(500).json({
      error: "Não foi possível conectar ao Ollama.",
      details: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, "127.0.0.1", () => {
  console.log("--------------------------------");
  console.log("MINDLY API INICIADA!");
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log("Ollama: http://127.0.0.1:11434");
  console.log("--------------------------------");
});
