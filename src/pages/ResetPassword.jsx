import React from "react";
import { LockKeyhole } from "lucide-react";
import LocalModePage from "@/components/LocalModePage";

export default function ResetPassword() {
  return (
    <LocalModePage
      icon={LockKeyhole}
      title="Sem redefinição de senha"
      subtitle="O Mindly não utiliza contas ou senhas"
    />
  );
}
