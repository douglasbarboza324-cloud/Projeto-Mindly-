import React from "react";
import { Mail } from "lucide-react";
import LocalModePage from "@/components/LocalModePage";

export default function ForgotPassword() {
  return (
    <LocalModePage
      icon={Mail}
      title="Sem recuperação de senha"
      subtitle="O Mindly não utiliza contas ou senhas"
    />
  );
}
