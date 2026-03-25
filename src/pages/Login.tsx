import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Eye, EyeOff, Mail, Lock, ArrowRight, Shield, BarChart3, Package, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const features = [
  { icon: Package, title: "Gestão de Estoque", desc: "Controle granular por lotes e validade" },
  { icon: Shield, title: "Substâncias Controladas", desc: "Rastreabilidade total com auditoria" },
  { icon: BarChart3, title: "Relatórios Avançados", desc: "Análises por setor, paciente e período" },
  { icon: Zap, title: "Transferências", desc: "Logística entre clínicas parceiras" },
];

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
    if (error) toast.error(error);
    else { toast.success("Login realizado com sucesso!"); navigate("/"); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Informe seu e-mail"); return; }
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) toast.error(error);
    else { toast.success("E-mail de redefinição enviado!"); setForgotOpen(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[520px] xl:w-[580px] relative overflow-hidden gradient-hero flex-col justify-between p-10">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
        </div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">PsiRumoCerto</h1>
              <p className="text-xs text-white/60 font-medium">Gestão Farmacêutica Hospitalar</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-8 relative">
          <div>
            <h2 className="text-3xl font-bold text-white leading-[1.15]">Controle Total da<br />Sua Farmácia</h2>
            <p className="text-sm text-white/60 leading-relaxed mt-3 max-w-sm">
              Plataforma completa para gestão de medicamentos em hospitais psiquiátricos.
            </p>
          </div>
          <div className="space-y-3">
            {features.map((feat, i) => (
              <motion.div key={feat.title} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.06]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <feat.icon className="h-4 w-4 text-white/80" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/90">{feat.title}</p>
                  <p className="text-[11px] text-white/45">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="text-[11px] text-white/30 relative">
          © 2026 PsiRumoCerto — Sistema de Gestão Farmacêutica v2.1
        </motion.p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-[380px]">
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-hero shadow-lg shadow-primary/20">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">PsiRumoCerto</h1>
              <p className="text-[11px] text-muted-foreground font-medium">Farmácia Hospitalar</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {forgotOpen ? (
              <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground">Esqueceu a senha?</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">Informe seu e-mail para redefinição</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground h-11 font-semibold">
                    {loading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Enviar Link"}
                  </Button>
                  <button type="button" onClick={() => setForgotOpen(false)} className="text-sm text-primary hover:underline w-full text-center font-medium">← Voltar ao login</button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">Acesse o painel de gestão farmacêutica</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" autoComplete="email" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Senha</Label>
                      <button type="button" onClick={() => setForgotOpen(true)} className="text-[11px] text-primary hover:underline font-semibold">Esqueceu?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11" autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground gap-2 h-11 font-semibold shadow-lg shadow-primary/15">
                    {loading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><span>Entrar</span> <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
