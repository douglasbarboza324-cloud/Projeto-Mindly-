import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserX, Database, Shield, LogOut } from "lucide-react";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import { getProfile, logout } from "@/api/profile";
import { toast } from "@/components/ui/use-toast";

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  useEffect(() => { getProfile().then(setProfile).catch(() => setProfile(null)); }, []);

  const handleLogout = async () => {
    try { await logout(); navigate("/login", { replace: true }); }
    catch { toast({ title: "Não foi possível sair", description: "Tente novamente em instantes.", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h2 className="text-2xl font-heading font-bold">Configurações</h2>
        <p className="text-sm text-muted-foreground">Diário, tarefas e áudios ficam neste navegador. Mensagens enviadas ao assistente são processadas por um serviço de inteligência artificial.</p>
      </div>

      <div className="space-y-3 rounded-2xl border bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Shield className="h-4 w-4" /> Armazenamento local
        </h3>
        {profile && <p className="text-sm">Conectado como <strong>{profile.name || profile.email}</strong> · {profile.email}</p>}
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl p-3 text-muted-foreground transition-colors hover:bg-muted">
          <LogOut className="h-5 w-5" /><span className="text-sm font-medium">Sair da conta</span>
        </button>
        <DeleteAccountDialog>
          <button className="flex w-full items-center gap-3 rounded-xl p-3 text-destructive transition-colors hover:bg-destructive/10">
            <UserX className="h-5 w-5" />
            <span className="text-left"><span className="block text-sm font-medium">Excluir dados locais</span><span className="block text-xs text-muted-foreground">Remove os registros e áudios desta conta neste navegador</span></span>
          </button>
        </DeleteAccountDialog>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border bg-card p-5">
        <Database className="mt-0.5 h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">A conta é gerenciada pelo Supabase. Seus registros pessoais continuam neste navegador.</p>
      </div>
      <p className="mx-auto max-w-md text-center text-xs leading-relaxed text-muted-foreground">A exclusão remove os registros locais desta conta e deste navegador. A conta Supabase permanece ativa.</p>
    </div>
  );
}
