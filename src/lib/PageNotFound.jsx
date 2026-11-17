import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";

export default function PageNotFound() {
  const { pathname } = useLocation();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-5">
        <p className="text-7xl font-light text-muted-foreground/40">404</p>
        <h1 className="text-2xl font-heading font-bold">Página não encontrada</h1>
        <p className="text-muted-foreground">
          Não encontramos <span className="font-medium text-foreground">{pathname}</span>.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Home className="w-4 h-4" />
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
