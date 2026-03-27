import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardStats, useConsumoData, useTopStocked, useCategoryData } from "@/hooks/useDashboardData";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell,
  CartesianGrid, Area, AreaChart,
} from "recharts";
import {
  Pill, AlertTriangle, XCircle, Clock, Package, ShieldCheck,
  ClipboardList, Barcode, ArrowLeftRight, TrendingUp, ArrowRight,
  ArrowDownCircle, ArrowUpCircle, FileText, Activity, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COLORS = ["hsl(152, 56%, 36%)", "hsl(178, 48%, 40%)", "hsl(212, 82%, 54%)", "hsl(40, 96%, 50%)", "hsl(4, 76%, 50%)", "hsl(160, 50%, 46%)", "hsl(148, 10%, 42%)"];

const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [now, setNow] = useState(new Date());
  const [period, setPeriod] = useState("30");

  const { data: stats, isLoading } = useDashboardStats();
  const { data: consumoData = [] } = useConsumoData(period);
  const { data: topStocked = [] } = useTopStocked();
  const { data: catData = [] } = useCategoryData();

  const { data: dispensacoesHoje = 0 } = useQuery({
    queryKey: ["dashboard-dispensacoes-hoje"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("movimentacoes").select("id", { count: "exact", head: true })
        .eq("tipo", "dispensacao")
        .gte("created_at", today.toISOString());
      return count || 0;
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const s = stats || {
    total: 0, controlled: 0, lowStock: 0, critical: 0, outOfStock: 0,
    expiringSoon: 0, totalUnits: 0, totalValue: 0, pendingTransfers: 0,
    totalMovements: 0, prescricoesAtivas: 0, cmm: 0,
  };

  const totalAlerts = s.outOfStock + s.critical + s.expiringSoon + (s.pendingTransfers > 0 ? 1 : 0);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const quickActions = useMemo(() => [
    { label: "Entrada", desc: "Receber medicamentos", icon: ArrowDownCircle, path: "/entrada", color: "text-success", bg: "bg-success/6", badge: s.outOfStock > 0 ? `${s.outOfStock} em falta` : null },
    { label: "Dispensar", desc: "Saída de estoque", icon: ArrowUpCircle, path: "/dispensacao", color: "text-info", bg: "bg-info/6", badge: dispensacoesHoje > 0 ? `${dispensacoesHoje} hoje` : null },
    { label: "Etiquetas", desc: "Imprimir etiquetas", icon: Barcode, path: "/etiquetas", color: "text-primary", bg: "bg-primary/6", badge: null },
    { label: "Transferir", desc: "Entre clínicas", icon: ArrowLeftRight, path: "/transferencias", color: "text-warning", bg: "bg-warning/6", badge: s.pendingTransfers > 0 ? `${s.pendingTransfers} pendentes` : null },
  ], [s.outOfStock, dispensacoesHoje, s.pendingTransfers]);

  if (isLoading)
    return (
      <AppLayout title="Dashboard" subtitle="Carregando...">
        <div className="space-y-4">
          <Skeleton className="h-28 sm:h-32 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <div className="grid gap-4">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da farmácia hospitalar">
      {/* ── HERO BANNER ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 25 }} className="mb-5 sm:mb-7">
        <div className="relative overflow-hidden rounded-2xl gradient-hero text-white p-5 sm:p-7 lg:p-8 border border-white/[0.06]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(ellipse at 10% 60%, hsla(152,55%,45%,0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 90% 20%, hsla(178,48%,42%,0.1) 0%, transparent 50%)`,
          }} />
          <div className="absolute top-0 right-0 w-56 sm:w-80 h-56 sm:h-80 bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0.5px)",
            backgroundSize: "20px 20px",
          }} />

          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] font-mono">
                {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-display leading-none">
                {greeting()}, <span className="text-white/85">{profile?.nome?.split(" ")[0] || "Usuário"}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40 font-medium">
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  {s.totalUnits.toLocaleString("pt-BR")} unidades
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  {s.totalMovements} movimentações
                </span>
                {totalAlerts > 0 && (
                  <span className="flex items-center gap-1.5 text-warning/80">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {totalAlerts} alerta{totalAlerts > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tighter font-display leading-none" style={{ textShadow: '0 0 40px hsla(152,55%,48%,0.25)' }}>
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── QUICK ACTIONS ── */}
      <div className="mb-5 sm:mb-7">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="group relative flex items-center gap-3 rounded-2xl border border-border/40 bg-card p-3.5 sm:p-4 hover:border-primary/25 transition-all duration-300 active:scale-[0.97] text-left overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110", a.bg)}>
                <a.icon className={cn("h-[18px] w-[18px]", a.color)} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-[13px] font-bold text-foreground leading-tight">{a.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 hidden sm:block">{a.desc}</p>
              </div>
              {a.badge && (
                <span className="text-[9px] font-bold bg-destructive/10 text-destructive rounded-full px-2 py-0.5 shrink-0">
                  {a.badge}
                </span>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all hidden sm:block" />
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-5 sm:mb-7">
        <StatCard title="Medicamentos" value={s.total} icon={Pill} variant="info" delay={0} onClick={() => navigate("/medicamentos")} />
        <StatCard title="Controlados" value={s.controlled} icon={ShieldCheck} variant="default" delay={0.02} />
        <StatCard title="Estoque Baixo" value={s.lowStock} icon={Package} variant="warning" delay={0.04} onClick={() => navigate("/alertas")} />
        <StatCard title="Crítico" value={s.critical} icon={AlertTriangle} variant="critical" delay={0.06} onClick={() => navigate("/alertas")} />
        <StatCard title="Esgotado" value={s.outOfStock} icon={XCircle} variant="critical" delay={0.08} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-7">
        <StatCard title="Vence 60d" value={s.expiringSoon} icon={Clock} variant="warning" delay={0.1} />
        <StatCard title="Transferências" value={s.pendingTransfers} icon={ArrowLeftRight} variant="info" delay={0.12} onClick={() => navigate("/transferencias")} />
        <StatCard title="CMM" value={s.cmm} icon={TrendingUp} variant="default" delay={0.14} />
        <StatCard title="Prescrições" value={s.prescricoesAtivas} icon={FileText} variant="info" delay={0.16} onClick={() => navigate("/prescricoes")} />
      </div>

      {/* ── CHARTS ── */}
      <div className="grid lg:grid-cols-5 gap-3 sm:gap-4 mb-5 sm:mb-7">
        {/* Consumo */}
        <div className="lg:col-span-3">
          <Card className="p-4 sm:p-6 h-full border-border/40 rounded-2xl transition-all duration-300 hover:shadow-lg" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/6 ring-1 ring-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight font-display">Consumo</h3>
                  <p className="text-[10px] text-muted-foreground/50 hidden sm:block">Saídas e dispensações no período</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-8 text-[11px] w-[110px] rounded-xl border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-[10px] font-bold bg-primary/4 border-primary/10 tabular-nums">
                  {consumoData.reduce((sum, d) => sum + d.qty, 0).toLocaleString("pt-BR")} un
                </Badge>
              </div>
            </div>
            {consumoData.every(d => d.qty === 0) ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
                <Activity className="h-8 w-8 mb-3" strokeWidth={1.2} />
                <p className="text-xs font-medium">Nenhuma saída no período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={consumoData} margin={{ left: -12, right: 4, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.5)", fontFamily: "var(--font-mono)" }} interval={Math.max(0, Math.floor(consumoData.length / 6))} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.5)", fontFamily: "var(--font-mono)" }} width={30} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border) / 0.4)",
                      borderRadius: 14,
                      fontSize: 11,
                      boxShadow: "var(--shadow-elevated)",
                      fontFamily: "var(--font-sans)",
                    }}
                    cursor={{ stroke: "hsl(var(--primary) / 0.3)", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Area type="monotone" dataKey="qty" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorQty)" name="Unidades" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--card))" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Categories */}
        <div className="lg:col-span-2">
          <Card className="p-4 sm:p-6 h-full border-border/40 rounded-2xl transition-all duration-300 hover:shadow-lg" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/6 ring-1 ring-accent/10">
                <Pill className="h-4 w-4 text-accent" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight font-display">Categorias</h3>
                <p className="text-[10px] text-muted-foreground/50 hidden sm:block">Distribuição por tipo</p>
              </div>
            </div>
            {catData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
                <Pill className="h-8 w-8 mb-3" strokeWidth={1.2} />
                <p className="text-xs font-medium">Sem dados</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" stroke="hsl(var(--card))" strokeWidth={3} paddingAngle={3}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.4)", borderRadius: 14, fontSize: 11, boxShadow: "var(--shadow-elevated)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1 mt-2">
                  {catData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2.5 text-[11px] px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground/70 truncate flex-1">{c.name}</span>
                      <span className="font-bold tabular-nums text-foreground font-mono text-[10px]">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── TOP STOCK + ALERTS ── */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Card className="p-4 sm:p-6 h-full border-border/40 rounded-2xl transition-all duration-300 hover:shadow-lg" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/6 ring-1 ring-success/10">
                  <Package className="h-4 w-4 text-success" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight font-display">Maiores Estoques</h3>
                  <p className="text-[10px] text-muted-foreground/50 hidden sm:block">Top 6 medicamentos</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7 text-muted-foreground/50 hover:text-foreground rounded-lg" onClick={() => navigate("/estoque")}>
                Ver <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {topStocked.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground/40">
                <Package className="h-8 w-8 mb-3" strokeWidth={1.2} />
                <p className="text-xs font-medium">Nenhum medicamento</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topStocked} layout="vertical" margin={{ left: 0, right: 4 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.5)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground) / 0.6)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.4)", borderRadius: 14, fontSize: 11, boxShadow: "var(--shadow-elevated)" }} />
                  <Bar dataKey="qty" fill="url(#barGrad)" radius={[0, 8, 8, 0]} barSize={14} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-4 sm:p-6 h-full border-border/40 rounded-2xl transition-all duration-300 hover:shadow-lg" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/6 ring-1 ring-warning/10">
                  <Zap className="h-4 w-4 text-warning" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight font-display">Alertas</h3>
                  <p className="text-[10px] text-muted-foreground/50 hidden sm:block">Atenção necessária</p>
                </div>
              </div>
              {totalAlerts > 0 && (
                <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7 text-muted-foreground/50 hover:text-foreground rounded-lg" onClick={() => navigate("/alertas")}>
                  Ver <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>

            {totalAlerts === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground/40">
                <ShieldCheck className="h-8 w-8 mb-3 text-success/40" strokeWidth={1.2} />
                <p className="text-xs font-bold text-success/60">Tudo em ordem!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {s.outOfStock > 0 && (
                  <div className="flex items-center gap-3 text-xs rounded-xl border border-destructive/8 bg-destructive/[0.02] p-3 cursor-pointer transition-all hover:bg-destructive/[0.04] hover:border-destructive/15" onClick={() => navigate("/alertas")}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/6">
                      <XCircle className="h-3.5 w-3.5 text-destructive" strokeWidth={1.8} />
                    </div>
                    <span className="font-bold text-foreground truncate flex-1 text-[11px]">{s.outOfStock} medicamento(s) esgotado(s)</span>
                    <Badge variant="outline" className="text-[8px] bg-destructive/6 text-destructive border-destructive/10 uppercase tracking-wider font-bold">Crítico</Badge>
                  </div>
                )}
                {s.critical > 0 && (
                  <div className="flex items-center gap-3 text-xs rounded-xl border border-destructive/8 bg-destructive/[0.02] p-3 cursor-pointer transition-all hover:bg-destructive/[0.04] hover:border-destructive/15" onClick={() => navigate("/alertas")}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/6">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" strokeWidth={1.8} />
                    </div>
                    <span className="font-bold text-foreground truncate flex-1 text-[11px]">{s.critical} em estoque crítico</span>
                    <Badge variant="outline" className="text-[8px] bg-destructive/6 text-destructive border-destructive/10 uppercase tracking-wider font-bold">Crítico</Badge>
                  </div>
                )}
                {s.lowStock > 0 && (
                  <div className="flex items-center gap-3 text-xs rounded-xl border border-warning/8 bg-warning/[0.02] p-3 cursor-pointer transition-all hover:bg-warning/[0.04] hover:border-warning/15" onClick={() => navigate("/alertas")}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/6">
                      <Package className="h-3.5 w-3.5 text-warning" strokeWidth={1.8} />
                    </div>
                    <span className="font-bold text-foreground truncate flex-1 text-[11px]">{s.lowStock} com estoque baixo</span>
                    <Badge variant="outline" className="text-[8px] bg-warning/6 text-warning border-warning/10 uppercase tracking-wider font-bold">Baixo</Badge>
                  </div>
                )}
                {s.expiringSoon > 0 && (
                  <div className="flex items-center gap-3 text-xs rounded-xl border border-warning/8 bg-warning/[0.02] p-3 cursor-pointer transition-all hover:bg-warning/[0.04] hover:border-warning/15" onClick={() => navigate("/alertas")}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/6">
                      <Clock className="h-3.5 w-3.5 text-warning" strokeWidth={1.8} />
                    </div>
                    <span className="font-bold text-foreground truncate flex-1 text-[11px]">{s.expiringSoon} próximo(s) do vencimento</span>
                    <Badge variant="outline" className="text-[8px] bg-warning/6 text-warning border-warning/10 uppercase tracking-wider font-bold">60 dias</Badge>
                  </div>
                )}
                {s.pendingTransfers > 0 && (
                  <div
                    className="flex items-center gap-3 text-xs rounded-xl border border-info/8 bg-info/[0.02] p-3 cursor-pointer transition-all hover:bg-info/[0.04] hover:border-info/15"
                    onClick={() => navigate("/transferencias")}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/6">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-info" strokeWidth={1.8} />
                    </div>
                    <span className="font-bold text-foreground flex-1 text-[11px]">{s.pendingTransfers} transferência(s) pendente(s)</span>
                    <ArrowRight className="h-3.5 w-3.5 text-info/50 shrink-0" />
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
