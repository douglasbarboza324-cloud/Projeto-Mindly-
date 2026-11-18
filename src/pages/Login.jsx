import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage, isEmailNotConfirmedError, isEmailRateLimitError, loginAccount, resendSignupConfirmation, signInOAuth, sendPhoneCode, verifyPhoneCode, supabase } from "@/api/profile";
import GoogleIcon from "@/components/GoogleIcon";
import FacebookIcon from "@/components/FacebookIcon";
import { formatCooldown, useAuthEmailCooldown } from "@/hooks/useAuthEmailCooldown";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const loginLock = useRef(false);
  const resendLock = useRef(false);
  const { secondsLeft, startCooldown } = useAuthEmailCooldown();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loginLock.current) return;
    loginLock.current = true;
    setError("");
    setCanResend(false);
    setRateLimited(false);
    setResendStatus("");
    setSaving(true);
    try {
      await loginAccount({ email, password });
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Não foi possível entrar.");
      setError(getAuthErrorMessage(submitError, "login"));
      if (isEmailNotConfirmedError(submitError)) setCanResend(true);
      if (isEmailRateLimitError(submitError)) { startCooldown(); setRateLimited(true); }
    } finally {
      loginLock.current = false;
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (resendLock.current || secondsLeft > 0 || !email.trim()) return;
    resendLock.current = true;
    setResending(true);
    setError("");
    setResendStatus("");
    startCooldown();
    try {
      await resendSignupConfirmation(email);
      setResendStatus("Solicitação recebida. Verifique sua caixa de entrada e a pasta de spam.");
    } catch (resendError) {
      if (isEmailRateLimitError(resendError)) startCooldown();
      setError(getAuthErrorMessage(resendError, "resend"));
    } finally {
      resendLock.current = false;
      setResending(false);
    }
  };

  return (
    <AuthLayout icon={LogIn} title="Entrar no Mindly" subtitle="Use o e-mail e a senha do seu cadastro."
      footer={<span>Ainda não tem conta? <Link to="/register" className="font-medium text-primary hover:underline">Criar cadastro</Link></span>}>
      {!supabase && <p role="alert" className="mb-4 text-sm text-destructive">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o login.</p>}
      <div className="grid grid-cols-2 gap-2">
        {[["google", "Continuar com Google", GoogleIcon], ["facebook", "Continuar com Facebook", FacebookIcon]].map(([provider, label, Icon]) => <Button key={provider} type="button" variant="outline" disabled={saving || !supabase} onClick={async () => { setSaving(true); setError(""); try { await signInOAuth(provider); } catch (e) { setError(e.message); setSaving(false); } }} className="min-h-11 gap-2 px-2 text-xs sm:text-sm"><Icon className="h-5 w-5 shrink-0" />{label}</Button>)}
      </div>
      <p className="my-4 text-center text-sm text-muted-foreground">ou entre com e-mail</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium">E-mail</label>
          <input id="login-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setCanResend(false); }} required
            autoComplete="email" placeholder="voce@exemplo.com" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="space-y-2">
          <label htmlFor="login-password" className="text-sm font-medium">Senha</label>
          <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required
            autoComplete="current-password" placeholder="Sua senha" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {canResend && <Button type="button" variant="outline" disabled={resending || secondsLeft > 0 || !email.trim()} onClick={handleResend} className="w-full">{resending ? "Enviando..." : secondsLeft > 0 ? `Reenviar em ${formatCooldown(secondsLeft)}` : "Reenviar e-mail de confirmação"}</Button>}
        {resendStatus && <p role="status" className="text-sm text-emerald-700">{resendStatus}</p>}
        {secondsLeft > 0 && canResend && <p role="status" aria-live="polite" className="text-center text-xs text-muted-foreground">Aguarde {formatCooldown(secondsLeft)} antes de solicitar outro e-mail.</p>}
        <Link to="/forgot-password" className="block text-right text-sm text-primary hover:underline">Esqueci minha senha</Link>
        <Button type="submit" disabled={saving || !supabase} className="h-12 w-full rounded-xl">{saving ? "Entrando..." : "Entrar"}</Button>
        {secondsLeft > 0 && (canResend || rateLimited) && <p role="status" aria-live="polite" className="text-center text-xs text-muted-foreground">Aguarde {formatCooldown(secondsLeft)} antes de solicitar ou tentar novamente.</p>}
      </form>
      <div className="my-5 border-t" />
      <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); try { if (codeSent) { await verifyPhoneCode(phone, code); navigate("/", { replace: true }); } else { await sendPhoneCode(phone); setCodeSent(true); } } catch (e) { setError(e.message); } finally { setSaving(false); } }}>
        <label htmlFor="login-phone" className="text-sm font-medium">Entrar com telefone</label>
        <input id="login-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" placeholder="+5511999999999" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" />
        {codeSent && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">Código enviado. Confira suas mensagens SMS.</p>}
        {codeSent && <input aria-label="Código SMS" value={code} onChange={(e) => setCode(e.target.value)} required inputMode="numeric" autoComplete="one-time-code" placeholder="Código recebido por SMS" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" />}
        <Button type="submit" variant="outline" disabled={saving || !supabase} className="w-full">{saving ? "Aguarde..." : codeSent ? "Verificar código SMS" : "Enviar código SMS"}</Button>
      </form>
    </AuthLayout>
  );
}
