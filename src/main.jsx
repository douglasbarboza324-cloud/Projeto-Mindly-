import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import { supabase } from "@/api/profile";
import "@/index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <div className="fixed inset-0 flex items-center justify-center bg-background" role="status" aria-label="Carregando Mindly">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
  </div>
);

// Processa o retorno do Supabase antes de iniciar o HashRouter.
// Assim, os tokens da confirmação não são interpretados como uma rota.
async function bootstrap() {
  if (supabase) {
    try {
      await supabase.auth.getSession();
    } catch (error) {
      console.error("Não foi possível concluir o retorno da autenticação:", error);
    }
  }

  const params = new URLSearchParams(window.location.search);
  const requestedRoute = params.get("mindly_redirect");
  const hashHasAuthTokens = /(?:access_token|refresh_token|error|error_description)=/.test(window.location.hash);

  if (requestedRoute === "reset-password") {
    window.history.replaceState(null, document.title, `${window.location.pathname}#/reset-password`);
  } else if (hashHasAuthTokens) {
    window.history.replaceState(null, document.title, `${window.location.pathname}#/`);
  }

  root.render(<App />);
}

bootstrap();
