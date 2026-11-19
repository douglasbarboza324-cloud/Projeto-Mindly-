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
  return user ? { id: user.id, name: user.user_metadata?.full_name || user.user_metadata?.name || "", email: user.email || "", avatarUrl: user.user_metadata?.avatar_url || "", createdAt: user.created_at } : null;
}

export async function registerAccount({ name, email, password }) {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const invalidEmailError = new Error("Informe um endereço de e-mail válido.");
    invalidEmailError.code = "invalid_email";
    throw invalidEmailError;
  }
  const passwordError = getPasswordValidationMessage(password);
  if (passwordError) {
    const weakPasswordError = new Error(passwordError);
    weakPasswordError.code = "weak_password";
    throw weakPasswordError;
  }
  const { data, error } = await client.auth.signUp({ email: normalizedEmail, password, options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/` } });
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

export function getPasswordValidationMessage(password) {
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "Inclua pelo menos uma letra maiúscula.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Inclua pelo menos um caractere especial (por exemplo: !, @ ou #).";
  return "";
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
  if (context === "register" && (code === "weak_password" || message.includes("password"))) {
    return error?.message || "Use ao menos 8 caracteres, uma letra maiúscula e um caractere especial.";
  }
  if (context === "register" && code === "invalid_email") return "Informe um endereço de e-mail válido.";
  if (code.includes("email") && (message.includes("invalid") || message.includes("valid"))) {
    return "Confira o formato do endereço de e-mail.";
  }
  if (context === "login") return "Não foi possível entrar agora. Confira seus dados e tente novamente.";
  if (context === "register") return "Não foi possível criar sua conta agora. Confira os dados e tente novamente.";
  if (context === "resend") return "Não foi possível enviar o e-mail agora. Tente novamente em instantes.";
  return "Não foi possível concluir a solicitação. Tente novamente mais tarde.";
}

export async function loginAccount({ email, password }) {
  const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
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
