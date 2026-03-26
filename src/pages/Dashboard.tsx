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
import { useDashboardCore, useConsumoData } from "@/hooks/useDashboardData";
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

const COLORS = ["hsl(152, 58%, 38%)", "hsl(190, 55%, 42%)", "hsl(210, 80%, 55%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(160, 50%, 50%)", "hsl(155, 10%, 46%)"];

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

  const { data: core, isLoading } = useDashboardCore();
  const { data: consumoData = [] } = useConsumoData(period);

  // Fetch consumo 30d for coverage calculation
  const { data: consumo30d = {} } = useQuery({
    queryKey: ["dashboard-consumo-30d-coverage"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from("movimentacoes").select("medicamento_id, quantidade")
        .in("tipo", ["saida", "dispensacao"])
        .gte("created_at", thirtyDaysAgo);
      const cMap: Record<string, number> = {};
      (data || []).forEach((m: any) => {
        if (m.medicamento_id) cMap[m.medicamento_id] = (cMap[m.medicamento_id] || 0) + m.quantidade;
      });
      return cMap;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch today's dispensações count
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

  const meds = core?.meds || [];
  const catData = core?.catData || [];
  const pendingTransfers = core?.pendingTransfers || 0;
  const totalMovements = core?.totalMovements || 0;
  const prescricoesAtivas = core?.prescricoesAtivas || 0;
  const cmm = core?.cmm || 0;

  const stats = {
    total: meds.length,
    controlled: meds.filter(m => m.controlado).length,
    lowStock: meds.filter(m => { const t = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0); return t > 0 && t <= m.estoque_minimo; }).length,
    critical: meds.filter(m => { const t = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0); return t > 0 && t <= m.estoque_minimo * 0.25; }).length,
    outOfStock: meds.filter(m => m.lotes.reduce((s, l) => s + l.quantidade_atual, 0) === 0).length,
    expiringSoon: meds.filter(m => m.lotes.some(l => { const diff = (new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24); return diff <= 60 && diff > 0; })).length,
    pendingTransfers,
  };

  const totalUnits = meds.reduce((s, m) => s + m.lotes.reduce((sl, l) => sl + l.quantidade_atual, 0), 0);
  const topStocked = [...meds].map(m => ({ name: m.nome.length > 18 ? m.nome.slice(0, 18) + "…" : m.nome, qty: m.lotes.reduce((s, l) => s + l.quantidade_atual, 0) })).sort((a, b) => b.qty - a.qty).slice(0, 6);

  const expiredMeds = meds.filter(m => m.lotes.some(l => new Date(l.validade) < now));
  const lowStockMeds = meds.filter(m => { const t = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0); return t > 0 && t <= m.estoque_minimo; });

  // Critical coverage: meds with ≤ 7 days coverage
  const criticalCoverageMeds = useMemo(() => {
    return meds.filter(m => {
      const total = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0);
      if (total === 0) return false;
      const consumo = consumo30d[m.id] || 0;
      if (consumo === 0) return false;
      const cmmDiario = consumo / 30;
      const dias = total / cmmDiario;
      return dias <= 7;
    });
  }, [meds, consumo30d]);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const totalAlerts = expiredMeds.length + lowStockMeds.length + (pendingTransfers > 0 ? 1 : 0);

  // Quick actions with badges
  const quickActions = useMemo(() => [
    { label: "Entrada", desc: "Receber", icon: ArrowDownCircle, path: "/entrada", color: "text-success", bg: "bg-success/8 group-hover:bg-success/12", badge: stats.outOfStock > 0 ? `${stats.outOfStock} em falta` : null },
    { label: "Dispensar", desc: "Saída", icon: ArrowUpCircle, path: "/dispensacao", color: "text-info", bg: "bg-info/8 group-hover:bg-info/12", badge: dispensacoesHoje > 0 ? `${dispensacoesHoje} hoje` : null },
    { label: "Etiquetas", desc: "Imprimir", icon: Barcode, path: "/etiquetas", color: "text-primary", bg: "bg-primary/8 group-hover:bg-primary/12", badge: null },
    { label: "Transferir", desc: "Clínicas", icon: ArrowLeftRight, path: "/transferencias", color: "text-warning", bg: "bg-warning/8 group-hover:bg-warning/12", badge: pendingTransfers > 0 ? `${pendingTransfers} pendentes` : null },
  ], [stats.outOfStock, dispensacoesHoje, pendingTransfers]);

  if (isLoading)
    return (
      <AppLayout title="Dashboard" subtitle="Carregando...">
        <div className="space-y-4">
          <Skeleton className="h-24 sm:h-28 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 sm:h-20 rounded-xl" />)}
          </div>
          <div className="grid gap-4">
            <Skeleton className="h-56 sm:h-72 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da farmácia hospitalar">
      {/* ── Hero Banner ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl gradient-hero text-white p-4 sm:p-6 lg:p-7 border border-white/[0.06]">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, hsla(172,60%,50%,0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, hsla(258,68%,60%,0.1) 0%, transparent 50%)`,
          }} />
          <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/3" />

          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
            <div className="space-y-1 sm:space-y-2 min-w-0">
              <p className="text-[9px] sm:text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] font-mono">
                {now.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight font-display truncate">
                {greeting()}, <span className="text-white/90">{profile?.nome?.split(" ")[0] || "Usuário"}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {totalUnits.toLocaleString("pt-BR")} un
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {totalMovements} mov.
                </span>
                {totalAlerts > 0 && (
                  <span className="flex items-center gap-1 text-warning">
                    <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {totalAlerts} alerta{totalAlerts > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-1">
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold tabular-nums tracking-tighter font-display leading-none">
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions with badges ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4 sm:mb-6">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
          {quickActions.map((a, i) => (
            <motion.button
              key={a.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              onClick={() => navigate(a.path)}
              className="group flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 rounded-xl border border-border/50 bg-card p-2.5 sm:p-3.5 hover:border-primary/20 hover:shadow-md transition-all duration-200 active:scale-[0.97] text-center sm:text-left relative"
            >
              <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200", a.bg)}>
                <a.icon className={cn("h-3.5 w-3.5 sm:h-4.5 sm:w-4.5", a.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm font-semibold text-foreground leading-tight truncate">{a.label}</p>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-0 sm:mt-0.5 truncate hidden sm:block">{a.desc}</p>
              </div>
              {a.badge && (
                <span className="text-[9px] font-semibold bg-destructive/15 text-destructive rounded-full px-1.5 py-0.5 absolute top-1 right-1 sm:static sm:ml-auto whitespace-nowrap">
                  {a.badge}
                </span>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden sm:block" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Critical Coverage Alert ── */}
      {criticalCoverageMeds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-4 sm:mb-6"
        >
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 sm:p-4 flex items-center gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {criticalCoverageMeds.length} medicamento{criticalCoverageMeds.length > 1 ? "s" : ""} com menos de 7 dias de cobertura estimada
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                {criticalCoverageMeds.slice(0, 3).map(m => m.nome).join(", ")}{criticalCoverageMeds.length > 3 ? ` e mais ${criticalCoverageMeds.length - 3}` : ""}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs gap-1 border-destructive/20 text-destructive hover:bg-destructive/10"
              onClick={() => navigate("/estoque")}
            >
              Ver no Estoque <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── KPI Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 mb-4 sm:mb-6">
        <StatCard title="Medicamentos" value={stats.total} icon={Pill} variant="info" delay={0.12} onClick={() => navigate("/medicamentos")} />
        <StatCard title="Controlados" value={stats.controlled} icon={ShieldCheck} variant="default" delay={0.14} />
        <StatCard title="Estoque Baixo" value={stats.lowStock} icon={Package} variant="warning" delay={0.16} onClick={() => navigate("/alertas")} />
        <StatCard title="Crítico" value={stats.critical} icon={AlertTriangle} variant="critical" delay={0.18} onClick={() => navigate("/alertas")} />
        <StatCard title="Esgotado" value={stats.outOfStock} icon={XCircle} variant="critical" delay={0.20} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-4 sm:mb-6">
        <StatCard title="Vence 60d" value={stats.expiringSoon} icon={Clock} variant="warning" delay={0.22} />
        <StatCard title="Transf." value={stats.pendingTransfers} icon={ArrowLeftRight} variant="info" delay={0.24} onClick={() => navigate("/transferencias")} />
        <StatCard title="CMM" value={cmm} icon={TrendingUp} variant="default" delay={0.26} />
        <StatCard title="Prescrições" value={prescricoesAtivas} icon={FileText} variant="info" delay={0.28} onClick={() => navigate("/prescricoes")} />
      </div>

      {/* ── Charts ── */}
      <div className="grid lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Consumo Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-3">
          <Card className="p-3 sm:p-5 h-full border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/8">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight font-display">Consumo</h3>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">Saídas e dispensações</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-7 sm:h-8 text-[10px] sm:text-xs w-[100px] sm:w-[110px] rounded-lg border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold bg-primary/5 border-primary/15 tabular-nums">
                  {consumoData.reduce((s, d) => s + d.qty, 0).toLocaleString("pt-BR")} un
                </Badge>
              </div>
            </div>
            {consumoData.every(d => d.qty === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
                <Activity className="h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-30" />
                <p className="text-[10px] sm:text-xs">Nenhuma saída no período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={consumoData} margin={{ left: -12, right: 4, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }} interval={Math.max(0, Math.floor(consumoData.length / 6))} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }} width={28} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 10,
                      fontSize: 11,
                      boxShadow: "var(--shadow-elevated)",
                      fontFamily: "var(--font-sans)",
                    }}
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Area type="monotone" dataKey="qty" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorQty)" name="Unidades" dot={false} activeDot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--card))" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Categories Pie */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card className="p-3 sm:p-5 h-full border-border/50">
            <div className="flex items-center gap-2 mb-3 sm:mb-5">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-accent/8">
                <Pill className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-tight font-display">Categorias</h3>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">Distribuição por tipo</p>
              </div>
            </div>
            {catData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground">
                <Pill className="h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-30" />
                <p className="text-[10px] sm:text-xs">Sem dados</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" stroke="hsl(var(--card))" strokeWidth={2} paddingAngle={3}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "var(--shadow-elevated)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1 mt-1 sm:mt-2">
                  {catData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0 ring-2 ring-background" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate flex-1">{c.name}</span>
                      <span className="font-bold tabular-nums text-foreground">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── Top Stock + Alerts ── */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Top Stocked */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="p-3 sm:p-5 h-full border-border/50">
            <div className="flex items-center justify-between mb-3 sm:mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-success/8">
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight font-display">Maiores Estoques</h3>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">Top 6 medicamentos</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-[9px] sm:text-[10px] gap-1 h-6 sm:h-7 text-muted-foreground hover:text-foreground" onClick={() => navigate("/estoque")}>
                Ver <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {topStocked.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 sm:py-14 text-muted-foreground">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-30" />
                <p className="text-[10px] sm:text-xs">Nenhum medicamento</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topStocked} layout="vertical" margin={{ left: 0, right: 4 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "var(--shadow-elevated)" }} />
                  <Bar dataKey="qty" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={12} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Alerts */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-3 sm:p-5 h-full border-border/50">
            <div className="flex items-center justify-between mb-3 sm:mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-warning/8">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight font-display">Alertas</h3>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">Atenção necessária</p>
                </div>
              </div>
              {totalAlerts > 0 && (
                <Button variant="ghost" size="sm" className="text-[9px] sm:text-[10px] gap-1 h-6 sm:h-7 text-muted-foreground hover:text-foreground" onClick={() => navigate("/alertas")}>
                  Ver <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>

            {totalAlerts === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 sm:py-14 text-muted-foreground">
                <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 mb-2 text-success/40" />
                <p className="text-[10px] sm:text-xs font-medium text-success">Tudo em ordem!</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {expiredMeds.slice(0, 3).map(m => (
                  <div key={m.id} className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs rounded-lg border border-destructive/10 bg-destructive/[0.03] p-2 sm:p-3 transition-colors hover:bg-destructive/[0.06]">
                    <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md bg-destructive/10">
                      <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground truncate block text-[10px] sm:text-xs">{m.nome}</span>
                    </div>
                    <Badge variant="outline" className="text-[7px] sm:text-[8px] bg-destructive/8 text-destructive border-destructive/15 uppercase tracking-wider font-bold shrink-0">Vencido</Badge>
                  </div>
                ))}
                {lowStockMeds.slice(0, 3).map(m => (
                  <div key={m.id} className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs rounded-lg border border-warning/10 bg-warning/[0.03] p-2 sm:p-3 transition-colors hover:bg-warning/[0.06]">
                    <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md bg-warning/10">
                      <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-warning" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground truncate block text-[10px] sm:text-xs">{m.nome}</span>
                    </div>
                    <Badge variant="outline" className="text-[7px] sm:text-[8px] bg-warning/8 text-warning border-warning/15 uppercase tracking-wider font-bold shrink-0">Baixo</Badge>
                  </div>
                ))}
                {pendingTransfers > 0 && (
                  <div
                    className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs rounded-lg border border-info/10 bg-info/[0.03] p-2 sm:p-3 cursor-pointer transition-colors hover:bg-info/[0.06]"
                    onClick={() => navigate("/transferencias")}
                  >
                    <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md bg-info/10">
                      <ArrowLeftRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-info" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground">{pendingTransfers} transferência(s)</span>
                    </div>
                    <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-info shrink-0" />
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
