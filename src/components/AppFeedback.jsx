import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/api/profile";
import { Button } from "@/components/ui/button";

// Keep this order aligned with the emoji check constraint in the feedback migration.
const EMOJIS = [0x1f61e, 0x1f615, 0x1f610, 0x1f60a, 0x1f929];

export default function AppFeedback() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!supabase || !rating || saving) return;
    setSaving(true); setError(""); setStatus("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("Sessão indisponível");
      const { data: savedFeedback, error: insertError } = await supabase.from("feedback").insert({
        user_id: user.id,
        content_id: "mindly-app-review",
        rating,
        emoji: String.fromCodePoint(EMOJIS[rating - 1]),
        comment: comment.trim() || null,
      }).select("id").single();
      if (insertError) throw insertError;
      if (!savedFeedback?.id) throw new Error("O registro não foi confirmado.");
      setStatus("Obrigado por avaliar o Mindly. Sua avaliação foi enviada.");
      setRating(0); setComment("");
    } catch {
      setError("Não foi possível enviar sua avaliação agora. Tente novamente em instantes.");
    } finally { setSaving(false); }
  }

  return <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="app-feedback-title">
    <h2 id="app-feedback-title" className="text-xl font-heading font-bold">Avalie o Mindly</h2>
    <p className="mt-1 text-sm text-muted-foreground">Sua opinião ajuda a melhorar o aplicativo.</p>
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Nota de 1 a 5">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          return <button key={value} type="button" onClick={() => { setRating(value); setStatus(""); setError(""); }} aria-label={`${value} de 5 estrelas`} aria-pressed={rating === value} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Star className={`h-6 w-6 ${value <= rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
          </button>;
        })}
      </div>
      <label className="sr-only" htmlFor="app-feedback-comment">Comentário opcional</label>
      <textarea id="app-feedback-comment" value={comment} onChange={event => setComment(event.target.value)} maxLength={1000} rows={3} placeholder="Comentário opcional" className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-base" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {status && <p role="status" className="text-sm text-emerald-700">{status}</p>}
      {!supabase && <p role="alert" className="text-sm text-destructive">O serviço de avaliações está indisponível no momento.</p>}
      <Button type="submit" disabled={!supabase || !rating || saving} className="rounded-xl">{saving ? "Enviando..." : "Enviar avaliação"}</Button>
    </form>
  </section>;
}
