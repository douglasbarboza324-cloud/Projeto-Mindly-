import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage, isEmailRateLimitError, registerAccount, resendSignupConfirmation, signInOAuth, supabase } from "@/api/profile";
import GoogleIcon from "@/components/GoogleIcon";
import FacebookIcon from "@/components/FacebookIcon";
import { formatCooldown, useAuthEmailCooldown } from "@/hooks/useAuthEmailCooldown";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const submitLock = useRef(false);
  const resendLock = useRef(false);
  const { secondsLeft, startCooldown } = useAuthEmailCooldown();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitLock.current || secondsLeft > 0) return;
    setError("");
    setStatus("");
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    submitLock.current = true;
    setSaving(true);
    try {
      const result = await registerAccount(form);
      if (!result.session) { startCooldown(); setCanResend(true); }
      if (!result.session) { setStatus("Confira seu e-mail e confirme o cadastro para entrar."); return; }
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Não foi possível criar o cadastro.");
      if (isEmailRateLimitError(submitError)) { startCooldown(); setCanResend(true); }
      setError(getAuthErrorMessage(submitError, "register"));
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (resendLock.current || secondsLeft > 0 || !form.email.trim()) return;
    resendLock.current = true;
    setResending(true);
    setError("");
    setStatus("");
    startCooldown();
    try {
      await resendSignupConfirmation(form.email);
      setStatus("Solicitação recebida. Se houver uma confirmação pendente para esse endereço, verifique sua caixa de entrada e a pasta de spam.");
    } catch (resendError) {
      if (isEmailRateLimitError(resendError)) {
        startCooldown();
        setStatus("A confirmação ainda está pendente. Aguarde o contador antes de solicitar outro e-mail.");
      }
      setError(getAuthErrorMessage(resendError, "resend"));
    } finally {
      resendLock.current = false;
      setResending(false);
    }
  };

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <AuthLayout icon={UserPlus} title="Criar conta" subtitle="Crie sua conta Mindly com segurança."
      footer={<span>Já tem uma conta? <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link></span>}>
      {!supabase && <p role="alert" className="mb-4 text-sm text-destructive">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o cadastro.</p>}
      <div className="grid grid-cols-2 gap-2">
        {[["google", "Google", GoogleIcon], ["facebook", "Facebook", FacebookIcon]].map(([provider, label, Icon]) => <Button key={provider} type="button" variant="outline" disabled={saving || !supabase} onClick={async () => { setSaving(true); setError(""); try { await signInOAuth(provider); } catch (e) { setError(e.message); setSaving(false); } }} className="gap-2"><Icon className="h-5 w-5 shrink-0" />{label}</Button>)}
      </div>
      <p className="my-4 text-center text-sm text-muted-foreground">ou use e-mail e senha</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="register-name" className="text-sm font-medium">Nome completo</label>
          <input id="register-name" value={form.name} onChange={update("name")} required minLength={2} maxLength={80}
            autoComplete="name" placeholder="Seu nome completo" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="space-y-2">
          <label htmlFor="register-email" className="text-sm font-medium">E-mail</label>
          <input id="register-email" type="email" value={form.email} onChange={update("email")} required maxLength={254}
            autoComplete="email" placeholder="voce@exemplo.com" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="space-y-2">
          <label htmlFor="register-password" className="text-sm font-medium">Senha</label>
          <input id="register-password" type="password" value={form.password} onChange={update("password")} required minLength={8}
            autoComplete="new-password" placeholder="Mínimo de 8 caracteres" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="space-y-2">
          <label htmlFor="register-confirm-password" className="text-sm font-medium">Confirmar senha</label>
          <input id="register-confirm-password" type="password" value={form.confirmPassword} onChange={update("confirmPassword")} required
            autoComplete="new-password" placeholder="Digite a senha novamente" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <p className="text-xs text-muted-foreground">Enviaremos um e-mail para confirmar seu cadastro.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {status && <p role="status" className="text-sm text-emerald-700">{status}</p>}
        {canResend && !status && <Button type="button" variant="outline" disabled={resending || secondsLeft > 0 || !form.email.trim()} onClick={handleResend} className="h-11 w-full rounded-xl">{resending ? "Enviando..." : secondsLeft > 0 ? `Reenviar em ${formatCooldown(secondsLeft)}` : "Reenviar e-mail de confirmação"}</Button>}
        <Button type="submit" disabled={saving || !supabase || secondsLeft > 0} className="h-12 w-full rounded-xl">{saving ? "Criando conta..." : secondsLeft > 0 ? `Aguarde ${formatCooldown(secondsLeft)}` : "Criar conta"}</Button>
        {status && <Button type="button" variant="outline" disabled={resending || secondsLeft > 0 || !form.email.trim()} onClick={handleResend} className="h-11 w-full rounded-xl">{resending ? "Enviando..." : secondsLeft > 0 ? `Reenviar em ${formatCooldown(secondsLeft)}` : "Reenviar e-mail de confirmação"}</Button>}
        {secondsLeft > 0 && <p role="status" aria-live="polite" className="text-center text-xs text-muted-foreground">Aguarde {formatCooldown(secondsLeft)} antes de uma nova solicitação de e-mail.</p>}
      </form>
    </AuthLayout>
  );
}
