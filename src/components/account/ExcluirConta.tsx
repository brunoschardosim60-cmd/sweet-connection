import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/nexa/analytics";
import { marcaStore } from "@/lib/nexa/marca";
import { midiaStore } from "@/lib/nexa/media";
import { store } from "@/lib/nexa/storage";
import { versaoStore } from "@/lib/nexa/versoes";

export function ExcluirConta() {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const excluir = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!senha || excluindo) return;

    setExcluindo(true);
    setErro(null);
    try {
      const current = await supabase.auth.getUser();
      const email = current.data.user?.email;
      if (current.error || !email) throw new Error("Sua sessão expirou. Entre novamente.");

      const reauthenticated = await supabase.auth.signInWithPassword({ email, password: senha });
      if (reauthenticated.error) throw new Error("Senha incorreta. A conta não foi excluída.");

      // Storage objects must be removed through the Storage API before the
      // Auth user is deleted and its database rows cascade.
      await midiaStore.removerTudo();
      const deletion = await supabase.rpc("delete_nexa_account");
      if (deletion.error) throw new Error("Não foi possível excluir a conta. Tente novamente.");

      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      store.reset();
      analytics.reset();
      marcaStore.reset();
      midiaStore.reset();
      versaoStore.reset();
      setAberto(false);
      toast.success("Conta excluída permanentemente");
      await navigate({ to: "/", replace: true });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir a conta.");
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(proximo) => {
        if (excluindo) return;
        setAberto(proximo);
        if (!proximo) {
          setSenha("");
          setErro(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-ember hover:bg-ember/10"
        >
          <Trash2 size={13} aria-hidden /> Excluir minha conta
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-ember/10 text-ember">
            <AlertTriangle size={19} aria-hidden />
          </span>
          <DialogTitle>Excluir conta permanentemente?</DialogTitle>
          <DialogDescription>
            O login, clientes, mini-sites, formulários, métricas, versões e arquivos serão
            removidos. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={excluir} className="space-y-4">
          <label className="block text-sm font-medium" htmlFor="excluir-conta-senha">
            Confirme sua senha
            <input
              id="excluir-conta-senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              disabled={excluindo}
              aria-invalid={!!erro}
              aria-describedby={erro ? "excluir-conta-erro" : undefined}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring disabled:opacity-60"
            />
          </label>

          {erro && (
            <p id="excluir-conta-erro" role="alert" className="text-sm text-ember">
              {erro}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              disabled={excluindo}
              onClick={() => setAberto(false)}
              className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={excluindo || !senha}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ember px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {excluindo && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {excluindo ? "Excluindo…" : "Sim, excluir conta"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
