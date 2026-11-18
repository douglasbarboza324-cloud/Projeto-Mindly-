import { useEffect, useState } from "react";
import { supabase } from "@/api/profile";
import { toast } from "@/components/ui/use-toast";

const reactions = ["💚", "🙂", "😌", "✨", "🤗"];

export default function AppReactions({ contentId = "home" }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadReaction() {
      if (!supabase) return;
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          if (active) setSelected(null);
          return;
        }
        const { data, error } = await supabase.from("reactions").select("emoji").eq("user_id", user.id).eq("content_id", contentId).maybeSingle();
        if (error) throw error;
        if (active) setSelected(data?.emoji || null);
      } catch {
        if (active) toast({ title: "Falha ao carregar reação", description: "Verifique sua conexão e tente novamente.", variant: "destructive" });
      }
    }
    loadReaction();
    /*
      .then(({ data, error }) => {
        if (error) toast({ title: "Não foi possível carregar sua reação", description: error.message, variant: "destructive" });
        else setSelected(data?.emoji || null);
      });
    */
    return () => { active = false; };
  }, [contentId]);

  async function choose(emoji) {
    if (!supabase || saving) return;
    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Entre na sua conta para registrar uma reação.");
      const { error } = await supabase.from("reactions").upsert({ user_id: user.id, content_id: contentId, emoji, updated_at: new Date().toISOString() }, { onConflict: "user_id,content_id" });
      if (error) throw error;
      setSelected(emoji);
    } catch (error) {
      toast({ title: "Não foi possível salvar sua reação", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  return <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-label="Reação ao Mindly">
    <h2 className="text-xl font-heading font-bold">Como você está se sentindo?</h2>
    <p className="mt-1 text-sm text-muted-foreground">Escolha uma reação. Você pode alterá-la quando quiser.</p>
    <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label="Escolher reação">
      {reactions.map((emoji) => <button key={emoji} type="button" disabled={saving || !supabase} onClick={() => choose(emoji)} aria-label={`Reagir com ${emoji}`} aria-pressed={selected === emoji}
        className={`flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${selected === emoji ? "border-primary bg-primary/10" : "border-transparent bg-muted/50 hover:bg-muted"}`}>{emoji}</button>)}
    </div>
    {!supabase && <p className="mt-3 text-sm text-destructive">Configure o Supabase para habilitar reações salvas.</p>}
  </section>;
}
