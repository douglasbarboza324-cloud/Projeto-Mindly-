import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, MessageCircleHeart, BookHeart, ListTodo, Briefcase, X, ArrowRight, Heart } from "lucide-react";

const ONBOARDING_KEY = "mindly_onboarding_done";

export function shouldShowOnboarding() {
  try {
    return !localStorage.getItem(ONBOARDING_KEY);
  } catch {
    return false;
  }
}

const screens = [
  {
    icon: Heart,
    color: "text-rose-500 bg-rose-100 dark:bg-rose-950/40",
    title: "Bem-vindo ao Mindly",
    description: "Sua jornada de bem-estar e autoconhecimento começa aqui.",
    items: [
      { icon: Home, title: "Início", text: "Saudação personalizada e registro rápido de humor que te leva ao diário." },
      { icon: MessageCircleHeart, title: "Triagem", text: "Converse com nosso assistente acolhedor e receba orientações." },
    ],
  },
  {
    icon: BookHeart,
    color: "text-amber-500 bg-amber-100 dark:bg-amber-950/40",
    title: "Autoconhecimento",
    description: "Acompanhe seus padrões e organize sua rotina.",
    items: [
      { icon: BookHeart, title: "Diário de Humor", text: "Registre seu dia, sono e tempo de tela. A IA analisa seus padrões emocionais." },
      { icon: ListTodo, title: "Organizador", text: "Organize tarefas e gere uma agenda realista para o dia seguinte." },
    ],
  },
  {
    icon: Briefcase,
    color: "text-purple-500 bg-purple-100 dark:bg-purple-950/40",
    title: "Ferramentas Profissionais",
    description: "Área dedicada a profissionais da psicologia.",
    items: [
      { icon: Briefcase, title: "Acessibilidade Textual", text: "Reescreva materiais de apoio em linguagem acessível para diferentes públicos." },
    ],
  },
];

export default function Onboarding({ onClose }) {
  const [step, setStep] = useState(0);
  const current = screens[step];
  const isLast = step === screens.length - 1;

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
    onClose();
  };

  const handleNext = () => {
    if (isLast) finish();
    else setStep(step + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full"
      >
        <button
          onClick={finish}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${current.color}`}>
            <current.icon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-heading font-bold">{current.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
        </div>

        <div className="space-y-3 mb-6">
          {current.items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/50"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {screens.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-primary" : "bg-muted-foreground/30"}`}
            />
          ))}
        </div>

        <Button onClick={handleNext} className="w-full h-12 rounded-2xl">
          {isLast ? "Começar a usar" : (
            <span className="flex items-center gap-2">
              Próximo <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </motion.div>
    </div>
  );
}