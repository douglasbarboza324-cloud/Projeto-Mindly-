import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Sparkles, Moon, Smartphone, TrendingUp, Wind, Loader2, Trash2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { localData } from "@/api/localData";
import { deleteAudio, saveAudio } from "@/api/localFiles";
import { analyzeMoodLocally } from "@/lib/moodAnalysis";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { MOODS } from "@/lib/moods";
import { useLocation } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import AudioPlayer from "@/components/AudioPlayer";

export default function MoodDiary() {
  const location = useLocation();
  const preselectedMood = location.state?.preselectedMood;
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [selectedMood, setSelectedMood] = useState(preselectedMood || null);
  const [sleepHours, setSleepHours] = useState([7]);
  const [screenTime, setScreenTime] = useState([4]);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioPreview, setAudioPreview] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const recordStartRef = useRef(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loadingEntries, setLoadingEntries] = useState(true);

  useEffect(() => {
    loadEntries();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      speechRecognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
      if (audioPreviewRef.current) URL.revokeObjectURL(audioPreviewRef.current);
    };
  }, []);

  const loadEntries = async () => {
    try {
      const data = await localData.moods.list("-created_date", 30);
      setEntries(data);
    } catch (error) {
      toast({ title: "Erro ao carregar registros", description: error.message, variant: "destructive" });
    } finally {
      setLoadingEntries(false);
    }
  };

  const startRecording = async () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    if (audioPreviewRef.current) {
      URL.revokeObjectURL(audioPreviewRef.current);
      audioPreviewRef.current = null;
      setAudioPreview(null);
    }
    if (audioUrl) {
      try {
        await deleteAudio(audioUrl);
      } catch (error) {
        toast({ title: "Áudio anterior não removido", description: error.message, variant: "destructive" });
      }
    }
    setAudioUrl(null);
    setRecordingDuration(0);
    // Clear any existing timer to prevent double-counting
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({ title: "Microfone não suportado", description: "Seu navegador não suporta gravação de áudio.", variant: "destructive" });
        return;
      }
      if (typeof MediaRecorder === "undefined") {
        throw new Error("Este navegador não oferece suporte à gravação de áudio.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.msSpeechRecognition;
      const recognition = SpeechRecognition ? new SpeechRecognition() : null;
      const startingText = text.trim();

      if (recognition) {
        recognition.lang = "pt-BR";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join(" ")
            .trim();
          setText([startingText, transcript].filter(Boolean).join(" "));
        };
        recognition.onerror = () => {
          toast({ title: "Transcrição indisponível", description: "O áudio será salvo; você também pode escrever o relato.", variant: "destructive" });
        };
        try {
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {
          toast({ title: "Transcrição indisponível", description: "O áudio será salvo; você também pode escrever o relato.", variant: "destructive" });
        }
      } else {
        toast({ title: "Transcrição não suportada", description: "O áudio será salvo e você pode escrever o relato manualmente." });
      }

      // Detect best supported MIME type for cross-browser/Android compatibility
      const mimeType = typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        const actualDuration = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000));
        setRecordingDuration(actualDuration);
        const actualType = recorder.mimeType || chunks[0]?.type || mimeType;
        const blob = new Blob(chunks, actualType ? { type: actualType } : undefined);
        const previewUrl = URL.createObjectURL(blob);
        audioPreviewRef.current = previewUrl;
        setAudioPreview(previewUrl);

        try {
          const uri = await saveAudio(blob);
          setAudioUrl(uri);
          toast({ title: "Áudio salvo neste dispositivo", description: "O áudio ficará disponível neste navegador." });
        } catch (error) {
          toast({ title: "Falha ao salvar áudio", description: error.message, variant: "destructive" });
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      recordStartRef.current = Date.now();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }, 1000);
    } catch (error) {
      speechRecognitionRef.current?.abort();
      speechRecognitionRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      toast({ title: "Não foi possível iniciar a gravação", description: error.message, variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  const speakAnalysis = async (text) => {
    if (!text || speaking) return;
    setVoiceLoading(true);
    try {
      if (!("speechSynthesis" in window)) {
        throw new Error("Este navegador não oferece leitura em voz alta.");
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.substring(0, 5000));
      utterance.lang = "pt-BR";
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      setSpeaking(false);
      toast({ title: "Voz indisponível", description: error.message, variant: "destructive" });
    } finally {
      setVoiceLoading(false);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !selectedMood && !audioUrl) return;
    setLoading(true);
    try {
      const today = moment().format("YYYY-MM-DD");
      const localResult = analyzeMoodLocally({
        mood: selectedMood,
        sleepHours: sleepHours[0],
        screenTime: screenTime[0],
        text,
      });
      const existing = entries.find((e) => e.entry_date === today);

      if (existing) {
        const updated = await localData.moods.update(existing.id, {
          text_content: text,
          audio_url: audioUrl || existing.audio_url,
          mood_score: localResult.mood_score,
          mood_label: selectedMood || "neutro",
          sleep_hours: sleepHours[0],
          screen_time_hours: screenTime[0],
          local_analysis: localResult.analysis,
          local_suggestions: localResult.suggestions,
          alerts: localResult.alerts,
        });
        if (audioUrl && existing.audio_url && existing.audio_url !== audioUrl) {
          await deleteAudio(existing.audio_url);
        }
        setAnalysis(localResult);
        setEntries((prev) => prev.map((e) => (e.id === existing.id ? updated : e)));
        toast({ title: "Registro salvo", description: "Reflexão calculada localmente, sem envio dos dados." });
        if (voiceEnabled && localResult.analysis) speakAnalysis(localResult.analysis);
      } else {
        const entry = await localData.moods.create({
          text_content: text,
          audio_url: audioUrl || undefined,
          mood_score: localResult.mood_score,
          mood_label: selectedMood || "neutro",
          sleep_hours: sleepHours[0],
          screen_time_hours: screenTime[0],
          local_analysis: localResult.analysis,
          local_suggestions: localResult.suggestions,
          alerts: localResult.alerts,
          entry_date: today,
        });
        setAnalysis(localResult);
        setEntries([entry, ...entries]);
        toast({ title: "Registro salvo", description: "Reflexão calculada localmente, sem envio dos dados." });
        if (voiceEnabled && localResult.analysis) speakAnalysis(localResult.analysis);
      }
      setText("");
      setSelectedMood(null);
      setAudioUrl(null);
      if (audioPreviewRef.current) {
        URL.revokeObjectURL(audioPreviewRef.current);
        audioPreviewRef.current = null;
        setAudioPreview(null);
      }
    } catch (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive", duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h2 className="text-2xl font-heading font-bold">Diário de Humor</h2>
        <p className="text-sm text-muted-foreground">Registre como você está — cada entrada ajuda a entender seus padrões.</p>
      </div>

      {/* New entry */}
      <div className="bg-card border rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-muted-foreground">Como você está agora?</h3>
          <button
            onClick={() => { if (voiceEnabled) { stopSpeaking(); setVoiceEnabled(false); } else setVoiceEnabled(true); }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
              voiceEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
            aria-label={voiceEnabled ? "Desativar leitura em voz alta" : "Ativar leitura em voz alta"}
          >
            {voiceLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : voiceEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            Voz local
          </button>
        </div>

        {/* Mood selector */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedMood(m.value)}
              aria-pressed={selectedMood === m.value}
              className={`min-w-0 flex flex-col items-center gap-1.5 p-1 sm:p-3 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                selectedMood === m.value
                  ? "bg-primary/10 border-2 border-primary scale-105"
                  : "bg-muted/50 border-2 border-transparent hover:bg-muted"
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight break-words">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Text area */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Conte sobre o seu dia... O que te marcou? Como se sentiu?"
            className="w-full h-28 bg-muted/30 rounded-xl p-4 text-base sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading}
            className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors disabled:opacity-50 ${
              recording ? "bg-red-100 text-red-500" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-label={recording ? "Parar gravação" : "Gravar áudio"}
          >
            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {/* Recording indicator */}
        <AnimatePresence>
          {recording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-2.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                Gravando... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio preview after recording */}
        {audioPreview && !recording && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
              <audio src={audioPreview} controls className="flex-1 h-9" />
              <button
                onClick={async () => {
                  URL.revokeObjectURL(audioPreview);
                  audioPreviewRef.current = null;
                  setAudioPreview(null);
                  if (audioUrl) {
                    try {
                      await deleteAudio(audioUrl);
                      setAudioUrl(null);
                    } catch (error) {
                      toast({ title: "Não foi possível remover o áudio", description: error.message, variant: "destructive" });
                    }
                  }
                }}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Remover áudio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Duração: {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}</p>
          </div>
        )}

        {/* Variables */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Moon className="w-4 h-4 text-blue-500" />
              Horas de sono: {sleepHours[0]}h
            </label>
            <Slider value={sleepHours} onValueChange={setSleepHours} min={0} max={14} step={0.5} />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Smartphone className="w-4 h-4 text-amber-500" />
              Tempo de tela: {screenTime[0]}h
            </label>
            <Slider value={screenTime} onValueChange={setScreenTime} min={0} max={16} step={0.5} />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading || (!text.trim() && !selectedMood && !audioUrl)} className="w-full h-11">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analisando localmente...
            </div>
          ) : (
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" />Registrar e analisar</span>
          )}
        </Button>
      </div>

      {/* Analysis result */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-gradient-to-br from-primary/5 to-transparent border rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Análise do seu registro
              </h3>
              <button
                onClick={() => (speaking ? stopSpeaking() : speakAnalysis(analysis.analysis))}
                disabled={voiceLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                aria-label={speaking ? "Parar voz" : "Ouvir análise"}
              >
                {voiceLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                {speaking ? "Parar" : "Ouvir"}
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{analysis.analysis}</p>

            {analysis.insight && (
              <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700">{analysis.insight}</p>
              </div>
            )}

            {analysis.suggestions?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Sugestões para você:</p>
                {analysis.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 bg-card rounded-lg p-3">
                    <Wind className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm">{s}</p>
                  </div>
                ))}
              </div>
            )}

            {analysis.alerts?.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-medium text-amber-700">Pontos de atenção:</p>
                {analysis.alerts.map((a, i) => (
                  <p key={i} className="text-sm text-amber-600">• {a}</p>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      <div>
        <h3 className="font-heading font-semibold mb-3">Seus registros</h3>
        {loadingEntries ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum registro ainda. Comece registrando como você está hoje!
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const moodInfo = MOODS.find((m) => m.value === entry.mood_label);
              return (
                <div key={entry.id} className="bg-card border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{moodInfo?.emoji || "😐"}</span>
                      <span className="text-sm font-medium">{moodInfo?.label || entry.mood_label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{moment(entry.entry_date).format("DD/MM/YYYY")}</span>
                  </div>
                  {entry.text_content && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.text_content}</p>
                  )}
                  {entry.audio_url && <AudioPlayer fileUri={entry.audio_url} />}
                  {entry.local_analysis && (
                    <p className="text-xs text-primary/80 italic">{entry.local_analysis}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}