import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircleHeart, BookHeart, ListTodo, Briefcase, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MOODS } from "@/lib/moods";
import { localData } from "@/api/localData";
import { toast } from "@/components/ui/use-toast";

const modules = [
  { path: "/diario", icon: BookHeart, title: "Diário de Humor", description: "Registre como você está e receba insights sobre seus padrões emocionais.", color: "bg-amber-100 text-amber-600" },
  { path: "/debriefing", icon: ListTodo, title: "Organizador", description: "Organize suas tarefas e reduza a sobrecarga com uma agenda realista.", color: "bg-blue-100 text-blue-600" },
  { path: "/acessibilidade", icon: Briefcase, title: "Acessibilidade Textual", description: "Ferramenta profissional: reescreva materiais em linguagem acessível.", color: "bg-purple-100 text-purple-600" },
];

export default function Home() {
  const navigate = useNavigate();
  const [recentMood, setRecentMood] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);

  useEffect(() => {
    loadRecentMood();
  }, []);

  const loadRecentMood = async () => {
    try {
      const entries = await localData.moods.list("-created_date", 1);
      if (entries.length > 0) setRecentMood(entries[0]);
    } catch (error) {
      toast({ title: "Erro ao carregar o último registro", description: error.message, variant: "destructive" });
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: "Bom dia", emoji: "☀️", message: "Que tal começar o dia cuidando um pouquinho de você?" };
    if (h < 18) return { text: "Boa tarde", emoji: "🌤️", message: "Como você está se sentindo neste momento?" };
    return { text: "Boa noite", emoji: "🌙", message: "Que tal desacelerar e cuidar da sua mente?" };
  };

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
  };

  const handleContinueToDiary = () => {
    if (!selectedMood) return;
    navigate("/diario", { state: { preselectedMood: selectedMood.value } });
  };

  const g = greeting();
  return (
    <div className="space-y-6 py-4">
      {/* Animated greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-blue-500 to-amber-400 p-6 sm:p-8"
      >
        <motion.div
          className="absolute top-4 right-6 text-3xl"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          {g.emoji}
        </motion.div>
        <motion.div
          className="absolute top-14 right-20 text-xl opacity-60"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 4, delay: 0.5 }}
        >
          ⭐
        </motion.div>
        <motion.div
          className="absolute bottom-6 right-10 text-2xl opacity-40"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, delay: 1 }}
        >
          ✨
        </motion.div>

        <div className="relative z-10 text-white">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-medium mb-1"
          >
            {g.text}! {g.emoji}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-heading font-bold mb-2 leading-tight"
          >
            {g.message}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/80 text-sm"
          >
            O Mindly está aqui para te ajudar no caminho do autoconhecimento.
          </motion.p>
        </div>
      </motion.div>

      {/* Quick mood picker — redirects to Diary to complete the entry */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-3xl p-6 shadow-sm"
      >
        <h2 className="text-xl font-heading font-bold mb-1">Como você está se sentindo?</h2>
        <p className="text-sm text-muted-foreground mb-4">Toque em como você está agora para registrar no diário</p>

        <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-4">
          {MOODS.map((mood) => (
            <motion.button
              key={mood.value}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleMoodSelect(mood)}
              aria-pressed={selectedMood?.value === mood.value}
              className={`min-w-0 flex flex-col items-center gap-1.5 p-1.5 sm:p-3 rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                selectedMood?.value === mood.value
                  ? "bg-primary/10 border-2 border-primary scale-105"
                  : "bg-muted/50 border-2 border-transparent hover:bg-muted"
              }`}
            >
              <motion.span
                animate={selectedMood?.value === mood.value ? { rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="text-2xl sm:text-3xl"
              >
                {mood.emoji}
              </motion.span>
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight break-words">{mood.label}</span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {selectedMood && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-4 mb-3">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                  <img
                    src={selectedMood.puppy}
                    alt="Cachorrinho fofo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-foreground flex-1">{selectedMood.message}</p>
              </div>
              <Button
                onClick={handleContinueToDiary}
                className="w-full h-12 rounded-2xl text-base font-medium"
              >
                <span className="flex items-center gap-2 justify-center">
                  Continuar no diário <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Last mood record */}
      {recentMood && recentMood.mood_label && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-muted-foreground">Último registro</p>
            <p className="font-medium">
              {MOODS.find((m) => m.value === recentMood.mood_label)?.emoji || "😐"}{" "}
              {MOODS.find((m) => m.value === recentMood.mood_label)?.label || recentMood.mood_label}
            </p>
          </div>
          <Link to="/diario" className="text-sm text-primary font-medium hover:underline">
            Ver diário →
          </Link>
        </motion.div>
      )}

      {/* Featured: Triagem Inteligente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Link
          to="/triagem"
          className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-400/20 rounded-full translate-y-12 -translate-x-12" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
              <MessageCircleHeart className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-heading font-bold mb-2">Triagem Inteligente</h3>
            <p className="text-white/80 text-sm mb-4 max-w-sm">
              Converse com nosso assistente e receba orientações personalizadas.
            </p>
            <span className="inline-flex items-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-full text-sm font-medium group-hover:gap-3 transition-all">
              Começar conversa <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>
      </motion.div>

      {/* Other modules */}
      <div className="grid sm:grid-cols-2 gap-4">
        {modules.map((mod, i) => (
          <motion.div
            key={mod.path}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + 0.1 * i }}
          >
            <Link
              to={mod.path}
              className="group block p-5 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-primary/20 transition-all duration-300 h-full"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${mod.color}`}>
                <mod.icon className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                {mod.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
            </Link>
          </motion.div>
        ))}
      </div>


      {/* Disclaimer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          ⚠️ Este aplicativo é uma ferramenta de autoconhecimento e não substitui acompanhamento profissional. Em caso de emergência, ligue 188 (CVV).
        </p>
      </div>
    </div>
  );
}
