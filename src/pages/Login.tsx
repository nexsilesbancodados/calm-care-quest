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
  { icon: Package, title: "Gestão de Estoque", desc: "Controle por lotes e validade FEFO" },
  { icon: Shield, title: "Controlados", desc: "Rastreabilidade ANVISA completa" },
  { icon: BarChart3, title: "Relatórios", desc: "CMM e análises por setor" },
  { icon: Zap, title: "Transferências", desc: "Logística entre clínicas" },
];

const Login = () => {
  const navigate = useNavigate();
  const { login, resetPassword, session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    <div className="min-h-screen flex bg-background">
      {/* Left — bold geometric hero */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden flex-col justify-between">
        {/* Base gradient */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(145deg, hsl(200 35% 7%), hsl(172 30% 12%), hsl(200 40% 5%))"
        }} />

        {/* Geometric pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, hsla(172,60%,44%,0.08) 25%, hsla(172,60%,44%,0.08) 26%, transparent 27%, transparent 74%, hsla(172,60%,44%,0.08) 75%, hsla(172,60%,44%,0.08) 76%, transparent 77%),
            linear-gradient(90deg, transparent 24%, hsla(172,60%,44%,0.08) 25%, hsla(172,60%,44%,0.08) 26%, transparent 27%, transparent 74%, hsla(172,60%,44%,0.08) 75%, hsla(172,60%,44%,0.08) 76%, transparent 77%)
          `,
          backgroundSize: "60px 60px",
        }} />

        {/* Accent shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-10"
          style={{ background: "radial-gradient(circle at 70% 30%, hsl(172 60% 44%), transparent 60%)" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 opacity-8"
          style={{ background: "radial-gradient(circle at 30% 70%, hsl(200 70% 50%), transparent 60%)" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/20 border border-primary/15">
                <Activity className="h-5 w-5 text-primary" style={{ color: "hsl(172 60% 44%)" }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">PsiRumoCerto</h1>
                <p className="text-[9px] text-white/30 font-bold tracking-[0.15em] uppercase" style={{ fontFamily: "var(--font-mono)" }}>
                  Gestão Farmacêutica Hospitalar
                </p>
              </div>
            </div>
          </motion.div>

          {/* Main copy */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-10"
          >
            <div>
              <motion.h2
                className="text-4xl xl:text-[3.2rem] font-bold text-white leading-[1.05] tracking-tight"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Controle
                <br />
                <span style={{ color: "hsl(172 60% 44%)" }}>
                  Preciso.
                </span>
              </motion.h2>
              <motion.p
                className="text-sm text-white/35 leading-relaxed mt-4 max-w-sm font-body"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Plataforma de gestão de medicamentos para hospitais psiquiátricos.
                Segurança e rastreabilidade em cada etapa.
              </motion.p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {features.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="group p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] mb-2.5">
                    <feat.icon className="h-3.5 w-3.5 text-white/50 group-hover:text-white/70 transition-colors" />
                  </div>
                  <p className="text-[11px] font-semibold text-white/75 group-hover:text-white/90 transition-colors">{feat.title}</p>
                  <p className="text-[10px] text-white/25 mt-0.5 leading-relaxed font-body">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/15 font-mono-ui tracking-wider">© 2026 PSI.RC — v2.1</p>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "hsl(162 55% 40%)" }} />
                <span className="text-[10px] text-white/20 font-mono-ui tracking-wider">ONLINE</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }} />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-[380px] relative"
        >
          {/* Mobile header */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">PsiRumoCerto</h1>
              <p className="text-[9px] text-muted-foreground font-mono-ui uppercase tracking-wider">Farmácia Hospitalar</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {forgotOpen ? (
              <motion.div key="forgot" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.25 }}>
                <div className="mb-7">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Esqueceu a senha?</h2>
                  <p className="text-xs text-muted-foreground mt-1.5 font-body">Enviaremos um link de redefinição.</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-foreground uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>E-mail</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        type="email" placeholder="seu@email.com" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 text-sm bg-card border-border/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-all rounded-lg"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-11 font-semibold text-xs rounded-lg gradient-primary text-primary-foreground tracking-wide">
                    {loading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Enviar Link"}
                  </Button>
                  <button type="button" onClick={() => setForgotOpen(false)} className="text-xs text-primary hover:text-primary/80 w-full text-center font-semibold transition-colors">
                    ← Voltar
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.25 }}>
                <div className="mb-7">
                  <motion.h2
                    className="text-xl font-bold text-foreground tracking-tight"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Bem-vindo de volta
                  </motion.h2>
                  <motion.p
                    className="text-xs text-muted-foreground mt-1.5 font-body"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Acesse o painel de gestão farmacêutica
                  </motion.p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <motion.div className="space-y-1.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                    <Label className="text-[10px] font-bold text-foreground uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>E-mail</Label>
                    <div className="relative group">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-150 ${focusedField === "email" ? "text-primary" : "text-muted-foreground"}`} />
                      <Input
                        type="email" placeholder="seu@email.com" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        className="pl-10 h-11 text-sm bg-card border-border/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-all rounded-lg"
                        autoComplete="email"
                      />
                    </div>
                  </motion.div>

                  <motion.div className="space-y-1.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold text-foreground uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>Senha</Label>
                      <button type="button" onClick={() => setForgotOpen(true)} className="text-[10px] text-primary hover:text-primary/80 font-semibold transition-colors">
                        Esqueceu?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-150 ${focusedField === "password" ? "text-primary" : "text-muted-foreground"}`} />
                      <Input
                        type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        className="pl-10 pr-10 h-11 text-sm bg-card border-border/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-all rounded-lg"
                        autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
                    <Button type="submit" disabled={loading}
                      className="w-full h-11 font-semibold text-xs rounded-lg gradient-primary text-primary-foreground tracking-wide group">
                      {loading ? (
                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </Button>
                  </motion.div>
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