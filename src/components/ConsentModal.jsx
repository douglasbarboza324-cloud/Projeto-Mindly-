import React, { useState } from "react";
import { Shield, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { localData } from "@/api/localData";

export default function ConsentModal({ open, onConsent }) {
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConsent = async () => {
    setSaving(true);
    setError("");
    try {
      await localData.consents.create({
        consent_given: true,
        consent_date: new Date().toISOString(),
        data_retention_accepted: true,
      });
      onConsent();
    } catch {
      setError("Não foi possível salvar seu consentimento neste navegador. Verifique o espaço disponível e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="space-y-6 py-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-semibold">Sua privacidade importa</h2>
              <p className="text-sm text-muted-foreground">Aviso de privacidade</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p>Diário, humor, tarefas, consentimentos e áudios ficam neste navegador e não são sincronizados. Quando você usa o assistente, suas mensagens são processadas por um serviço de inteligência artificial. A transcrição de áudio pode depender do navegador.</p>
            </div>
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <Eye className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p>Você pode excluir os dados salvos pelo Mindly nas configurações. O navegador também pode remover dados locais ao limpar o armazenamento.</p>
            </div>
            <p>
              <strong className="text-foreground">Importante:</strong> Este aplicativo é uma ferramenta de autoconhecimento e bem-estar. Ele <strong className="text-foreground">não substitui</strong> acompanhamento profissional de saúde mental e <strong className="text-foreground">não fornece diagnósticos médicos</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={accepted} onCheckedChange={setAccepted} className="mt-0.5" />
              <span className="text-sm">Entendi onde os dados ficam armazenados e que mensagens enviadas ao assistente são processadas por um serviço de inteligência artificial. Sei que o Mindly não substitui acompanhamento profissional.</span>
            </label>
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleConsent} disabled={!accepted || saving} className="w-full h-12 text-base">
            {saving ? "Salvando..." : "Aceitar e continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
