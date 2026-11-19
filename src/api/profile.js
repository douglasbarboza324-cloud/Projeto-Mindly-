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
  return user ? { id: user.id, name: user.user_metadata?.full_name || user.user_metadata?.name || "", email: user.email || "", isAnonymous: user.is_anonymous === true, avatarUrl: user.user_metadata?.avatar_url || "", createdAt: user.created_at } : null;
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
  if (isEmailRateLimitError(error)) {
    return "Muitas solicitações de e-mail foram feitas. Aguarde um pouco antes de tentar novamente.";
  }
  if (isEmailNotConfirmedError(error)) {
    return "Seu e-mail ainda não foi confirmado. Abra a mensagem de confirmação ou solicite um novo e-mail abaixo.";
  }

  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  if (context === "login" && (code === "invalid_credentials" || message.includes("invalid login credentials"))) {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }
  if (code.includes("email") && (message.includes("invalid") || message.includes("valid"))) {
    return "Confira o formato do endereço de e-mail.";
  }
  if (context === "login") return "Não foi possível entrar agora. Confira seus dados e tente novamente.";
  if (context === "resend") return "Não foi possível enviar o e-mail agora. Tente novamente em instantes.";
  return "Não foi possível concluir a solicitação. Tente novamente mais tarde.";
}

export async function loginAccount({ email, password }) {
  const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function startNameOnlyAccess(name) {
  const fullName = String(name || "").trim();
  if (fullName.length < 2 || fullName.length > 80) {
    const error = new Error("Informe um nome entre 2 e 80 caracteres.");
    error.code = "invalid_name";
    throw error;
  }

  const { data, error } = await requireSupabase().auth.signInAnonymously({
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  if (!data.session) throw new Error("Não foi possível iniciar o acesso.");
  return data;
}

export function getNameOnlyAccessErrorMessage(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  if (code === "invalid_name") return error.message;
  if (code === "anonymous_provider_disabled" || message.includes("anonymous sign-ins are disabled")) {
    return "O acesso apenas com nome ainda não está habilitado no Supabase. Ative os usuários anônimos nas configurações de autenticação.";
  }
  return "Não foi possível iniciar seu acesso agora. Tente novamente em instantes.";
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
