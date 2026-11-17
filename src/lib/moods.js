const PUPPY_HAPPY = "/images/puppy-happy.png";
const PUPPY_SAD = "/images/puppy-sad.png";
const PUPPY_CALM = "/images/puppy-calm.png";

// Standardized mood scale: left (most negative) → right (most positive)
export const MOODS = [
  { value: "muito_mal", emoji: "😢", label: "Muito mal", message: "Você não está sozinho(a). Que tal conversar com alguém de confiança? 💙", puppy: PUPPY_SAD },
  { value: "mal", emoji: "😔", label: "Mal", message: "Sinto que você não está tão bem. Estou aqui com você. 💙", puppy: PUPPY_SAD },
  { value: "neutro", emoji: "😐", label: "Neutro", message: "Tudo bem se sentir assim. Que tal uma respiração profunda? 🌤️", puppy: PUPPY_CALM },
  { value: "bem", emoji: "🙂", label: "Bem", message: "Que ótimo que você está bem! Aproveite esse momento. 💛", puppy: PUPPY_HAPPY },
  { value: "muito_bem", emoji: "😊", label: "Muito bem", message: "Que bom! Continue cuidando desse momento. 💙", puppy: PUPPY_HAPPY },
];