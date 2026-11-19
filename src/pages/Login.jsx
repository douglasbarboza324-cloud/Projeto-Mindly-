import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage, getPhoneAuthErrorMessage, isEmailNotConfirmedError, isEmailRateLimitError, loginAccount, resendSignupConfirmation, sendPhoneCode, verifyPhoneCode, supabase } from "@/api/profile";
import { formatCooldown, useAuthEmailCooldown } from "@/hooks/useAuthEmailCooldown";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+55");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("");
  const loginLock = useRef(false);
  const resendLock = useRef(false);
  const { secondsLeft, startCooldown } = useAuthEmailCooldown();
  const { secondsLeft: phoneSecondsLeft, startCooldown: startPhoneCooldown } = useAuthEmailCooldown("mindly:auth-sms-send-cooldown-until");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loginLock.current) return;
    loginLock.current = true;
    setError(""); setCanResend(false); setRateLimited(false); setResendStatus(""); setSaving(true);
    try { await loginAccount({ email, password }); navigate("/", { replace: true }); }
    catch (e) { setError(getAuthErrorMessage(e, "login")); if (isEmailNotConfirmedError(e)) setCanResend(true); if (isEmailRateLimitError(e)) { startCooldown(); setRateLimited(true); } }
    finally { loginLock.current = false; setSaving(false); }
  };

  const handleResend = async () => {
    if (resendLock.current || secondsLeft > 0 || !email.trim()) return;
    resendLock.current = true; setResending(true); setError(""); setResendStatus(""); startCooldown();
    try { await resendSignupConfirmation(email); setResendStatus("Solicitação recebida. Verifique sua caixa de entrada e a pasta de spam."); }
    catch (e) { setError(getAuthErrorMessage(e, "resend")); if (isEmailRateLimitError(e)) startCooldown(); }
    finally { resendLock.current = false; setResending(false); }
  };

  async function submitPhone(event) {
    event.preventDefault(); setSaving(true); setError(""); setPhoneStatus("");
    try {
      if (codeSent) { await verifyPhoneCode(phone, code, countryCode); navigate("/", { replace: true }); }
      else { await sendPhoneCode(phone, countryCode); setCodeSent(true); startPhoneCooldown(); }
    } catch (e) { setError(getPhoneAuthErrorMessage(e)); if (/rate limit|too many|sms_send/i.test(e.message || "")) startPhoneCooldown(); }
    finally { setSaving(false); }
  }

  async function resendPhone() {
    if (saving || phoneSecondsLeft > 0) return;
    setSaving(true); setError(""); setPhoneStatus("");
    try { await sendPhoneCode(phone, countryCode); startPhoneCooldown(); setPhoneStatus("Novo código enviado por SMS."); }
    catch (e) { setError(getPhoneAuthErrorMessage(e)); if (/rate limit|too many|sms_send/i.test(e.message || "")) startPhoneCooldown(); }
    finally { setSaving(false); }
  }

  return <AuthLayout icon={LogIn} title="Entrar no Mindly" subtitle="Use e-mail e senha ou receba um código por SMS."
    footer={<span>Ainda não tem conta? <Link to="/register" className="font-medium text-primary hover:underline">Criar cadastro</Link></span>}>
    {!supabase && <p role="alert" className="mb-4 text-sm text-destructive">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o login.</p>}
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2"><label htmlFor="login-email" className="text-sm font-medium">E-mail</label><input id="login-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setCanResend(false); }} required autoComplete="email" placeholder="voce@exemplo.com" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" /></div>
      <div className="space-y-2"><label htmlFor="login-password" className="text-sm font-medium">Senha</label><input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Sua senha" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {canResend && <Button type="button" variant="outline" disabled={resending || secondsLeft > 0 || !email.trim()} onClick={handleResend} className="w-full">{resending ? "Enviando..." : secondsLeft > 0 ? `Reenviar em ${formatCooldown(secondsLeft)}` : "Reenviar e-mail de confirmação"}</Button>}
      {resendStatus && <p role="status" className="text-sm text-emerald-700">{resendStatus}</p>}
      {secondsLeft > 0 && canResend && <p role="status" className="text-center text-xs text-muted-foreground">Aguarde {formatCooldown(secondsLeft)} antes de solicitar outro e-mail.</p>}
      <Link to="/forgot-password" className="block text-right text-sm text-primary hover:underline">Esqueci minha senha</Link>
      <Button type="submit" disabled={saving || !supabase} className="h-12 w-full rounded-xl">{saving ? "Entrando..." : "Entrar com e-mail"}</Button>
      {secondsLeft > 0 && rateLimited && <p role="status" className="text-center text-xs text-muted-foreground">Aguarde {formatCooldown(secondsLeft)} antes de tentar novamente.</p>}
    </form>
    <div className="my-5 border-t" />
    <form className="space-y-3" onSubmit={submitPhone}>
      <label htmlFor="login-phone" className="text-sm font-medium">Entrar com telefone</label>
      <div className="flex gap-2"><label className="sr-only" htmlFor="phone-country">Código do país</label><select id="phone-country" value={countryCode} onChange={e => setCountryCode(e.target.value)} disabled={codeSent} className="w-32 rounded-xl border border-input bg-background px-2 py-3 text-sm"><option value="+55">Brasil +55</option><option value="+1">EUA/Canadá +1</option><option value="+351">Portugal +351</option><option value="+44">Reino Unido +44</option></select><input id="login-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required autoComplete="tel-national" placeholder="(11) 99999-9999" disabled={codeSent} className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-3 text-base" /></div>
      {codeSent && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">Código solicitado. Confira suas mensagens SMS.</p>}
      {codeSent && <input aria-label="Código SMS" value={code} onChange={e => setCode(e.target.value)} required inputMode="numeric" autoComplete="one-time-code" placeholder="Código recebido por SMS" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base" />}
      {codeSent && <Button type="button" variant="ghost" disabled={saving || phoneSecondsLeft > 0} onClick={resendPhone} className="w-full">{phoneSecondsLeft > 0 ? `Reenviar código em ${formatCooldown(phoneSecondsLeft)}` : "Reenviar código SMS"}</Button>}
      {phoneStatus && <p role="status" className="text-sm text-emerald-700">{phoneStatus}</p>}
      <Button type="submit" variant="outline" disabled={saving || !supabase || (codeSent && phoneSecondsLeft > 0)} className="w-full">{saving ? "Aguarde..." : codeSent ? "Verificar código SMS" : "Enviar código SMS"}</Button>
    </form>
  </AuthLayout>;
}
