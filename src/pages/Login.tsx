import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Cross, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { login, resetPassword, session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && session) navigate("/");
  }, [session, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Login realizado com sucesso!");
      navigate("/");
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Informe seu e-mail"); return; }
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) toast.error(error);
    else {
      toast.success("E-mail de redefinição enviado! Verifique sua caixa de entrada.");
      setForgotOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative overflow-hidden gradient-primary flex-col justify-between p-10">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px, 80px 80px",
        }} />
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Cross className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">PharmaControl</h1>
              <p className="text-xs text-white/70">Farmácia Hospitalar</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">Gestão Completa<br />de Medicamentos</h2>
          <p className="text-sm text-white/75 leading-relaxed max-w-sm">
            Controle de estoque, dispensações, transferências entre clínicas, relatórios e muito mais.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {["Controle de Estoque", "Substâncias Controladas", "Transferências", "Relatórios", "Código de Barras", "Auditoria Completa"].map((feat, i) => (
              <motion.div key={feat} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="flex items-center gap-2 text-xs text-white/90">
                <div className="h-1.5 w-1.5 rounded-full bg-white/60 shrink-0" />
                {feat}
              </motion.div>
            ))}
          </div>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-[11px] text-white/40">
          © 2026 PharmaControl — Sistema de Gestão Farmacêutica v2.0
        </motion.p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Cross className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">PharmaControl</h1>
              <p className="text-[11px] text-muted-foreground">Farmácia Hospitalar</p>
            </div>
          </div>

          {forgotOpen ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Esqueceu a senha?</h2>
                <p className="text-sm text-muted-foreground mt-1">Informe seu e-mail para solicitar a redefinição</p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground h-11">
                  {loading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Solicitar Redefinição"}
                </Button>
                <button type="button" onClick={() => setForgotOpen(false)} className="text-sm text-primary hover:underline w-full text-center">← Voltar ao login</button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Entrar</h2>
                <p className="text-sm text-muted-foreground mt-1">Acesse o painel de gestão farmacêutica</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Senha</Label>
                    <button type="button" onClick={() => setForgotOpen(true)} className="text-[11px] text-primary hover:underline font-medium">Esqueceu a senha?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground gap-2 h-11">
                  {loading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><span>Entrar</span> <ArrowRight className="h-4 w-4" /></>}
                </Button>
                
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
