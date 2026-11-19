import { useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { getNameOnlyAccessErrorMessage, startNameOnlyAccess, supabase } from "@/api/profile";

export default function Login() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setError("");
    setSaving(true);
    try {
      await startNameOnlyAccess(name);
      navigate("/", { replace: true });
    } catch (authError) {
      setError(getNameOnlyAccessErrorMessage(authError));
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }

  return <AuthLayout icon={UserRound} title="Entrar no Mindly" subtitle="Comece informando apenas seu nome.">
    {!supabase && <p role="alert" className="mb-4 text-sm text-destructive">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o acesso.</p>}
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="access-name" className="text-sm font-medium">Seu nome</label>
        <input id="access-name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={80} autoComplete="name" autoCapitalize="words" autoFocus placeholder="Como podemos chamar você?" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Seu acesso fica salvo neste dispositivo. Se sair ou limpar os dados do navegador, não será possível recuperá-lo apenas pelo nome.</p>
      <Button type="submit" disabled={saving || !supabase} className="h-12 w-full rounded-xl">{saving ? "Preparando seu acesso..." : "Continuar com meu nome"}</Button>
    </form>
  </AuthLayout>;
}
