const MOOD_SCORES = {
  muito_mal: 1,
  mal: 3,
  neutro: 5,
  bem: 7,
  muito_bem: 9,
};

export function analyzeMoodLocally({ mood, sleepHours, screenTime, text }) {
  const score = MOOD_SCORES[mood] ?? 5;
  const suggestions = [];

  if (sleepHours < 7) {
    suggestions.push("Se for possível, reserve um tempo para descansar e observe como isso afeta seu bem-estar.");
  }
  if (screenTime >= 8) {
    suggestions.push("Uma pausa breve das telas pode ajudar a criar um momento de descanso.");
  }
  if (text.trim()) {
    suggestions.push("Anotar o que foi importante no seu dia pode ajudar você a refletir sobre essa experiência.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Continue observando seus sentimentos no seu próprio ritmo.");
  }

  return {
    mood_score: score,
    analysis: `Este resumo foi calculado neste dispositivo, sem IA. Você registrou ${sleepHours}h de sono e ${screenTime}h de tela${mood ? `, além do humor "${mood.replaceAll("_", " ")}"` : ""}.`,
    suggestions,
    alerts: [],
    insight: "Os registros permanecem neste navegador; observe suas próprias tendências ao longo do tempo.",
  };
}
