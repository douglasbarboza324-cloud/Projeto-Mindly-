import { useState, useRef, useCallback, useEffect } from "react";

export function useVoiceChat({ lang = "pt-BR", onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voices, setVoices] = useState([]);

  const [selectedVoiceName, setSelectedVoiceName] = useState(() => {
    try {
      return window.localStorage.getItem("mindly:chat-voice") || "";
    } catch {
      return "";
    }
  });

  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);

  onTranscriptRef.current = onTranscript;

  const refreshVoices = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    const available = window.speechSynthesis
      .getVoices()
      .filter(v => v.lang?.toLowerCase().startsWith("pt"));

    setVoices(available);
  }, []);

  useEffect(() => {
    const SR = window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      window.msSpeechRecognition;

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

        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          setVoiceError("Permita o acesso ao microfone para usar a conversa por voz.");
        } else if (event.error === "no-speech") {
          setVoiceError("Nenhuma fala foi detectada. Tente novamente.");
        } else {
          setVoiceError("O reconhecimento de voz n\u00e3o est\u00e1 dispon\u00edvel agora.");
        }
      };

      recognitionRef.current = recognition;
    }

    if ("speechSynthesis" in window) {
      setTtsSupported(true);

      refreshVoices();

      window.speechSynthesis.addEventListener(
        "voiceschanged",
        refreshVoices
      );
    }

    return () => {
      window.speechSynthesis?.removeEventListener(
        "voiceschanged",
        refreshVoices
      );

      try {
        recognitionRef.current?.abort();
      } catch {}

      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, [lang, refreshVoices]);

  const selectVoice = useCallback((voiceName) => {
    setSelectedVoiceName(voiceName);

    try {
      window.localStorage.setItem("mindly:chat-voice", voiceName);
    } catch {}
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
      setVoiceError("N\u00e3o foi poss\u00edvel iniciar o microfone. Verifique a permiss\u00e3o e tente novamente.");
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}

    setIsListening(false);
  }, []);

  const speak = useCallback((text) => {
    if (!ttsSupported || !text) return;

    try {
      const synthesis = window.speechSynthesis;
      synthesis.cancel();

      const speechText = text
        .replace(/[*\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (!speechText) return;

      const utter = new SpeechSynthesisUtterance(speechText);
      utter.lang = lang;
      utter.pitch = 1;

      const availableVoices = synthesis.getVoices()
        .filter(v => v.lang?.toLowerCase().startsWith("pt"));

      const preferredVoice =
        availableVoices.find(v => v.name === selectedVoiceName) ||
        availableVoices.find(v =>
          v.lang?.toLowerCase() === "pt-br" &&
          /natural|neural|online|enhanced/i.test(v.name)
        ) ||
        availableVoices.find(v => v.lang?.toLowerCase() === "pt-br") ||
        availableVoices.find(v => /natural|neural|online|enhanced/i.test(v.name)) ||
        availableVoices[0];

      utter.rate = 1;
      if (preferredVoice) {
        utter.voice = preferredVoice;
        utter.lang = preferredVoice.lang || lang;
      }

      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);

      synthesis.speak(utter);
    } catch {
      setIsSpeaking(false);
    }
  }, [lang, selectedVoiceName, ttsSupported]);

  const previewVoice = useCallback((voiceName) => {
    selectVoice(voiceName);

    const voice = window.speechSynthesis
      .getVoices()
      .find(item => item.name === voiceName);

    if (!voice) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      "Ol\u00e1! Esta \u00e9 a voz que vou usar para conversar com voc\u00ea."
    );

    utterance.lang = voice.lang || lang;
    utterance.voice = voice;
    utterance.rate = 1;

    window.speechSynthesis.speak(utterance);
  }, [lang, selectVoice]);

  const stopSpeaking = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {}

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
