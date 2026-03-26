import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell,
  CartesianGrid, Area, AreaChart,
} from "recharts";
import {
  Pill, AlertTriangle, XCircle, Clock, Package, ShieldCheck,
  ClipboardList, Barcode, ArrowLeftRight, TrendingUp, ArrowRight,
  ArrowDownCircle, ArrowUpCircle, Sparkles, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Medicamento, Lote } from "@/types/database";

const COLORS = ["hsl(220, 65%, 38%)", "hsl(210, 80%, 55%)", "hsl(160, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(250, 55%, 55%)", "hsl(220, 10%, 46%)"];

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
];

function getPeriodDates(period: string) {
  const now = new Date();
  let from: Date;
  let to = now;
  if (period === "this_month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "last_month") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    from = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);
  }
  return { from, to };
}

const quickActions = [
  { label: "Entrada", desc: "Receber medicamentos", icon: ArrowDownCircle, path: "/entrada", color: "bg-success/10 text-success" },
  { label: "Dispensação", desc: "Registrar saída", icon: ArrowUpCircle, path: "/dispensacao", color: "bg-info/10 text-info" },
  { label: "Etiquetas", desc: "Imprimir códigos", icon: Barcode, path: "/etiquetas", color: "bg-primary/10 text-primary" },
  { label: "Transferência", desc: "Entre clínicas", icon: ArrowLeftRight, path: "/transferencias", color: "bg-warning/10 text-warning" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [consumoData, setConsumoData] = useState<{ day: string; qty: number }[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState(0);
  const [totalMovements, setTotalMovements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [catData, setCatData] = useState<{ name: string; value: number }[]>([]);
  const [period, setPeriod] = useState("30");
  const [cmm, setCmm] = useState(0);
  const [prescricoesAtivas, setPrescricoesAtivas] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch consumo based on period
  const fetchConsumo = async (p: string) => {
    const { from, to } = getPeriodDates(p);
    const { data: movData } = await supabase.from("movimentacoes").select("created_at, quantidade, tipo")
      .in("tipo", ["saida", "dispensacao"])
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at");

    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dayMap: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(to.getTime() - i * 24 * 60 * 60 * 1000);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    (movData || []).forEach((m: any) => {
      const day = m.created_at.slice(0, 10);
      if (dayMap[day] !== undefined) dayMap[day] += m.quantidade;
    });

    const interval = days > 60 ? 6 : days > 14 ? 2 : 1;
    setConsumoData(Object.entries(dayMap).map(([day, qty]) => ({
      day: new Date(day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), qty,
    })));
  };

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: medsData }, { data: lotesData }, { data: catsData }, { data: transData }, { count }, { count: prescCount }] =
        await Promise.all([
          supabase.from("medicamentos").select("*").eq("ativo", true),
          supabase.from("lotes").select("*").eq("ativo", true),
          supabase.from("categorias_medicamento").select("*"),
          supabase.from("transferencias").select("id", { count: "exact" }).eq("status", "pendente"),
          supabase.from("movimentacoes").select("id", { count: "exact", head: true }),
          supabase.from("prescricoes").select("id", { count: "exact", head: true }).eq("status", "ativa"),
        ]);

      setPendingTransfers(transData?.length || 0);
      setTotalMovements(count || 0);
      setPrescricoesAtivas(prescCount || 0);

      const medsWithLotes = (medsData || []).map((m: any) => ({
        ...m, lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
      }));
      setMeds(medsWithLotes);

      setCatData((catsData || []).map((c: any) => ({
        name: c.nome,
        value: medsWithLotes.filter((m: any) => m.categoria_id === c.id).reduce((s: number, m: any) => s + m.lotes.reduce((sl: number, l: any) => sl + l.quantidade_atual, 0), 0),
      })).filter((c: any) => c.value > 0));

      // CMM: average of last 3 months
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { data: cmmData } = await supabase.from("movimentacoes").select("quantidade")
        .in("tipo", ["saida", "dispensacao"])
        .gte("created_at", threeMonthsAgo.toISOString());
      const totalDisp = (cmmData || []).reduce((s: number, m: any) => s + m.quantidade, 0);
      setCmm(Math.round(totalDisp / 3));

      await fetchConsumo("30");
      setLoading(false);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (!loading) fetchConsumo(period);
  }, [period]);

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

  if (loading)
    return (
      <AppLayout title="Dashboard" subtitle="Carregando...">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </AppLayout>
    );

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da farmácia hospitalar">
      {/* Welcome + Time */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl gradient-hero text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-white/70" />
              <span className="text-xs font-medium text-white/60">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
            <h2 className="text-xl font-bold">{greeting()}, {profile?.nome?.split(" ")[0] || "Usuário"}!</h2>
            <p className="text-sm text-white/60 mt-0.5">{totalUnits.toLocaleString("pt-BR")} unidades em estoque • {totalMovements} movimentações registradas</p>
          </div>
          <div className="relative text-right">
            <p className="text-3xl font-bold tabular-nums">{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-2 sm:gap-3 mb-6">
        <StatCard title="Total" value={stats.total} icon={Pill} variant="info" delay={0} onClick={() => navigate("/medicamentos")} />
        <StatCard title="Controlados" value={stats.controlled} icon={ShieldCheck} variant="default" delay={0.04} />
        <StatCard title="Est. Baixo" value={stats.lowStock} icon={Package} variant="warning" delay={0.08} onClick={() => navigate("/alertas")} />
        <StatCard title="Crítico" value={stats.critical} icon={AlertTriangle} variant="critical" delay={0.12} onClick={() => navigate("/alertas")} />
        <StatCard title="Esgotados" value={stats.outOfStock} icon={XCircle} variant="critical" delay={0.16} />
        <StatCard title="Vence 60d" value={stats.expiringSoon} icon={Clock} variant="warning" delay={0.2} />
        <StatCard title="Transf." value={stats.pendingTransfers} icon={ArrowLeftRight} variant="info" delay={0.24} onClick={() => navigate("/transferencias")} />
        <StatCard title="CMM" value={cmm} icon={TrendingUp} variant="default" delay={0.28} />
        <StatCard title="Prescrições" value={prescricoesAtivas} icon={FileText} variant="info" delay={0.32} onClick={() => navigate("/prescricoes")} />
      </div>

      {/* Consumo Chart + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="lg:col-span-2">
          <Card className="p-5 h-full relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-info/30 to-transparent rounded-t-2xl" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                </div>
                Consumo
              </h3>
              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-7 text-[11px] w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-[10px] font-semibold bg-primary/5">
                  {consumoData.reduce((s, d) => s + d.qty, 0).toLocaleString("pt-BR")} un.
                </Badge>
              </div>
            </div>
            {consumoData.every(d => d.qty === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-16">Nenhuma saída no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={consumoData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={Math.max(0, Math.floor(consumoData.length / 10))} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }} />
                  <Area type="monotone" dataKey="qty" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorQty)" name="Unidades" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
          <Card className="p-5 h-full relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-success/40 via-info/30 to-transparent rounded-t-2xl" />
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
                <Sparkles className="h-3.5 w-3.5 text-success" />
              </div>
              Ações Rápidas
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((a, i) => (
                <motion.button key={a.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.06 }}
                  onClick={() => navigate(a.path)}
                  className="group relative flex flex-col items-center justify-center gap-2.5 rounded-xl border border-border/60 p-4 hover:border-primary/30 hover:shadow-card-hover transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className={cn("relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg", a.color)}>
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div className="relative text-center">
                    <span className="text-xs font-semibold text-foreground leading-tight">{a.label}</span>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{a.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Top Stock + Categories */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
          <Card className="p-5 h-full relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-accent-foreground/10 to-transparent rounded-t-2xl" />
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-3.5 w-3.5 text-primary" />
              </div>
              Top Estoques
            </h3>
            {topStocked.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum medicamento</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topStocked} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }} />
                  <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={14} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {catData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
          <Card className="p-5 h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-info/40 via-success/20 to-transparent rounded-t-2xl" />
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10">
                  <Pill className="h-3.5 w-3.5 text-info" />
                </div>
                Distribuição por Categoria
              </h3>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={42} outerRadius={78} dataKey="value" stroke="none" paddingAngle={2}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5 flex-1">
                  {catData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{c.name}</span>
                      <span className="ml-auto font-semibold tabular-nums">{c.value}</span>
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
          <Card className="p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-warning/50 via-destructive/30 to-transparent rounded-t-2xl" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                </div>
                Alertas em Destaque
              </h3>
              <Button variant="ghost" size="sm" className="text-xs gap-1 font-semibold" onClick={() => navigate("/alertas")}>
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {expiredMeds.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-3 text-sm rounded-xl border border-destructive/15 bg-destructive/5 p-3">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="font-medium">{m.nome}</span>
                  <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive ml-auto">Vencido</Badge>
                </div>
              ))}
              {lowStockMeds.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-3 text-sm rounded-xl border border-warning/15 bg-warning/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <span className="font-medium">{m.nome}</span>
                  <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning ml-auto">Estoque Baixo</Badge>
                </div>
              ))}
              {pendingTransfers > 0 && (
                <div className="flex items-center gap-3 text-sm rounded-xl border border-info/15 bg-info/5 p-3 cursor-pointer hover:bg-info/8 transition-colors" onClick={() => navigate("/transferencias")}>
                  <ArrowLeftRight className="h-4 w-4 text-info shrink-0" />
                  <span className="font-medium">{pendingTransfers} transferência(s) aguardando</span>
                  <ArrowRight className="h-3.5 w-3.5 text-info ml-auto" />
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
