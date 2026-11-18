import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function LocalModePage({ icon, title, subtitle }) {
  return (
    <AuthLayout
      icon={icon}
      title={title}
      subtitle={subtitle}
      footer={
        <Link to="/" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />
          Voltar ao Mindly
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground text-center leading-relaxed">        A autenticação do Mindly é gerenciada pelo Supabase. Seus registros ficam neste navegador; mensagens enviadas à IA são processadas pelo provedor configurado.
      </p>
      <Link
        to="/"
        className="mt-5 flex h-12 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Abrir o Mindly
      </Link>
    </AuthLayout>
  );
}
