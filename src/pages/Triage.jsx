import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, AlertTriangle, FileText, RotateCcw, Mic, MicOff, Volume2, VolumeX, Headphones, X, Copy, Square, History, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { localData } from "@/api/localData";
import { generateWithLocalModel } from "@/api/localModel";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { toast } from "@/components/ui/use-toast";

const CRISIS_KEYWORDS = ["suicid", "me matar", "acabar com tudo", "não aguento mais", "quero morrer", "tirar minha vida"];

const SYSTEM_PROMPT = `Você é um assistente acolhedor de saúde mental preventiva chamado Mindly. 
Regras OBRIGATÓRIAS:
- NUNCA dê diagnósticos médicos.
- NUNCA prescreva medicamentos.
- Seja empático, caloroso e respeitoso.
- Use linguagem simples e acessível.
- Faça perguntas abertas para entender o contexto do usuário.
- Quando identificar sinais de alerta (burnout, ansiedade crônica, depressão), mencione gentilmente e sugira buscar um profissional.
- Sugira encaminhamentos quando apropriado: psicólogo, psiquiatra, CAPS, UBS, ou CVV (188).
- Sempre lembre que você é uma ferramenta de apoio e autoconhecimento, não substitui profissionais.
- Responda em português brasileiro.
- Mantenha respostas concisas (máximo 3 parágrafos).`;

const PERSONALITIES = [
  { id: "natural", name: "Mindly Natural", prompt: "Converse de forma natural e humana, com linguagem simples e clara, sem soar mecânico." },
  { id: "organized", name: "Mindly Organizada", prompt: "Organize a resposta em uma sequência lógica. Separe ideias em parágrafos e use pontuação correta." },
  { id: "objective", name: "Mindly Objetiva", prompt: "Responda de forma direta e breve, priorizando a informação essencial." },
  { id: "welcoming", name: "Mindly Acolhedora", prompt: "Use um tom respeitoso, empático e tranquilo, sem presumir sentimentos." },
  { id: "professional", name: "Mindly Profissional", prompt: "Use linguagem formal, precisa e bem estruturada, com explicações completas." },
  { id: "didactic", name: "Mindly Didática", prompt: "Explique em etapas quando ajudar, defina termos difíceis e inclua exemplos pertinentes." },
];
const MAX_CONTEXT_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_CHARS = 25000;

function getRecentContext(messages) {
  const recent = [];
  let totalChars = 0;
  for (const message of [...messages].reverse()) {
    const content = message.content || "";
    if (recent.length && totalChars + content.length > MAX_CONTEXT_CHARS) break;
    recent.push(message);
    totalChars += content.length;
    if (recent.length >= MAX_CONTEXT_MESSAGES) break;
  }
  return recent.reverse();
}

function getUserFacingMessage(message) {
  if (message.role !== "assistant") return message.content;
  if (/^(n[aã]o foi poss[ií]vel obter resposta da ia|n[aã]o foi poss[ií]vel conectar [aà] api|a rota \/api\/chat|a api (do mindly|de ia)|o provedor de ia)/i.test(message.content || "")) {
    return "Não consegui responder naquela tentativa. Você pode tentar novamente.";
  }
  return (message.content || "").replace(/\s*Para respostas com IA,[^.]*API[^.]*provedor configurado\.?/i, "");
}

function normalizeReport(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid report");
  const resumo = typeof value.resumo === "string" ? value.resumo.trim() : "";
  if (!resumo) throw new Error("Missing report summary");
  const toStringList = (items) => Array.isArray(items)
    ? items.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 8)
    : [];
  const acceptedLevels = ["baixo", "moderado", "alto", "critico"];
  const nivel = typeof value.nivel_atencao === "string" ? value.nivel_atencao.trim().toLowerCase() : "";
  return {
    resumo,
    sinais_observados: toStringList(value.sinais_observados),
    nivel_atencao: acceptedLevels.includes(nivel) ? nivel : "",
    sugestoes: toStringList(value.sugestoes),
    disclaimer: typeof value.disclaimer === "string" && value.disclaimer.trim()
      ? value.disclaimer.trim()
      : "Este relatório não constitui diagnóstico médico. Consulte um profissional de saúde.",
  };
}

export default function Triage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showCrisis, setShowCrisis] = useState(false);
  const [report, setReport] = useState(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [personality, setPersonality] = useState(() => window.localStorage.getItem("mindly:chat-personality") || "natural");
  const [sessions, setSessions] = useState([]);
  const [copiedMessage, setCopiedMessage] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef(null);
  const chatScrollRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const sendingRef = useRef(false);
  const abortRef = useRef(null);

  const { isListening, isSpeaking, voiceSupported, ttsSupported, voiceError, voices, selectedVoiceName, previewVoice, startListening, stopListening, speak, stopSpeaking } = useVoiceChat({
    onTranscript: (text) => {
      setInput(text);
      handleSendVoice(text);
    },
  });

  useEffect(() => {
    startSession();
    refreshSessions();
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const startSession = async (persist = true) => {
    abortRef.current?.abort();
    sendingRef.current = false;
    setLoading(false);
    const welcome = {
      role: "assistant",
      content: "Olá! 💚 Sou o assistente do Mindly. Estou aqui para te ouvir. Como você está se sentindo hoje? Esta conversa fica salva neste navegador.",
      timestamp: new Date().toISOString(),
    };
    setMessages([welcome]);
    setSessionId(null);
    if (autoSpeak) speak(welcome.content);
    setReport(null);
    setShowCrisis(false);
    if (!persist) return;
    try {
      const session = await localData.triageSessions.create({
        messages: [welcome],
        status: "active",
        personality,
      });
      setSessionId(session.id);
      refreshSessions();
    } catch {
      toast({ title: "Conversa não salva", description: "Não foi possível salvar esta conversa neste navegador.", variant: "destructive" });
    }
  };

  const refreshSessions = () => {
    try {
      setSessions(localData.triageSessions.list("-updated_date", 30));
    } catch {
      toast({ title: "Histórico indisponível", description: "Não foi possível carregar suas conversas agora.", variant: "destructive" });
    }
  };

  const deleteSession = (id) => {
    if (!window.confirm("Apagar esta conversa? Esta ação não pode ser desfeita.")) return;
    try {
      localData.triageSessions.delete(id);
      setSessions((current) => current.filter((session) => session.id !== id));
      if (sessionId === id) startSession(false);
    } catch {
      toast({ title: "Não foi possível apagar a conversa", description: "Tente novamente em instantes.", variant: "destructive" });
    }
  };

  const clearHistory = () => {
    if (!window.confirm("Apagar todas as conversas? Esta ação não pode ser desfeita.")) return;
    try {
      abortRef.current?.abort();
      localData.triageSessions.clear();
      setSessions([]);
      setHistoryOpen(false);
      startSession(false);
    } catch {
      toast({ title: "Não foi possível limpar o histórico", description: "Tente novamente em instantes.", variant: "destructive" });
    }
  };

  const openSession = (id) => {
    const session = sessions.find((item) => item.id === id);
    if (!session?.messages?.length) return;
    abortRef.current?.abort();
    sendingRef.current = false;
    setLoading(false);
    setSessionId(session.id);
    setMessages(session.messages);
    setPersonality(session.personality || "natural");
    window.localStorage.setItem("mindly:chat-personality", session.personality || "natural");
    setReport(session.report || (session.report_summary ? normalizeReport({ resumo: session.report_summary }) : null));
    setShowCrisis(session.messages.some((item) => item.role === "user" && checkCrisis(item.content)));
  };

  const selectPersonality = (value) => {
    setPersonality(value);
    window.localStorage.setItem("mindly:chat-personality", value);
    if (sessionId) {
      try {
        localData.triageSessions.update(sessionId, { personality: value });
        refreshSessions();
      } catch {
        toast({ title: "Não foi possível salvar o estilo", description: "Tente novamente em instantes.", variant: "destructive" });
      }
    }
  };

  const checkCrisis = (text) => {
    const lower = text.toLowerCase();
    return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
  };

  const handleSendVoice = (voiceText) => handleSendText(voiceText);

  const handleSendText = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length > MAX_MESSAGE_LENGTH || sendingRef.current) return;
    sendingRef.current = true;
    const userMsg = { role: "user", content: trimmedText, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    let activeSessionId = sessionId;
    try {
      if (activeSessionId) localData.triageSessions.update(activeSessionId, { messages: newMessages, personality });
      else {
        const session = localData.triageSessions.create({ messages: newMessages, status: "active", personality });
        activeSessionId = session.id;
        setSessionId(activeSessionId);
      }
      refreshSessions();
    } catch {
      toast({ title: "Conversa não salva", description: "Não foi possível salvar esta conversa neste navegador.", variant: "destructive" });
    }

    if (checkCrisis(userMsg.content)) {
      setShowCrisis(true);
      const crisisMsg = {
        role: "assistant",
        content: "Percebo que você está passando por um momento muito difícil. Sua vida é valiosa. Por favor, entre em contato agora com o CVV ligando para 188 (24h, gratuito). Você também pode acessar www.cvv.org.br para atendimento por chat. Estou aqui por você. 💚",
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...newMessages, crisisMsg];
      setMessages(updatedMessages);
      if (activeSessionId) {
        try { localData.triageSessions.update(activeSessionId, { messages: updatedMessages }); refreshSessions(); } catch {}
      }
      if (autoSpeak) speak(crisisMsg.content);
      sendingRef.current = false;
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const activePersonality = PERSONALITIES.find((item) => item.id === personality) || PERSONALITIES[0];
      const contextMessages = getRecentContext(newMessages);
      const result = await generateWithLocalModel({
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nEstilo de comunicação escolhido: ${activePersonality.name}. ${activePersonality.prompt}\n\nRespeite ortografia e gramática, não repita informações, responda ao que foi perguntado e conclua a resposta.\n\nAo final, adicione uma análise em JSON em uma nova linha, precedida por "---ANALYSIS---":\n{"signals": ["lista de sinais identificados"], "risk_level": "baixo|moderado|alto|critico", "referrals": ["sugestões de encaminhamento se aplicável"]}`,
          },
          ...contextMessages.map(({ role, content }) => ({ role, content })),
        ],
        signal: controller.signal,
      });

      let responseText = result;
      let analysis = null;
      if (typeof result === "string" && result.includes("---ANALYSIS---")) {
        const parts = result.split("---ANALYSIS---");
        responseText = parts[0].trim();
        try { analysis = JSON.parse(parts[1].trim()); } catch {}
      }

      const assistantMsg = { role: "assistant", content: responseText, timestamp: new Date().toISOString() };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);
      if (autoSpeak) speak(responseText);
      if (activeSessionId) {
        const updateData = { messages: updatedMessages };
        if (analysis) {
          updateData.detected_signals = analysis.signals || [];
          updateData.risk_level = analysis.risk_level || "baixo";
          updateData.referral_suggestions = analysis.referrals || [];
        }
        localData.triageSessions.update(activeSessionId, updateData);
        refreshSessions();
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      const errMsg = { role: "assistant", content: "Não consegui responder agora. Tente novamente em alguns instantes.", timestamp: new Date().toISOString() };
      const updatedMessages = [...newMessages, errMsg];
      setMessages(updatedMessages);
      if (activeSessionId) {
        try { localData.triageSessions.update(activeSessionId, { messages: updatedMessages }); refreshSessions(); } catch {}
      }
      if (autoSpeak) speak(errMsg.content);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const handleSend = () => handleSendText(input);
  const stopResponse = () => abortRef.current?.abort();

  const copyResponse = async (content, index) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(index);
      window.setTimeout(() => setCopiedMessage(null), 1500);
    } catch {
      toast({ title: "Não foi possível copiar", description: "Verifique a permissão de área de transferência do navegador." });
    }
  };
  const generateReport = async () => {
    if (loading || !messages.some((message) => message.role === "user")) return;
    setLoading(true);
    try {
      const reportMessages = getRecentContext(messages);
      const result = await generateWithLocalModel({
        messages: [
          {
            role: "system",
            content: "Analise a conversa de triagem de saúde mental e retorne somente um objeto JSON válido com os campos resumo (string), sinais_observados (lista de strings), nivel_atencao (baixo, moderado, alto ou critico), sugestoes (lista de strings) e disclaimer (string). Use português brasileiro. Resuma apenas o que aparece na conversa, não invente informações e não forneça diagnóstico médico. Se não houver sinais ou sugestões, use listas vazias.",
          },
          ...reportMessages.map(({ role, content }) => ({ role, content })),
        ],
        responseSchema: {
          type: "object",
          additionalProperties: false,
          required: ["resumo", "sinais_observados", "nivel_atencao", "sugestoes", "disclaimer"],
          properties: {
            resumo: { type: "string" },
            sinais_observados: { type: "array", items: { type: "string" } },
            nivel_atencao: { type: "string", enum: ["baixo", "moderado", "alto", "critico"] },
            sugestoes: { type: "array", items: { type: "string" } },
            disclaimer: { type: "string" },
          },
        },
      });
      const normalizedReport = normalizeReport(result);
      setReport(normalizedReport);
      if (sessionId) {
        try {
          localData.triageSessions.update(sessionId, {
            status: "completed",
            report: normalizedReport,
            report_summary: normalizedReport.resumo,
          });
          refreshSessions();
        } catch {
          toast({ title: "Relatório gerado", description: "O relatório está pronto, mas não foi possível salvá-lo no histórico.", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Não foi possível gerar o relatório", description: "Tente novamente em alguns instantes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold">Triagem Inteligente</h2>
          <p className="text-sm text-muted-foreground">Converse sem julgamentos e compartilhe o que está sentindo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Estilo</span>
            <select value={personality} onChange={(event) => selectPersonality(event.target.value)} className="min-h-10 max-w-[190px] rounded-xl border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" aria-label="Estilo de comunicação do Mindly">
              {PERSONALITIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen}>
            <History className="mr-1.5 h-4 w-4" /> Histórico ({sessions.length})
          </Button>
          {voiceSupported && (
            <Button
              variant={voiceMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (voiceMode) {
                  setVoiceMode(false);
                  stopSpeaking();
                } else {
                  setVoiceMode(true);
                  if (ttsSupported) setAutoSpeak(true);
                }
              }}
            >
              <Headphones className="w-4 h-4 mr-1.5" />
              {voiceMode ? "Sair da voz" : "Modo voz"}
            </Button>
          )}
          {messages.some((message) => message.role === "user") && (
            <Button variant="outline" size="sm" onClick={generateReport} disabled={loading}>
              <FileText className="w-4 h-4 mr-1.5" />
              Relatório
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={startSession}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Nova conversa
          </Button>
        </div>
      </div>

      {historyOpen && <section className="rounded-2xl border bg-card p-3 sm:p-4" aria-label="Histórico de conversas">
        <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">Suas conversas</h3><Button type="button" variant="outline" size="sm" onClick={clearHistory} disabled={!sessions.length}><Trash2 className="mr-1.5 h-4 w-4" />Limpar histórico</Button></div>
        {sessions.length ? <ul className="max-h-56 space-y-1 overflow-y-auto">{sessions.map((session) => {
          const firstUserMessage = session.messages?.find((item) => item.role === "user")?.content;
          const title = firstUserMessage?.slice(0, 64) || "Nova conversa";
          return <li key={session.id} className="flex items-center gap-2 rounded-xl border border-transparent hover:border-border">
            <button type="button" onClick={() => { openSession(session.id); setHistoryOpen(false); }} aria-current={session.id === sessionId ? "true" : undefined} className="min-h-11 min-w-0 flex-1 truncate rounded-lg px-3 text-left text-sm hover:bg-muted" title={title}>{title}</button>
            <Button type="button" variant="ghost" size="icon" onClick={() => deleteSession(session.id)} aria-label={`Apagar conversa: ${title}`} title="Apagar conversa"><Trash2 className="h-4 w-4" /></Button>
          </li>;
        })}</ul> : <p className="py-3 text-sm text-muted-foreground">Nenhuma conversa salva.</p>}
      </section>}

      {/* Crisis alert */}
      {showCrisis && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">Atenção — Suporte imediato</p>
            <p className="text-sm text-red-600 mt-1">
              Se você ou alguém está em crise, ligue agora para o <strong>CVV: 188</strong> (24h, gratuito).
            </p>
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-xl p-5 space-y-3"
        >
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Relatório da Conversa
          </h3>
          <p className="text-sm text-muted-foreground">{report.resumo}</p>
          {report.nivel_atencao && <p className="text-xs"><span className="font-medium text-muted-foreground">Nível de atenção: </span><span className="capitalize">{report.nivel_atencao}</span></p>}
          {report.sinais_observados?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Sinais observados:</p>
              <div className="flex flex-wrap gap-1.5">
                {report.sinais_observados.map((s, i) => (
                  <span key={i} className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
          {report.sugestoes?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Sugestões:</p>
              <ul className="text-sm space-y-1">
                {report.sugestoes.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground italic mt-2">
            {report.disclaimer || "Este relatório não constitui diagnóstico médico. Consulte um profissional de saúde."}
          </p>
        </motion.div>
      )}

      {/* Chat */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div
          ref={chatScrollRef}
          role="log"
          aria-label="Mensagens da conversa"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={loading}
          onScroll={() => {
            const element = chatScrollRef.current;
            if (element) shouldAutoScrollRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
          }}
          className="h-[min(58dvh,560px)] min-h-[240px] overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4"
        >
          <AnimatePresence>
            {messages.map((msg, i) => (
              (() => {
                const displayedContent = getUserFacingMessage(msg);
                return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-primary/10" : "bg-emerald-100"
                }`}>
                  {msg.role === "user" ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className={`max-w-[88%] min-w-0 break-words px-4 py-3 rounded-2xl text-sm leading-relaxed sm:max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-md"
                    : "bg-muted rounded-tl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="chat-markdown max-w-none break-words text-foreground">
                      <ReactMarkdown>{displayedContent}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                  {msg.role === "assistant" && ttsSupported && (
                    <button
                      type="button"
                      onClick={() => isSpeaking ? stopSpeaking() : speak(displayedContent)}
                      aria-label={isSpeaking ? "Parar leitura da resposta" : "Ouvir resposta"}
                      className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      {isSpeaking ? "Parar leitura" : "Ouvir resposta"}
                    </button>
                  )}
                  {msg.role === "assistant" && (
                    <button type="button" onClick={() => copyResponse(displayedContent, i)} aria-label="Copiar resposta" className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <Copy className="h-4 w-4" />
                      {copiedMessage === i ? "Copiado" : "Copiar"}
                    </button>
                  )}
                </div>
              </motion.div>
                );
              })()
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-md">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="border-t p-3 flex gap-2 items-center">
          {voiceSupported && (
            <Button
              onClick={isListening ? stopListening : startListening}
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              className="rounded-xl h-12 w-12 shrink-0"
              aria-label={isListening ? "Parar gravação" : "Falar"}
              disabled={loading}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          )}
          <input
            aria-label="Mensagem para o Mindly"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={isListening ? "Ouvindo..." : "Conte como você está se sentindo..."}
            maxLength={MAX_MESSAGE_LENGTH}
            className="min-w-0 flex-1 bg-muted/50 rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={loading}
          />
          {ttsSupported && (
            <Button
              onClick={() => {
                if (autoSpeak) { stopSpeaking(); setAutoSpeak(false); }
                else setAutoSpeak(true);
              }}
              variant={autoSpeak ? "default" : "outline"}
              size="icon"
              className="rounded-xl h-12 w-12 shrink-0"
              aria-label={autoSpeak ? "Desativar leitura automática" : "Ativar leitura automática"}
              title={autoSpeak ? "Desativar leitura automática" : "Ativar leitura automática"}
            >
              {autoSpeak ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="sr-only">{autoSpeak ? "Desativar leitura automática" : "Ativar leitura automática"}</span>
            </Button>
          )}
          {loading && abortRef.current && (
            <Button onClick={stopResponse} variant="destructive" size="icon" className="rounded-xl h-12 w-12 shrink-0" aria-label="Interromper resposta">
              <Square className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={handleSend} disabled={!input.trim() || loading} size="icon" className="rounded-xl h-12 w-12 shrink-0">
            <Send className="w-5 h-5" />
          </Button>
        </div>
        {voiceError && (
          <p role="status" className="border-t px-4 py-2 text-sm text-destructive">
            {voiceError}
          </p>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Este assistente não fornece diagnósticos. A conversa fica salva neste navegador. Em emergências, ligue 188 (CVV).
      </p>

      {/* Voice mode overlay */}
      <AnimatePresence>
        {voiceMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-sky-50 via-background to-amber-50 flex flex-col items-center justify-between p-6"
          >
            <div className="w-full flex justify-between items-center pt-2">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                <span className="font-heading font-bold text-lg">Mindly Voz</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setVoiceMode(false); stopSpeaking(); }}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex flex-col items-center gap-6">
              <motion.div
                animate={isListening ? { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] } : isSpeaking ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={isListening || isSpeaking ? { repeat: Infinity, duration: 1.5 } : { duration: 0.3 }}
                className={`w-48 h-48 rounded-full flex items-center justify-center ${
                  isListening
                    ? "bg-red-100"
                    : isSpeaking
                    ? "bg-emerald-100"
                    : "bg-primary/10"
                }`}
              >
                <motion.div
                  animate={isListening ? { scale: 1.3 } : isSpeaking ? { scale: 1.15 } : { scale: 1 }}
                  className={`w-32 h-32 rounded-full flex items-center justify-center ${
                    isListening
                      ? "bg-red-500"
                      : isSpeaking
                      ? "bg-emerald-500"
                      : "bg-primary"
                    }`}
                >
                  {isListening ? (
                    <MicOff className="w-12 h-12 text-white" />
                  ) : isSpeaking ? (
                    <Volume2 className="w-12 h-12 text-white" />
                  ) : (
                    <Bot className="w-12 h-12 text-white" />
                  )}
                </motion.div>
              </motion.div>

              <div className="text-center max-w-sm">
                {voiceError ? (
                  <p role="status" className="text-sm text-destructive">{voiceError}</p>
                ) : loading ? (
                  <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <span className="ml-2">Pensando...</span>
                  </p>
                ) : isListening ? (
                  <p className="font-heading font-semibold text-red-600">🎤 Ouvindo... fale agora</p>
                ) : isSpeaking ? (
                  <p className="font-heading font-semibold text-emerald-600">🔊 Falando com você...</p>
                ) : (
                  <p className="text-muted-foreground text-sm">Toque no microfone e fale comigo</p>
                )}
              </div>

              {/* Last message preview */}
              {messages.length > 0 && !isSpeaking && !isListening && !loading && (
                <div className="bg-card border rounded-2xl p-4 max-w-sm text-sm text-muted-foreground max-h-32 overflow-y-auto">
                  {messages[messages.length - 1]?.content}
                </div>
              )}
            </div>

            <div className="w-full max-w-sm flex flex-col gap-3 pb-4">
              {ttsSupported && (
                <>
                  <Button
                    variant={autoSpeak ? "default" : "outline"}
                    className="w-full h-11 rounded-2xl"
                    onClick={() => {
                      if (autoSpeak) { stopSpeaking(); setAutoSpeak(false); }
                      else setAutoSpeak(true);
                    }}
                  >
                    {autoSpeak ? <Volume2 className="w-5 h-5 mr-2" /> : <VolumeX className="w-5 h-5 mr-2" />}
                    {autoSpeak ? "Voz ativada" : "Ativar voz automática"}
                  </Button>
                  {voices.length > 0 ? (
                    <div className="space-y-2">
                      <label htmlFor="chat-voice-select" className="text-sm font-medium">Voz do chat</label>
                      <select id="chat-voice-select" value={selectedVoiceName} onChange={(event) => previewVoice(event.target.value)}
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                        <option value="">Automática (voz mais natural disponível)</option>
                        {voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} · {voice.lang}{voice.localService ? " · dispositivo" : " · online"}</option>)}
                      </select>
                      <p className="text-xs text-muted-foreground">As vozes disponíveis variam conforme o navegador e as vozes instaladas no dispositivo.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma voz em português foi encontrada neste navegador. Instale uma voz em português nas configurações do dispositivo.</p>
                  )}
                </>
              )}
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={loading}
                className="w-full h-14 rounded-2xl text-base font-medium"
                variant={isListening ? "destructive" : "default"}
              >
                {isListening ? (
                  <><MicOff className="w-5 h-5 mr-2" /> Parar e enviar</>
                ) : (
                  <><Mic className="w-5 h-5 mr-2" /> Falar com o Mindly</>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
