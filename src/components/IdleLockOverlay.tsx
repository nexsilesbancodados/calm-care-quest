import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIdleLock } from "@/lib/hooks/useIdleLock";
import { toast } from "sonner";

// Sobreposição que aparece após inatividade e exige re-autenticação (senha).
// Aplicada no topo do App via <IdleLockOverlay />.
export function IdleLockOverlay({ timeoutMs = 5 * 60 * 1000 }: { timeoutMs?: number }) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { isLocked, reset } = useIdleLock(() => {
    if (user) document.body.style.overflow = "hidden";
  }, timeoutMs);

  useEffect(() => {
    if (!isLocked) document.body.style.overflow = "";
  }, [isLocked]);

  if (!user || !isLocked) return null;

  async function unlock() {
    if (!user?.email || !password) return;
    setVerifying(true);
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    setVerifying(false);
    if (error) {
      toast.error("Senha incorreta");
      return;
    }
    setPassword("");
    reset();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sessão bloqueada por inatividade"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-md"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-elevated">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-2 text-lg font-bold">Sessão bloqueada</h2>
          <p className="text-sm text-muted-foreground">
            Inatividade detectada. Digite sua senha para continuar.
          </p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void unlock();
          }}
        >
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            autoFocus
            aria-label="Senha"
          />
          <Button type="submit" disabled={!password || verifying} className="w-full">
            {verifying ? "Verificando…" : "Desbloquear"}
          </Button>
        </form>
      </div>
    </div>
  );
}
