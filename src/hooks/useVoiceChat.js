import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Hook para chat de voz usando Web Speech API do navegador.
 * - speechToText: reconhecimento de fala (input por voz)
 * - textToSpeech: síntese de fala (output por voz)
 */
export function useVoiceChat({ lang = "pt-BR", onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => window.localStorage.getItem("mindly:chat-voice") || "");
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition || window.msSpeechRecognition;
    if (SR) {
      setVoiceSupported(true);
      const recognition = new SR();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (e) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
        }
        transcriptRef.current = text;
      };
      recognition.onend = () => {
        setIsListening(false);
        if (onTranscriptRef.current && transcriptRef.current.trim()) {
          onTranscriptRef.current(transcriptRef.current.trim());
        }
        transcriptRef.current = "";
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setVoiceError("Permita o acesso ao microfone para usar a conversa por voz.");
        } else if (event.error === "no-speech") {
          setVoiceError("Nenhuma fala foi detectada. Tente novamente.");
        } else {
          setVoiceError("O reconhecimento de voz não está disponível agora.");
        }
      };
      recognitionRef.current = recognition;
    }
    if ("speechSynthesis" in window) {
      setTtsSupported(true);
      const refreshVoices = () => setVoices(window.speechSynthesis.getVoices().filter((voice) => voice.lang?.toLowerCase().startsWith("pt")));
      refreshVoices();
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
        try { recognitionRef.current?.abort(); } catch {}
        try { window.speechSynthesis?.cancel(); } catch {}
      };
    }
    return () => {
      try { recognitionRef.current?.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  const selectVoice = useCallback((voiceName) => {
    setSelectedVoiceName(voiceName);
    window.localStorage.setItem("mindly:chat-voice", voiceName);
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    transcriptRef.current = "";
    setVoiceError("");
    try {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      setVoiceError("Não foi possível iniciar o microfone. Verifique a permissão e tente novamente.");
    }
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  const speak = useCallback((text) => {
    if (!ttsSupported || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 1;
      utter.pitch = 1;
      const availableVoices = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("pt"));
      const preferredVoice = availableVoices.find((v) => v.name === selectedVoiceName)
        || availableVoices.find((v) => /natural|neural|online|enhanced/i.test(v.name))
        || availableVoices.find((v) => v.lang?.toLowerCase().startsWith("pt-br"))
        || availableVoices[0];
      if (preferredVoice) utter.voice = preferredVoice;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch {}
  }, [lang, selectedVoiceName, ttsSupported]);

  const previewVoice = useCallback((voiceName) => {
    selectVoice(voiceName);
    const voice = window.speechSynthesis.getVoices().find((item) => item.name === voiceName);
    if (!voice) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Olá! Esta é a voz que vou usar para conversar com você.");
    utterance.lang = voice.lang || lang;
    utterance.voice = voice;
    utterance.rate = 0.96;
    window.speechSynthesis.speak(utterance);
  }, [lang, selectVoice]);

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch {}
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    voiceSupported,
    ttsSupported,
    voiceError,
    voices,
    selectedVoiceName,
    selectVoice,
    previewVoice,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
