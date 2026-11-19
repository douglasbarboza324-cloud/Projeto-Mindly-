import { useState } from "react";
import { Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import PasswordField from "@/components/PasswordField";
import { Button } from "@/components/ui/button";
import { supabase, updatePassword } from "@/api/profile";

export default function ResetPassword() {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [status, setStatus] = useState(""); const [error, setError] = useState("");
  async function submit(event) { event.preventDefault(); setError(""); setStatus(""); if (password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; } if (password !== confirm) { setError("As senhas não coincidem."); return; } setBusy(true); try { await updatePassword(password); setStatus("Senha atualizada. Você já pode entrar."); } catch { setError("Não foi possível atualizar sua senha. Reabra o link de recuperação e tente novamente."); } finally { setBusy(false); } }
  return <AuthLayout icon={LockKeyhole} title="Nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres." footer={<Link to="/login" className="text-primary hover:underline">Voltar para entrar</Link>}>
    <form onSubmit={submit} className="space-y-4"><label htmlFor="new-password" className="text-sm font-medium">Nova senha</label><PasswordField id="new-password" label="nova senha" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /><label htmlFor="confirm-password" className="text-sm font-medium">Confirmar senha</label><PasswordField id="confirm-password" label="confirmação da senha" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{status && <p role="status" className="text-sm text-emerald-700">{status}</p>}<Button disabled={busy || !supabase} className="w-full">{busy ? "Salvando..." : "Atualizar senha"}</Button></form>
  </AuthLayout>;
}
