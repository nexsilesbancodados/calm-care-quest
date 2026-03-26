import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Eye, EyeOff, Mail, Lock, ArrowRight, Shield, BarChart3, Package, Zap, Pill, HeartPulse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const features = [
  { icon: Package, title: "Gestão de Estoque", desc: "Controle granular por lotes e validade com FEFO" },
  { icon: Shield, title: "Substâncias Controladas", desc: "Rastreabilidade total com auditoria ANVISA" },
  { icon: BarChart3, title: "Relatórios Avançados", desc: "CMM, psicotrópicos e análises por setor" },
  { icon: Zap, title: "Transferências Ágeis", desc: "Logística entre clínicas parceiras em tempo real" },
];

const floatingIcons = [
  { icon: Pill, x: "15%", y: "20%", delay: 0, size: 20 },
  { icon: HeartPulse, x: "75%", y: "15%", delay: 1.5, size: 18 },
  { icon: Shield, x: "85%", y: "65%", delay: 3, size: 16 },
  { icon: Activity, x: "10%", y: "75%", delay: 2, size: 22 },
  { icon: Package, x: "60%", y: "80%", delay: 4, size: 14 },
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
      {/* Left panel — immersive hero */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden flex-col justify-between">
        {/* Gradient layers — violeta/teal */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(258,65%,16%)] via-[hsl(260,55%,20%)] to-[hsl(200,60%,18%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Animated mesh */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `
            linear-gradient(30deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
            linear-gradient(150deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
            linear-gradient(30deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
            linear-gradient(150deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
            linear-gradient(60deg, hsla(0,0%,100%,0.06) 25%, transparent 25.5%, transparent 75%, hsla(0,0%,100%,0.06) 75%, hsla(0,0%,100%,0.06)),
            linear-gradient(60deg, hsla(0,0%,100%,0.06) 25%, transparent 25.5%, transparent 75%, hsla(0,0%,100%,0.06) 75%, hsla(0,0%,100%,0.06))
          `,
          backgroundSize: "80px 140px",
          backgroundPosition: "0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px",
        }} />

        {/* Glowing orbs — violeta/teal */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsla(258,70%,60%,0.15) 0%, transparent 70%)",
            top: "-10%", right: "-10%",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsla(172,60%,48%,0.12) 0%, transparent 70%)",
            bottom: "-5%", left: "-5%",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsla(258,65%,55%,0.1) 0%, transparent 70%)",
            top: "40%", left: "30%",
          }}
          animate={{ scale: [1, 1.1, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />

        {/* Floating icons */}
        {floatingIcons.map((fi, i) => (
          <motion.div
            key={i}
            className="absolute text-white/[0.07]"
            style={{ left: fi.x, top: fi.y }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, 10, -10, 0],
              opacity: [0.04, 0.08, 0.04],
            }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: fi.delay }}
          >
            <fi.icon style={{ width: fi.size, height: fi.size }} />
          </motion.div>
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 backdrop-blur-md border border-white/[0.08] shadow-lg shadow-black/20">
                <Activity className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>PsiRumoCerto</h1>
                <p className="text-xs text-white/50 font-medium tracking-wide uppercase">Gestão Farmacêutica Hospitalar</p>
              </div>
            </div>
          </motion.div>

          {/* Main copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="space-y-10"
          >
            <div>
              <motion.h2
                className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Controle Total
                <br />
                <span className="bg-gradient-to-r from-purple-300 via-violet-300 to-teal-300 bg-clip-text text-transparent">
                  da Sua Farmácia
                </span>
              </motion.h2>
              <motion.p
                className="text-base text-white/50 leading-relaxed mt-5 max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Plataforma completa para gestão de medicamentos em hospitais psiquiátricos.
                Segurança, rastreabilidade e eficiência em um só lugar.
              </motion.p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.12 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  className="group relative p-4 rounded-2xl bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.14] transition-all duration-300 cursor-default"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] mb-3 group-hover:bg-white/[0.12] transition-colors">
                      <feat.icon className="h-4.5 w-4.5 text-white/70 group-hover:text-white/90 transition-colors" />
                    </div>
                    <p className="text-[13px] font-semibold text-white/85 group-hover:text-white transition-colors">{feat.title}</p>
                    <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed group-hover:text-white/45 transition-colors">{feat.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="flex items-center justify-between"
          >
            <p className="text-[11px] text-white/25">© 2026 PsiRumoCerto — v2.1</p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
              <span className="text-[11px] text-white/30">Sistema Operacional</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        {/* Decorative gradient ring */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]" />

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-[400px] relative"
        >
          {/* Mobile header */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>PsiRumoCerto</h1>
              <p className="text-[11px] text-muted-foreground font-medium">Farmácia Hospitalar</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {forgotOpen ? (
              <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Esqueceu a senha?</h2>
                  <p className="text-sm text-muted-foreground mt-2">Informe seu e-mail e enviaremos um link de redefinição.</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">E-mail</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 text-sm bg-card border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 font-semibold text-sm rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-lg hover:shadow-glow hover:-translate-y-0.5 transition-all">
                    {loading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Enviar Link de Redefinição"}
                  </Button>
                  <button type="button" onClick={() => setForgotOpen(false)} className="text-sm text-primary hover:text-primary/80 w-full text-center font-semibold transition-colors">
                    ← Voltar ao login
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <div className="mb-8">
                  <motion.h2
                    className="text-2xl font-bold text-foreground"
                    style={{ fontFamily: "var(--font-display)" }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Bem-vindo de volta
                  </motion.h2>
                  <motion.p
                    className="text-sm text-muted-foreground mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Acesse o painel de gestão farmacêutica
                  </motion.p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    <Label className="text-xs font-semibold text-foreground">E-mail</Label>
                    <div className="relative group">
                      <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${focusedField === "email" ? "text-primary" : "text-muted-foreground"}`} />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        className="pl-10 h-12 text-sm bg-card border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                        autoComplete="email"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Senha</Label>
                      <button type="button" onClick={() => setForgotOpen(true)} className="text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors">
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${focusedField === "password" ? "text-primary" : "text-muted-foreground"}`} />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        className="pl-10 pr-11 h-12 text-sm bg-card border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 font-semibold text-sm rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-lg hover:shadow-glow hover:-translate-y-0.5 transition-all group"
                    >
                      {loading ? (
                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
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