import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { localData } from "@/api/localData";
import { toast } from "@/components/ui/use-toast";

export default function DeleteAccountDialog({ children }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await localData.clearAll();
      toast({ title: "Dados locais excluídos", description: "Os registros deste navegador foram removidos." });
      setConfirmText("");
      setOpen(false);
    } catch (error) {
      toast({ title: "Não foi possível excluir os dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir dados locais</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é permanente e não pode ser desfeita. Todos os seus dados
            — diário, triagens, tarefas, consentimentos e áudios — deste navegador serão removidos.
            Para confirmar, digite{" "}
            <strong className="text-foreground">EXCLUIR</strong> abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
          placeholder="EXCLUIR"
          disabled={loading}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base sm:text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-destructive/30"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || confirmText !== "EXCLUIR"}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir dados locais
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}