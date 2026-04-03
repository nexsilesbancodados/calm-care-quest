import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, Shield, BarChart3, Package, Zap,
  Pill, HeartPulse, Building2, Star, Activity, Sparkles, Users, Clock,
  CheckCircle2, TrendingUp,
} from "lucide-react";
import logoImg from "@/assets/logo.jpg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const features = [
  { icon: Package, title: "Gestão de Estoque", desc: "Controle por lotes com FEFO automático e quarentena" },
  { icon: Shield, title: "Substâncias Controladas", desc: "Rastreabilidade completa em conformidade ANVISA" },
  { icon: BarChart3, title: "Relatórios Avançados", desc: "CMM, Curva ABC e análises de produtividade" },
  { icon: Zap, title: "Transferências Ágeis", desc: "Logística entre clínicas parceiras em tempo real" },
];

const stats = [
  { value: "99.9%", label: "Uptime", icon: Activity },
  { value: "2.5k+", label: "Usuários", icon: Users },
  { value: "<1s", label: "Resposta", icon: Clock },
];

const Login = () => {
  const navigate = useNavigate();
  const { login, resetPassword, session, loading: authLoading, refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedFilial, setSelectedFilial] = useState("");
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const loadFiliais = async () => {
      const { data } = await supabase
        .from("filiais")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (data) setFiliais(data);
    };
    loadFiliais();
  }, []);

  useEffect(() => {
    if (!authLoading && session && !loading) navigate("/");
  }, [session, authLoading, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    if (!selectedFilial) { toast.error("Selecione sua unidade"); return; }
    setLoading(true);
    const { error } = await login(email, password);
    if (error) { setLoading(false); toast.error(error); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); toast.error("Erro ao verificar usuário"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role === "admin") {
      const { error: filialError } = await supabase.rpc("set_active_filial", { _filial_id: selectedFilial });
      if (filialError) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error("Não foi possível ativar a unidade selecionada.");
        return;
      }
      await refreshProfile();
      setLoading(false);
      toast.success("Login realizado com sucesso!");
      navigate("/");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("filial_id")
      .eq("user_id", user.id)
      .single();

    if (!profileData?.filial_id) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Seu perfil não está vinculado a nenhuma unidade. Contate o administrador.");
      return;
    }

    if (profileData.filial_id !== selectedFilial) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Você não pertence a esta unidade. Selecione a unidade correta.");
      return;
    }

    await refreshProfile();
    setLoading(false);
    toast.success("Login realizado com sucesso!");
    navigate("/", { replace: true });
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
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* ─── Left Hero Panel ─── */}
      <div className="hidden lg:flex lg:w-[54%] xl:w-[56%] relative flex-col">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(200,50%,8%)] via-[hsl(195,45%,12%)] to-[hsl(210,40%,10%)]" />

        {/* Secondary depth gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-[hsl(200,45%,6%)/20]" />

        {/* Animated orbs */}
        <div className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-20 -top-20 -right-20"
          style={{ background: "radial-gradient(circle, hsl(195 80% 50%), transparent 70%)" }} />
        <div className="absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-15 -bottom-10 -left-10"
          style={{ background: "radial-gradient(circle, hsl(160 60% 40%), transparent 70%)" }} />
        <div className="absolute w-[350px] h-[350px] rounded-full blur-2xl opacity-10 top-1/3 left-1/2 -translate-x-1/2"
          style={{ background: "radial-gradient(circle, hsl(205 85% 55%), transparent 70%)" }} />

        {/* Geometric mesh overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(30deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
            linear-gradient(150deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
            linear-gradient(30deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
            linear-gradient(150deg, white 12%, transparent 12.5%, transparent 87%, white 87.5%, white),
            linear-gradient(60deg, hsla(0,0%,100%,0.06) 25%, transparent 25.5%, transparent 75%, hsla(0,0%,100%,0.06) 75%),
            linear-gradient(60deg, hsla(0,0%,100%,0.06) 25%, transparent 25.5%, transparent 75%, hsla(0,0%,100%,0.06) 75%)
          `,
          backgroundSize: "80px 140px",
          backgroundPosition: "0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px",
        }} />

        {/* Floating decorative icons */}
        {[
          { Icon: Pill, x: "12%", y: "18%", size: 22, opacity: 0.06 },
          { Icon: HeartPulse, x: "78%", y: "12%", size: 20, opacity: 0.05 },
          { Icon: Shield, x: "88%", y: "68%", size: 18, opacity: 0.04 },
          { Icon: Activity, x: "8%", y: "78%", size: 24, opacity: 0.05 },
          { Icon: Sparkles, x: "65%", y: "82%", size: 16, opacity: 0.04 },
          { Icon: TrendingUp, x: "40%", y: "8%", size: 18, opacity: 0.04 },
        ].map((fi, i) => (
          <div key={i} className="absolute text-white" style={{ left: fi.x, top: fi.y, opacity: fi.opacity }}>
            <fi.Icon style={{ width: fi.size, height: fi.size }} />
          </div>
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Logo header */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-white/20 to-white/5 blur-sm" />
              <img
                src={logoImg}
                alt="PsiRumoCerto"
                className="relative h-14 w-14 rounded-full object-cover ring-2 ring-white/20 shadow-2xl"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                PsiRumoCerto
              </h1>
              <p className="text-[11px] text-white/40 font-medium tracking-widest uppercase">
                Gestão Farmacêutica Hospitalar
              </p>
            </div>
          </div>

          {/* Central content */}
          <div className="space-y-8 max-w-lg">
            <div>
              <p className="text-[13px] text-white/30 font-semibold uppercase tracking-widest mb-3">
                Plataforma Completa
              </p>
              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                Controle total da sua
                <br />
                <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                  farmácia hospitalar
                </span>
              </h2>
              <p className="text-sm text-white/35 mt-3 leading-relaxed max-w-md">
                Gerencie estoque, prescrições e dispensações com segurança e rastreabilidade completa para hospitais psiquiátricos.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feat) => (
                <div
                  key={feat.title}
                  className="group relative p-4 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-500"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.1] to-white/[0.04] mb-3 group-hover:from-white/[0.14] group-hover:to-white/[0.06] transition-all duration-500 shadow-inner">
                      <feat.icon className="h-[18px] w-[18px] text-white/60 group-hover:text-white/80 transition-colors duration-500" />
                    </div>
                    <p className="text-[13px] font-semibold text-white/80 group-hover:text-white transition-colors duration-300">
                      {feat.title}
                    </p>
                    <p className="text-[11px] text-white/30 mt-1 leading-relaxed group-hover:text-white/40 transition-colors duration-300">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 pt-2">
              {stats.map((s, i) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                    <s.icon className="h-3.5 w-3.5 text-white/40" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white/80">{s.value}</p>
                    <p className="text-[10px] text-white/30">{s.label}</p>
                  </div>
                  {i < stats.length - 1 && <div className="w-px h-8 bg-white/[0.06] ml-4" />}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/20">© 2026 PsiRumoCerto — v2.1</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-pulse shadow-lg shadow-emerald-400/20" />
              <span className="text-[11px] text-white/25 font-medium">Sistema Operacional</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Login Panel ─── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        {/* Subtle background texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="absolute inset-0 opacity-[0.012] dark:opacity-[0.025]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 0.5px, transparent 0.5px)",
          backgroundSize: "28px 28px",
        }} />

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-72 h-72 opacity-[0.04]"
          style={{ background: "radial-gradient(circle at top right, hsl(var(--primary)), transparent 70%)" }} />

        <div className="w-full max-w-[400px] relative">
          {/* Mobile header */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-sm" />
              <img
                src={logoImg}
                alt="PsiRumoCerto"
                className="relative h-12 w-12 rounded-full object-cover ring-2 ring-primary/20 shadow-xl"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>PsiRumoCerto</h1>
              <p className="text-[11px] text-muted-foreground font-medium">Farmácia Hospitalar</p>
            </div>
          </div>

          {forgotOpen ? (
            /* ─── Forgot Password ─── */
            <div>
              <div className="mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  Esqueceu a senha?
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Informe seu e-mail e enviaremos um link de redefinição.
                </p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">E-mail</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 text-sm bg-card border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 font-semibold text-sm rounded-xl gradient-primary text-primary-foreground shadow-lg hover:shadow-glow hover:-translate-y-0.5 transition-all">
                  {loading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Enviar Link de Redefinição"}
                </Button>
                <button type="button" onClick={() => setForgotOpen(false)} className="text-sm text-primary hover:text-primary/80 w-full text-center font-semibold transition-colors">
                  ← Voltar ao login
                </button>
              </form>
            </div>
          ) : (
            /* ─── Login Form ─── */
            <div>
              <div className="mb-8">
                <div className="hidden lg:flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4 shadow-sm">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  Bem-vindo de volta
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Acesse o painel de gestão da sua farmácia hospitalar
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">E-mail</Label>
                  <div className="relative group">
                    <Mail className={cn(
                      "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
                      focusedField === "email" ? "text-primary" : "text-muted-foreground"
                    )} />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      className="pl-10 h-12 text-sm bg-card border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl transition-all"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground/80">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      Esqueceu?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className={cn(
                      "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
                      focusedField === "password" ? "text-primary" : "text-muted-foreground"
                    )} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      className="pl-10 pr-11 h-12 text-sm bg-card border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl transition-all"
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
                </div>

                {/* Filial */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Unidade Hospitalar</Label>
                  <div className="relative group">
                    <Building2 className={cn(
                      "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 z-10 transition-colors duration-200",
                      focusedField === "filial" ? "text-primary" : "text-muted-foreground"
                    )} />
                    <select
                      value={selectedFilial}
                      onChange={(e) => setSelectedFilial(e.target.value)}
                      onFocus={() => setFocusedField("filial")}
                      onBlur={() => setFocusedField(null)}
                      className={cn(
                        "w-full pl-10 pr-4 h-12 text-sm bg-card border border-border/60 rounded-xl appearance-none text-foreground cursor-pointer",
                        "focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all",
                        !selectedFilial && "text-muted-foreground/60"
                      )}
                    >
                      <option value="" disabled>Selecione sua unidade</option>
                      {filiais.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                    {/* Custom chevron */}
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full h-12 font-semibold text-sm rounded-xl shadow-lg transition-all duration-300 group",
                      "gradient-primary text-primary-foreground",
                      "hover:shadow-glow hover:-translate-y-0.5",
                      "active:translate-y-0 active:shadow-md",
                    )}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2.5">
                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        <span>Autenticando...</span>
                      </div>
                    ) : (
                      <>
                        Entrar no Sistema
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/40" />
                  </div>
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {[
                    { icon: Shield, text: "Conforme ANVISA" },
                    { icon: Lock, text: "Dados criptografados" },
                    { icon: CheckCircle2, text: "Auditoria completa" },
                  ].map((badge) => (
                    <div key={badge.text} className="flex items-center gap-1.5 group cursor-default">
                      <badge.icon className="h-3 w-3 text-success/70 group-hover:text-success transition-colors" />
                      <span className="text-[10px] text-muted-foreground/70 font-medium whitespace-nowrap group-hover:text-muted-foreground transition-colors">
                        {badge.text}
                      </span>
                    </div>
                  ))}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
