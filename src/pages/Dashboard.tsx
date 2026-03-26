import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardCore, useConsumoData } from "@/hooks/useDashboardData";
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

const COLORS = ["hsl(258, 68%, 52%)", "hsl(172, 60%, 42%)", "hsl(210, 80%, 55%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(280, 60%, 55%)", "hsl(252, 10%, 46%)"];

const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
];

const quickActions = [
  { label: "Entrada", desc: "Receber medicamentos", icon: ArrowDownCircle, path: "/entrada", color: "text-success", bg: "bg-success/8 group-hover:bg-success/12" },
  { label: "Dispensar", desc: "Registrar saída", icon: ArrowUpCircle, path: "/dispensacao", color: "text-info", bg: "bg-info/8 group-hover:bg-info/12" },
  { label: "Etiquetas", desc: "Gerar e imprimir", icon: Barcode, path: "/etiquetas", color: "text-primary", bg: "bg-primary/8 group-hover:bg-primary/12" },
  { label: "Transferir", desc: "Entre unidades", icon: ArrowLeftRight, path: "/transferencias", color: "text-warning", bg: "bg-warning/8 group-hover:bg-warning/12" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [now, setNow] = useState(new Date());
  const [period, setPeriod] = useState("30");

  const { data: core, isLoading } = useDashboardCore();
  const { data: consumoData = [] } = useConsumoData(period);

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
  const topStocked = [...meds].map(m => ({ name: m.nome.length > 20 ? m.nome.slice(0, 20) + "…" : m.nome, qty: m.lotes.reduce((s, l) => s + l.quantidade_atual, 0) })).sort((a, b) => b.qty - a.qty).slice(0, 6);

  const expiredMeds = meds.filter(m => m.lotes.some(l => new Date(l.validade) < now));
  const lowStockMeds = meds.filter(m => { const t = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0); return t > 0 && t <= m.estoque_minimo; });

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const totalAlerts = expiredMeds.length + lowStockMeds.length + (pendingTransfers > 0 ? 1 : 0);

  if (isLoading)
    return (
      <AppLayout title="Dashboard" subtitle="Carregando...">
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da farmácia hospitalar">
      {/* ── Hero Banner ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="relative overflow-hidden rounded-2xl gradient-hero text-white p-6 sm:p-7 border border-white/[0.06]">
          {/* Mesh overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, hsla(172,60%,50%,0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, hsla(258,68%,60%,0.1) 0%, transparent 50%)`,
          }} />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/3" />

          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] font-mono">
                {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">
                {greeting()}, <span className="text-white/90">{profile?.nome?.split(" ")[0] || "Usuário"}</span>
              </h1>
              <div className="flex items-center gap-4 text-xs text-white/50">
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  {totalUnits.toLocaleString("pt-BR")} unidades
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  {totalMovements} movimentações
                </span>
                {totalAlerts > 0 && (
                  <span className="flex items-center gap-1.5 text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {totalAlerts} alerta{totalAlerts > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right space-y-1">
              <p className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tighter font-display leading-none">
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[10px] text-white/30 font-mono">{now.toLocaleTimeString("pt-BR", { second: "2-digit" }).split(":").pop()}s</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions Row ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {quickActions.map((a, i) => (
            <motion.button
              key={a.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              onClick={() => navigate(a.path)}
              className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3.5 hover:border-primary/20 hover:shadow-md transition-all duration-200 active:scale-[0.97] text-left"
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200", a.bg)}>
                <a.icon className={cn("h-4.5 w-4.5", a.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{a.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── KPI Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-6">
        <StatCard title="Medicamentos" value={stats.total} icon={Pill} variant="info" delay={0.12} onClick={() => navigate("/medicamentos")} />
        <StatCard title="Controlados" value={stats.controlled} icon={ShieldCheck} variant="default" delay={0.14} />
        <StatCard title="Estoque Baixo" value={stats.lowStock} icon={Package} variant="warning" delay={0.16} onClick={() => navigate("/alertas")} />
        <StatCard title="Crítico" value={stats.critical} icon={AlertTriangle} variant="critical" delay={0.18} onClick={() => navigate("/alertas")} />
        <StatCard title="Esgotado" value={stats.outOfStock} icon={XCircle} variant="critical" delay={0.20} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        <StatCard title="Vence em 60d" value={stats.expiringSoon} icon={Clock} variant="warning" delay={0.22} />
        <StatCard title="Transferências" value={stats.pendingTransfers} icon={ArrowLeftRight} variant="info" delay={0.24} onClick={() => navigate("/transferencias")} />
        <StatCard title="CMM" value={cmm} icon={TrendingUp} variant="default" delay={0.26} />
        <StatCard title="Prescrições" value={prescricoesAtivas} icon={FileText} variant="info" delay={0.28} onClick={() => navigate("/prescricoes")} />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-5 gap-4 mb-6">
        {/* Consumo Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-3">
          <Card className="p-5 h-full border-border/50">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight font-display">Consumo</h3>
                  <p className="text-[10px] text-muted-foreground">Saídas e dispensações no período</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-8 text-xs w-[110px] rounded-lg border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-[10px] font-bold bg-primary/5 border-primary/15 tabular-nums">
                  {consumoData.reduce((s, d) => s + d.qty, 0).toLocaleString("pt-BR")} un
                </Badge>
              </div>
            </div>
            {consumoData.every(d => d.qty === 0) ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Nenhuma saída no período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={consumoData} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }} interval={Math.max(0, Math.floor(consumoData.length / 8))} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }} width={32} axisLine={false} tickLine={false} />
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
                  <Area type="monotone" dataKey="qty" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorQty)" name="Unidades" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--card))" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Categories Pie */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card className="p-5 h-full border-border/50">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/8">
                <Pill className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight font-display">Categorias</h3>
                <p className="text-[10px] text-muted-foreground">Distribuição por tipo</p>
              </div>
            </div>
            {catData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Pill className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Sem dados de categoria</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="hsl(var(--card))" strokeWidth={2} paddingAngle={3}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "var(--shadow-elevated)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1.5 mt-2">
                  {catData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2.5 text-xs group/cat px-2 py-1 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate flex-1">{c.name}</span>
                      <span className="font-bold tabular-nums text-foreground text-[11px]">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── Top Stock + Alerts ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Stocked */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="p-5 h-full border-border/50">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/8">
                  <Package className="h-4 w-4 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight font-display">Maiores Estoques</h3>
                  <p className="text-[10px] text-muted-foreground">Top 6 medicamentos</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7 text-muted-foreground hover:text-foreground" onClick={() => navigate("/estoque")}>
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {topStocked.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Nenhum medicamento</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topStocked} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "var(--shadow-elevated)" }} />
                  <Bar dataKey="qty" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={14} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Alerts */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5 h-full border-border/50">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/8">
                  <Zap className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight font-display">Alertas</h3>
                  <p className="text-[10px] text-muted-foreground">Atenção necessária</p>
                </div>
              </div>
              {totalAlerts > 0 && (
                <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7 text-muted-foreground hover:text-foreground" onClick={() => navigate("/alertas")}>
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>

            {totalAlerts === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <ShieldCheck className="h-8 w-8 mb-2 text-success/40" />
                <p className="text-xs font-medium text-success">Tudo em ordem!</p>
                <p className="text-[10px] text-muted-foreground mt-1">Nenhum alerta ativo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expiredMeds.slice(0, 3).map(m => (
                  <div key={m.id} className="flex items-center gap-3 text-xs rounded-lg border border-destructive/10 bg-destructive/[0.03] p-3 transition-colors hover:bg-destructive/[0.06]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-destructive/10">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground truncate block">{m.nome}</span>
                      <span className="text-[10px] text-destructive/70">Lote vencido</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] bg-destructive/8 text-destructive border-destructive/15 uppercase tracking-wider font-bold shrink-0">Vencido</Badge>
                  </div>
                ))}
                {lowStockMeds.slice(0, 3).map(m => (
                  <div key={m.id} className="flex items-center gap-3 text-xs rounded-lg border border-warning/10 bg-warning/[0.03] p-3 transition-colors hover:bg-warning/[0.06]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warning/10">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground truncate block">{m.nome}</span>
                      <span className="text-[10px] text-warning/70">Abaixo do mínimo</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] bg-warning/8 text-warning border-warning/15 uppercase tracking-wider font-bold shrink-0">Baixo</Badge>
                  </div>
                ))}
                {pendingTransfers > 0 && (
                  <div
                    className="flex items-center gap-3 text-xs rounded-lg border border-info/10 bg-info/[0.03] p-3 cursor-pointer transition-colors hover:bg-info/[0.06]"
                    onClick={() => navigate("/transferencias")}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-info/10">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-info" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground">{pendingTransfers} transferência(s) pendente(s)</span>
                      <span className="text-[10px] text-info/70 block">Aguardando aprovação</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-info shrink-0" />
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
