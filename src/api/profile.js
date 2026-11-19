import { createClient } from "@supabase/supabase-js";

// Corrige links antigos que chegam como "#/access_token=..." por causa do HashRouter.
if (typeof window !== "undefined" && /^#\/(?:access_token|error|code)=/.test(window.location.hash)) {
  const normalizedHash = `#${window.location.hash.slice(2)}`;
  window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}${normalizedHash}`);
}

const url = import.meta.env.VITE_SUPABASE_URL;
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && publicKey ? createClient(url, publicKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export function requireSupabase() {
  if (!supabase) throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o Supabase.");
  return supabase;
}

export async function getProfile() {
  const client = requireSupabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error) throw error;
  return user ? { id: user.id, name: user.user_metadata?.full_name || user.user_metadata?.name || "", email: user.email || "", phone: user.phone || "", avatarUrl: user.user_metadata?.avatar_url || "", createdAt: user.created_at } : null;
}

export async function registerAccount({ name, email, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/` } });
  if (error) throw error;
  // Supabase intentionally returns an empty identities array for an existing email
  // when confirmations are enabled, to avoid disclosing account existence via its API.
  if (data.user?.identities?.length === 0) {
    const duplicateError = new Error("Já existe uma conta com este e-mail. Entre ou use a recuperação de senha.");
    duplicateError.code = "duplicate_email";
    throw duplicateError;
  }
  return data;
}

export async function resendSignupConfirmation(email) {
  const { error } = await requireSupabase().auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export function isEmailRateLimitError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return code.includes("rate") || message.includes("rate limit") || message.includes("too many") || message.includes("over_email_send_rate_limit");
}

export function isEmailNotConfirmedError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return code === "email_not_confirmed" || message.includes("email not confirmed") || message.includes("email_not_confirmed");
}

export function getAuthErrorMessage(error, context = "generic") {
  if (context === "register" && error?.code === "duplicate_email") return error.message;
  if (isEmailRateLimitError(error)) {
    return "O Supabase limitou temporariamente o envio de e-mails. Aguarde o contador antes de tentar novamente; o limite do servidor pode levar mais tempo para liberar.";
  }
  if (isEmailNotConfirmedError(error)) {
    return "Seu e-mail ainda não foi confirmado. Abra a mensagem de confirmação ou solicite um novo e-mail abaixo.";
  }

  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  if (context === "login" && (code === "invalid_credentials" || message.includes("invalid login credentials"))) {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }
  if (context === "register" && (code === "weak_password" || message.includes("password"))) {
    return "A senha não atende aos requisitos. Escolha uma senha mais forte e tente novamente.";
  }
  if (code.includes("email") && (message.includes("invalid") || message.includes("valid"))) {
    return "Confira o formato do endereço de e-mail.";
  }
  return error?.message || "Não foi possível concluir a solicitação. Tente novamente mais tarde.";
}

export async function loginAccount({ email, password }) {
  const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export function normalizePhoneNumber(phone, countryCode = "+55") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) throw new Error("Informe seu número de telefone.");
  // Accept a full international number, otherwise prepend the selected country code.
  const normalized = String(phone).trim().startsWith("+") ? `+${digits}` : `${countryCode}${digits}`;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error("Informe um número válido com código do país.");
  return normalized;
}

export function getPhoneAuthErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("rate limit") || message.includes("too many") || message.includes("sms_send") || message.includes("over_sms_send_rate_limit")) {
    return "O limite de envio de SMS foi atingido. Aguarde antes de solicitar outro código.";
  }
  if (message.includes("phone") && (message.includes("invalid") || message.includes("valid"))) return "Confira o número e o código do país.";
  if (message.includes("provider") || message.includes("sms") || message.includes("twilio")) return "Não foi possível enviar o SMS. Verifique se um provedor de SMS está configurado no Supabase e tente novamente mais tarde.";
  if (message.includes("token") || message.includes("otp") || message.includes("code")) return "Código inválido ou expirado. Confira o SMS ou solicite outro código.";
  return error?.message || "Não foi possível concluir a autenticação por telefone. Tente novamente.";
}

export async function sendPhoneCode(phone, countryCode) {
  const { error } = await requireSupabase().auth.signInWithOtp({ phone: normalizePhoneNumber(phone, countryCode), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyPhoneCode(phone, token, countryCode) {
  const { error } = await requireSupabase().auth.verifyOtp({ phone: normalizePhoneNumber(phone, countryCode), token: token.trim(), type: "sms" });
  if (error) throw error;
}

export async function requestPasswordReset(email) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/?mindly_redirect=reset-password` });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function logout() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
