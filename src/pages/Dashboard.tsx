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
  ArrowDownCircle, ArrowUpCircle, FileText,
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
  { label: "Entrada", desc: "Receber", icon: ArrowDownCircle, path: "/entrada", color: "bg-success/8 text-success" },
  { label: "Dispensar", desc: "Registrar saída", icon: ArrowUpCircle, path: "/dispensacao", color: "bg-info/8 text-info" },
  { label: "Etiquetas", desc: "Imprimir", icon: Barcode, path: "/etiquetas", color: "bg-primary/8 text-primary" },
  { label: "Transferir", desc: "Entre clínicas", icon: ArrowLeftRight, path: "/transferencias", color: "bg-warning/8 text-warning" },
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
  const topStocked = [...meds].map(m => ({ name: m.nome.length > 16 ? m.nome.slice(0, 16) + "…" : m.nome, qty: m.lotes.reduce((s, l) => s + l.quantidade_atual, 0) })).sort((a, b) => b.qty - a.qty).slice(0, 6);

  const expiredMeds = meds.filter(m => m.lotes.some(l => new Date(l.validade) < now));
  const lowStockMeds = meds.filter(m => { const t = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0); return t > 0 && t <= m.estoque_minimo; });

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  if (isLoading)
    return (
      <AppLayout title="Dashboard" subtitle="Carregando...">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </AppLayout>
    );

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da farmácia hospitalar">
      {/* Welcome banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-lg gradient-hero text-white relative overflow-hidden border border-white/[0.06]">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, hsla(172,60%,44%,0.1) 25%, hsla(172,60%,44%,0.1) 26%, transparent 27%),
              linear-gradient(90deg, transparent 24%, hsla(172,60%,44%,0.1) 25%, hsla(172,60%,44%,0.1) 26%, transparent 27%)
            `,
            backgroundSize: "40px 40px",
          }} />
          <div className="relative">
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em] mb-1 font-mono-ui">
              {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h2 className="text-lg font-bold tracking-tight">{greeting()}, {profile?.nome?.split(" ")[0] || "Usuário"}</h2>
            <p className="text-xs text-white/40 mt-0.5 font-body">
              {totalUnits.toLocaleString("pt-BR")} unidades em estoque · {totalMovements} movimentações
            </p>
          </div>
          <div className="relative text-right">
            <p className="text-3xl font-bold tabular-nums tracking-tighter">{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-2 mb-5">
        <StatCard title="Total" value={stats.total} icon={Pill} variant="info" delay={0} onClick={() => navigate("/medicamentos")} />
        <StatCard title="Controlados" value={stats.controlled} icon={ShieldCheck} variant="default" delay={0.03} />
        <StatCard title="Baixo" value={stats.lowStock} icon={Package} variant="warning" delay={0.06} onClick={() => navigate("/alertas")} />
        <StatCard title="Crítico" value={stats.critical} icon={AlertTriangle} variant="critical" delay={0.09} onClick={() => navigate("/alertas")} />
        <StatCard title="Esgotado" value={stats.outOfStock} icon={XCircle} variant="critical" delay={0.12} />
        <StatCard title="Vence 60d" value={stats.expiringSoon} icon={Clock} variant="warning" delay={0.15} />
        <StatCard title="Transf." value={stats.pendingTransfers} icon={ArrowLeftRight} variant="info" delay={0.18} onClick={() => navigate("/transferencias")} />
        <StatCard title="CMM" value={cmm} icon={TrendingUp} variant="default" delay={0.21} />
        <StatCard title="Prescrições" value={prescricoesAtivas} icon={FileText} variant="info" delay={0.24} onClick={() => navigate("/prescricoes")} />
      </div>

      {/* Charts + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/8">
                  <TrendingUp className="h-3 w-3 text-primary" />
                </div>
                <h3 className="text-xs font-bold tracking-tight">Consumo</h3>
              </div>
              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-7 text-[10px] w-[120px] font-mono-ui"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-[9px] font-bold bg-primary/5 font-mono-ui">
                  {consumoData.reduce((s, d) => s + d.qty, 0).toLocaleString("pt-BR")} un
                </Badge>
              </div>
            </div>
            {consumoData.every(d => d.qty === 0) ? (
              <p className="text-xs text-muted-foreground text-center py-14 font-body">Nenhuma saída no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={consumoData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }} interval={Math.max(0, Math.floor(consumoData.length / 10))} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }} width={28} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="qty" stroke="hsl(var(--primary))" strokeWidth={1.5} fill="url(#colorQty)" name="Unidades" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <Card className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-success/8">
                <ArrowRight className="h-3 w-3 text-success" />
              </div>
              <h3 className="text-xs font-bold tracking-tight">Ações Rápidas</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((a, i) => (
                <motion.button key={a.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.05 }}
                  onClick={() => navigate(a.path)}
                  className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border/40 p-3 hover:border-primary/25 hover:shadow-card-hover transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-md transition-transform duration-200 group-hover:scale-105", a.color)}>
                    <a.icon className="h-4 w-4" />
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-semibold text-foreground leading-tight">{a.label}</span>
                    <p className="text-[9px] text-muted-foreground mt-0.5 font-body">{a.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Top Stock + Categories */}
      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <Card className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/8">
                <Package className="h-3 w-3 text-primary" />
              </div>
              <h3 className="text-xs font-bold tracking-tight">Top Estoques</h3>
            </div>
            {topStocked.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10 font-body">Nenhum medicamento</p>
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={topStocked} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={12} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {catData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Card className="p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-info/8">
                  <Pill className="h-3 w-3 text-info" />
                </div>
                <h3 className="text-xs font-bold tracking-tight">Por Categoria</h3>
              </div>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={190}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={72} dataKey="value" stroke="none" paddingAngle={2}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {catData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-[11px]">
                      <div className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate font-body">{c.name}</span>
                      <span className="ml-auto font-bold tabular-nums font-mono-ui text-[10px]">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Alerts */}
      {(expiredMeds.length > 0 || lowStockMeds.length > 0 || pendingTransfers > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-warning/8">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                </div>
                <h3 className="text-xs font-bold tracking-tight">Alertas</h3>
              </div>
              <Button variant="ghost" size="sm" className="text-[10px] gap-1 font-semibold h-7" onClick={() => navigate("/alertas")}>
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1.5">
              {expiredMeds.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-3 text-xs rounded-lg border border-destructive/10 bg-destructive/4 p-2.5">
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span className="font-medium">{m.nome}</span>
                  <Badge variant="outline" className="text-[8px] bg-destructive/8 text-destructive ml-auto font-mono-ui uppercase tracking-wider font-bold">Vencido</Badge>
                </div>
              ))}
              {lowStockMeds.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-3 text-xs rounded-lg border border-warning/10 bg-warning/4 p-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                  <span className="font-medium">{m.nome}</span>
                  <Badge variant="outline" className="text-[8px] bg-warning/8 text-warning ml-auto font-mono-ui uppercase tracking-wider font-bold">Baixo</Badge>
                </div>
              ))}
              {pendingTransfers > 0 && (
                <div className="flex items-center gap-3 text-xs rounded-lg border border-info/10 bg-info/4 p-2.5 cursor-pointer hover:bg-info/6 transition-colors" onClick={() => navigate("/transferencias")}>
                  <ArrowLeftRight className="h-3.5 w-3.5 text-info shrink-0" />
                  <span className="font-medium">{pendingTransfers} transferência(s) pendente(s)</span>
                  <ArrowRight className="h-3 w-3 text-info ml-auto" />
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AppLayout>
  );
};

export default Dashboard;