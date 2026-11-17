import React from "react";
import { ShieldCheck } from "lucide-react";
import LocalModePage from "@/components/LocalModePage";

export default function OAuthConsent() {
  return (
    <LocalModePage
      icon={ShieldCheck}
      title="Autorização indisponível"
      subtitle="Esta versão local não se conecta a serviços de autenticação externos"
    />
  );
}
