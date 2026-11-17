import React from "react";
import { UserPlus } from "lucide-react";
import LocalModePage from "@/components/LocalModePage";

export default function Register() {
  return (
    <LocalModePage
      icon={UserPlus}
      title="Sem cadastro"
      subtitle="Sem conta. Registros ficam no navegador; mensagens de IA são enviadas ao Ollama configurado"
    />
  );
}
