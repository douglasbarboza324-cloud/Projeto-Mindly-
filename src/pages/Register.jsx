import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import PasswordField from "@/components/PasswordField";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage, isEmailRateLimitError, registerAccount, resendSignupConfirmation, supabase } from "@/api/profile";
import { formatCooldown, useAuthEmailCooldown } from "@/hooks/useAuthEmailCooldown";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const [status, setStatus] = useState("");
  const [canResend, setCanResend] = useState(false); const [resending, setResending] = useState(false);
  const submitLock = useRef(false); const resendLock = useRef(false);
  const { secondsLeft, startCooldown } = useAuthEmailCooldown(); const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitLock.current || secondsLeft > 0) return;
    setError(""); setStatus("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError("Informe um endereço de e-mail válido."); return; }
    if (form.password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    if (form.password !== form.confirmPassword) { setError("As senhas não coincidem."); return; }
    submitLock.current = true; setSaving(true);
    try {
      const result = await registerAccount(form);
      if (!result.session) { startCooldown(); setCanResend(true); setStatus("Cadastro recebido. Confira seu e-mail e confirme a conta antes de entrar."); return; }
      navigate("/", { replace: true });
    } catch (e) {
      setError(getAuthErrorMessage(e, "register"));
      if (isEmailRateLimitError(e)) { startCooldown(); setCanResend(true); }
    } finally { submitLock.current = false; setSaving(false); }
  };

  const handleResend = async () => {
    if (resendLock.current || secondsLeft > 0 || !form.email.trim()) return;
    resendLock.current = true; setResending(true); setError(""); startCooldown();
    try { await resendSignupConfirmation(form.email); setStatus("Solicitação recebida. Se houver uma confirmação pendente, verifique sua caixa de entrada e a pasta de spam."); }
    catch (e) { setError(getAuthErrorMessage(e, "resend")); if (isEmailRateLimitError(e)) startCooldown(); }
    finally { resendLock.current = false; setResending(false); }
  };

  const update = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  return <AuthLayout icon={UserPlus} title="Criar conta" subtitle="Cadastre-se com seu nome, e-mail e uma senha segura."
    footer={<span>Já tem uma conta? <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link></span>}>
    {!supabase && <p role="alert" className="mb-4 text-sm text-destructive">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o cadastro.</p>}
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2"><label htmlFor="register-name" className="text-sm font-medium">Nome completo</label><input id="register-name" value={form.name} onChange={update("name")} required minLength={2} maxLength={80} autoComplete="name" placeholder="Seu nome completo" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" /></div>
      <div className="space-y-2"><label htmlFor="register-email" className="text-sm font-medium">E-mail</label><input id="register-email" type="email" value={form.email} onChange={update("email")} required maxLength={254} autoComplete="email" placeholder="voce@exemplo.com" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" /></div>
      <div className="space-y-2"><label htmlFor="register-password" className="text-sm font-medium">Senha</label><PasswordField id="register-password" label="senha" value={form.password} onChange={update("password")} required minLength={8} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" /></div>
      <div className="space-y-2"><label htmlFor="register-confirm-password" className="text-sm font-medium">Confirmar senha</label><PasswordField id="register-confirm-password" label="confirmação da senha" value={form.confirmPassword} onChange={update("confirmPassword")} required autoComplete="new-password" placeholder="Digite a senha novamente" /></div>
      <p className="text-xs text-muted-foreground">O Supabase enviará um e-mail para confirmar seu cadastro.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{status && <p role="status" className="text-sm text-emerald-700">{status}</p>}
      {(canResend || status) && <Button type="button" variant="outline" disabled={resending || secondsLeft > 0 || !form.email.trim()} onClick={handleResend} className="h-11 w-full rounded-xl">{resending ? "Enviando..." : secondsLeft > 0 ? `Reenviar em ${formatCooldown(secondsLeft)}` : "Reenviar e-mail de confirmação"}</Button>}
      <Button type="submit" disabled={saving || !supabase || secondsLeft > 0} className="h-12 w-full rounded-xl">{saving ? "Criando conta..." : secondsLeft > 0 ? `Aguarde ${formatCooldown(secondsLeft)}` : "Criar conta"}</Button>
    </form>
  </AuthLayout>;
}
