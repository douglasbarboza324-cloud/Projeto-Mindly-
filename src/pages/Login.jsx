import React from "react";
import { LogIn } from "lucide-react";
import LocalModePage from "@/components/LocalModePage";

export default function Login() {
  return (
    <LocalModePage
      icon={LogIn}
      title="Acesso local"
      subtitle="Não é necessário entrar em uma conta"
    />
  );
}
