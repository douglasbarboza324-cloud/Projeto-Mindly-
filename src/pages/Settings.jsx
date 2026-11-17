import React from "react";
import { UserX, Database, Shield } from "lucide-react";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";

export default function Settings() {
  return (
    <div className="space-y-6 py-4">
      <div>
        <h2 className="text-2xl font-heading font-bold">Configurações</h2>
        <p className="text-sm text-muted-foreground">Diário, tarefas e áudios ficam neste navegador. Mensagens enviadas à IA são processadas pelo Ollama configurado.</p>
      </div>

      {/* Account section */}
      <div className="bg-card border rounded-2xl p-5 space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Armazenamento local
        </h3>

        <div className="pt-2">
          <DeleteAccountDialog>
            <button className="flex items-center gap-3 w-full p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors select-none">
              <UserX className="w-5 h-5" />
              <div className="text-left">
                <p className="text-sm font-medium">Excluir dados locais</p>
                <p className="text-xs text-muted-foreground">Remove registros e áudios salvos neste navegador</p>
              </div>
            </button>
          </DeleteAccountDialog>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-5 flex items-start gap-3">
        <Database className="w-5 h-5 text-primary mt-0.5" />
        <p className="text-sm text-muted-foreground">
          O aplicativo não cria contas nem sincroniza os registros. Limpar os dados do navegador também pode apagar seus registros locais.
        </p>
      </div>

      <p className="text-xs text-center text-muted-foreground max-w-md mx-auto leading-relaxed">
        A exclusão dos dados locais é permanente. Seus registros de humor, triagens, tarefas, consentimentos e áudios serão removidos.
      </p>
    </div>
  );
}