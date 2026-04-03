import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Lock, ShieldCheck, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REQUIREMENTS = [
  { label: "Mínimo 6 caracteres", test: (p: string) => p.length >= 6 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Número", test: (p: string) => /\d/.test(p) },
];

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword, session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery") && !session) navigate("/login");
  }, [navigate, session]);

  const strength = useMemo(() => {
    const passed = REQUIREMENTS.filter(r => r.test(password)).length;
    return { passed, total: REQUIREMENTS.length, pct: Math.round((passed / REQUIREMENTS.length) * 100) };
  }, [password]);

  const strengthColor = strength.pct <= 25 ? "bg-destructive" : strength.pct <= 50 ? "bg-warning" : strength.pct <= 75 ? "bg-info" : "bg-success";
  const strengthLabel = strength.pct <= 25 ? "Fraca" : strength.pct <= 50 ? "Razoável" : strength.pct <= 75 ? "Boa" : "Forte";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    if (password !== confirm) { toast.error("As senhas não coincidem"); return; }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) toast.error(error);
    else { setDone(true); toast.success("Senha atualizada!"); setTimeout(() => navigate("/"), 2000); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-hero shadow-lg shadow-primary/20">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground font-display">PsiRumoCerto</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Redefinir Senha</p>
          </div>
        </div>

        {done ? (
          <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-success/10 mb-4">
              <ShieldCheck className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold font-display">Senha atualizada!</h2>
            <p className="text-sm text-muted-foreground mt-2">Redirecionando ao painel...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground font-display">Nova Senha</h2>
              <p className="text-sm text-muted-foreground mt-1.5">Defina sua nova senha de acesso ao sistema</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11" placeholder="Mínimo 6 caracteres" />
              </div>

              {/* Password strength */}
              {password.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2">
                    <Progress value={strength.pct} className="h-1.5 flex-1" indicatorClassName={strengthColor} />
                    <span className={cn("text-[10px] font-semibold", 
                      strength.pct <= 25 ? "text-destructive" : strength.pct <= 50 ? "text-warning" : strength.pct <= 75 ? "text-info" : "text-success"
                    )}>{strengthLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {REQUIREMENTS.map(r => {
                      const pass = r.test(password);
                      return (
                        <div key={r.label} className="flex items-center gap-1.5">
                          {pass ? <Check className="h-3 w-3 text-success" /> : <X className="h-3 w-3 text-muted-foreground/40" />}
                          <span className={cn("text-[10px]", pass ? "text-success" : "text-muted-foreground/60")}>{r.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-10 h-11" placeholder="Repita a senha" />
              </div>
              {confirm && password !== confirm && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" /> As senhas não coincidem
                </p>
              )}
              {confirm && password === confirm && confirm.length >= 6 && (
                <p className="text-[11px] text-success flex items-center gap-1">
                  <Check className="h-3 w-3" /> Senhas coincidem
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading || password.length < 6 || password !== confirm} className="w-full gradient-primary text-primary-foreground h-11 font-semibold shadow-lg shadow-primary/15">
              {loading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Redefinir Senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;