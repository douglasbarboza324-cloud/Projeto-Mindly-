import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, supabase } from "@/api/profile";

export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [status, setStatus] = useState(""); const [error, setError] = useState("");
  async function submit(event) { event.preventDefault(); setBusy(true); setError(""); try { await requestPasswordReset(email); setStatus("Se houver uma conta para este e-mail, enviaremos um link de recuperação."); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <AuthLayout icon={Mail} title="Recuperar senha" subtitle="Enviaremos um link seguro para seu e-mail." footer={<Link to="/login" className="text-primary hover:underline">Voltar para entrar</Link>}>
    {!supabase && <p role="alert" className="mb-4 text-sm text-destructive">Configure as variáveis públicas do Supabase para continuar.</p>}
    <form onSubmit={submit} className="space-y-4"><label htmlFor="reset-email" className="text-sm font-medium">E-mail</label><input id="reset-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{status && <p role="status" className="text-sm text-emerald-700">{status}</p>}<Button disabled={busy || !supabase} className="w-full">{busy ? "Enviando..." : "Enviar link"}</Button></form>
  </AuthLayout>;
}
