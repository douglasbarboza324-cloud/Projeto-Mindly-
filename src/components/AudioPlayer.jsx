import React, { useEffect, useRef, useState } from "react";
import { getAudio } from "@/api/localFiles";
import { Loader2, Play } from "lucide-react";

export default function AudioPlayer({ fileUri, className }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const objectUrlRef = useRef(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const handleLoad = async () => {
    if (audioUrl || loading) return;
    setLoading(true);
    setError("");

    try {
      const blob = await getAudio(fileUri);
      if (!blob) throw new Error("Este áudio não está salvo neste navegador.");
      objectUrlRef.current = URL.createObjectURL(blob);
      setAudioUrl(objectUrlRef.current);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  if (!fileUri) return null;
  if (error) return <p className="text-xs text-muted-foreground italic">{error}</p>;

  if (!audioUrl) {
    return (
      <button
        onClick={handleLoad}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
        {loading ? "Carregando áudio..." : "Ouvir áudio"}
      </button>
    );
  }

  return <audio src={audioUrl} controls className={`w-full h-8 ${className || ""}`} />;
}
