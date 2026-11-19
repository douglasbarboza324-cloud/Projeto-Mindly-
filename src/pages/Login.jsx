import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import PasswordField from "@/components/PasswordField";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage, isEmailNotConfirmedError, isEmailRateLimitError, loginAccount, resendSignupConfirmation, supabase } from "@/api/profile";
import { formatCooldown, useAuthEmailCooldown } from "@/hooks/useAuthEmailCooldown";

export default function Login() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const [canResend, setCanResend] = useState(false); const [resending, setResending] = useState(false); const [resendStatus, setResendStatus] = useState("");
  const loginLock = useRef(false); const resendLock = useRef(false);
  const { secondsLeft, startCooldown } = useAuthEmailCooldown(); const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    if (loginLock.current) return;
    loginLock.current = true; setError(""); setCanResend(false); setResendStatus(""); setSaving(true);
    try { await loginAccount({ email, password }); navigate("/", { replace: true }); }
    catch (authError) {
      setError(getAuthErrorMessage(authError, "login"));
      if (isEmailNotConfirmedError(authError)) setCanResend(true);
      if (isEmailRateLimitError(authError)) startCooldown();
    } finally { loginLock.current = false; setSaving(false); }
  }

  async function handleResend() {
    if (resendLock.current || secondsLeft > 0 || !email.trim()) return;
    resendLock.current = true; setResending(true); setError(""); setResendStatus(""); startCooldown();
    try { await resendSignupConfirmation(email); setResendStatus("Solicitação recebida. Verifique sua caixa de entrada e a pasta de spam."); }
    catch (authError) { setError(getAuthErrorMessage(authError, "resend")); if (isEmailRateLimitError(authError)) startCooldown(); }
    finally { resendLock.current = false; setResending(false); }
  }

  return <AuthLayout icon={LogIn} title="Entrar no Mindly" subtitle="Use o e-mail e a senha do seu cadastro."
    footer={<span>Ainda não tem conta? <Link to="/register" className="font-medium text-primary hover:underline">Criar cadastro</Link></span>}>
    {!supabase && <p role="alert" className="mb-4 text-sm text-destructive">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o login.</p>}
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2"><label htmlFor="login-email" className="text-sm font-medium">E-mail</label><input id="login-email" type="email" value={email} onChange={event => { setEmail(event.target.value); setCanResend(false); }} required maxLength={254} autoComplete="email" placeholder="voce@exemplo.com" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" /></div>
      <div className="space-y-2"><label htmlFor="login-password" className="text-sm font-medium">Senha</label><PasswordField id="login-password" label="senha" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" placeholder="Sua senha" /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {canResend && <Button type="button" variant="outline" disabled={resending || secondsLeft > 0 || !email.trim()} onClick={handleResend} className="w-full">{resending ? "Enviando..." : secondsLeft > 0 ? `Reenviar em ${formatCooldown(secondsLeft)}` : "Reenviar e-mail de confirmação"}</Button>}
      {resendStatus && <p role="status" className="text-sm text-emerald-700">{resendStatus}</p>}
      <Link to="/forgot-password" className="block text-right text-sm text-primary hover:underline">Esqueci minha senha</Link>
      <Button type="submit" disabled={saving || !supabase} className="h-12 w-full rounded-xl">{saving ? "Entrando..." : "Entrar"}</Button>
    </form>
  </AuthLayout>;
}
