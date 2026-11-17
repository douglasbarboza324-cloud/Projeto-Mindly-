import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localData } from "@/api/localData";
import { toast } from "@/components/ui/use-toast";

const ratings = [
  { value: 1, emoji: "😞", label: "Muito ruim" },
  { value: 2, emoji: "😕", label: "Ruim" },
  { value: 3, emoji: "😐", label: "Regular" },
  { value: 4, emoji: "🙂", label: "Bom" },
  { value: 5, emoji: "😍", label: "Excelente" },
];

export default function AppFeedback() {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!rating || saving) return;

    setSaving(true);
    try {
      localData.feedback.create({ rating, comment: comment.trim() });
      setRating(null);
      setComment("");
      setStatus("Obrigado! Seu feedback foi salvo neste navegador.");
    } catch (error) {
      toast({
        title: "Não foi possível salvar o feedback",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="app-feedback-title">
      <div className="mb-4">
        <h2 id="app-feedback-title" className="text-xl font-heading font-bold">Como está sendo usar o Mindly?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sua opinião ajuda a melhorar o app.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={saving} className="min-w-0">
          <legend className="mb-2 text-sm font-medium">Escolha uma reação</legend>
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {ratings.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={`${option.label}, nota ${option.value} de 5`}
                aria-pressed={rating === option.value}
                onClick={() => {
                  setRating(option.value);
                  setStatus("");
                }}
                className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl border-2 text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  rating === option.value
                    ? "border-primary bg-primary/10"
                    : "border-transparent bg-muted/50 hover:bg-muted"
                }`}
              >
                <span aria-hidden="true">{option.emoji}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="app-feedback-comment" className="text-sm font-medium">
            Quer contar mais? (opcional)
          </label>
          <textarea
            id="app-feedback-comment"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setStatus("");
            }}
            maxLength={500}
            rows={3}
            placeholder="Escreva uma sugestão ou conte o que funcionou bem..."
            className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-right text-xs text-muted-foreground">{comment.length}/500</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            O feedback fica salvo somente neste navegador; não é enviado à equipe.
          </p>
          <Button type="submit" disabled={!rating || saving} className="min-h-11 shrink-0 rounded-xl">
            <Send className="h-4 w-4" />
            {saving ? "Salvando..." : "Enviar feedback"}
          </Button>
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-emerald-700 dark:text-emerald-300">
          {status}
        </p>
      </form>
    </section>
  );
}
