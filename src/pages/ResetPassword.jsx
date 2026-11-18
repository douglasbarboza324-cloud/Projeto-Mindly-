import { useState } from "react";
import { Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { supabase, updatePassword } from "@/api/profile";

export default function ResetPassword() {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [status, setStatus] = useState(""); const [error, setError] = useState("");
  async function submit(event) { event.preventDefault(); setError(""); if (password !== confirm) { setError("As senhas não coincidem."); return; } setBusy(true); try { await updatePassword(password); setStatus("Senha atualizada. Você já pode entrar."); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <AuthLayout icon={LockKeyhole} title="Nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres." footer={<Link to="/login" className="text-primary hover:underline">Voltar para entrar</Link>}>
    <form onSubmit={submit} className="space-y-4"><label htmlFor="new-password" className="text-sm font-medium">Nova senha</label><input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" /><label htmlFor="confirm-password" className="text-sm font-medium">Confirmar senha</label><input id="confirm-password" type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{status && <p role="status" className="text-sm text-emerald-700">{status}</p>}<Button disabled={busy || !supabase} className="w-full">{busy ? "Salvando..." : "Atualizar senha"}</Button></form>
  </AuthLayout>;
}
