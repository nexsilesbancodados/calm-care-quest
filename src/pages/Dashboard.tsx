import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell,
  CartesianGrid,
} from "recharts";
import {
  Pill, AlertTriangle, XCircle, Clock, Package, ShieldCheck,
  ClipboardList, Barcode, ArrowLeftRight, BarChart3, TrendingUp, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Medicamento, Lote } from "@/types/database";

const COLORS = ["#1e3a5f", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6"];

const quickActions = [
  { label: "Entrada", icon: ClipboardList, path: "/entrada", color: "bg-success/10 text-success" },
  { label: "Dispensação", icon: Package, path: "/dispensacao", color: "bg-info/10 text-info" },
  { label: "Etiquetas", icon: Barcode, path: "/etiquetas", color: "bg-primary/10 text-primary" },
  { label: "Transferência", icon: ArrowLeftRight, path: "/transferencias", color: "bg-warning/10 text-warning" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [consumo30d, setConsumo30d] = useState<{ day: string; qty: number }[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: medsData }, { data: lotesData }, { data: catsData }, { data: movData }, { data: transData }] =
        await Promise.all([
          supabase.from("medicamentos").select("*").eq("ativo", true),
          supabase.from("lotes").select("*").eq("ativo", true),
          supabase.from("categorias_medicamento").select("*"),
          supabase
            .from("movimentacoes")
            .select("created_at, quantidade, tipo")
            .in("tipo", ["saida", "dispensacao"])
            .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .order("created_at"),
          supabase.from("transferencias").select("id", { count: "exact" }).eq("status", "pendente"),
        ]);

      setCategorias(catsData || []);
      setPendingTransfers(transData?.length || 0);

      const medsWithLotes = (medsData || []).map((m: any) => ({
        ...m,
        lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
      }));
      setMeds(medsWithLotes);

      // Build consumo 30 dias
      const dayMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      (movData || []).forEach((m: any) => {
        const day = m.created_at.slice(0, 10);
        if (dayMap[day] !== undefined) dayMap[day] += m.quantidade;
      });
      setConsumo30d(Object.entries(dayMap).map(([day, qty]) => ({
        day: new Date(day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        qty,
      })));

      setLoading(false);
    };
    fetch();
  }, []);

  const stats = {
    total: meds.length,
    controlled: meds.filter((m) => m.controlado).length,
    lowStock: meds.filter((m) => {
      const total = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0);
      return total > 0 && total <= m.estoque_minimo;
    }).length,
    critical: meds.filter((m) => {
      const total = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0);
      return total > 0 && total <= m.estoque_minimo * 0.25;
    }).length,
    outOfStock: meds.filter((m) => m.lotes.reduce((s, l) => s + l.quantidade_atual, 0) === 0).length,
    expiringSoon: meds.filter((m) =>
      m.lotes.some((l) => {
        const diff = (new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 60 && diff > 0;
      })
    ).length,
    pendingTransfers,
  };

  const topStocked = [...meds]
    .map((m) => ({ name: m.nome.length > 18 ? m.nome.slice(0, 18) + "…" : m.nome, qty: m.lotes.reduce((s, l) => s + l.quantidade_atual, 0) }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 7);

  const catData = categorias
    .map((c) => ({
      name: c.nome,
      value: meds
        .filter((m) => m.categoria_id === c.id)
        .reduce((s, m) => s + m.lotes.reduce((sl, l) => sl + l.quantidade_atual, 0), 0),
    }))
    .filter((c) => c.value > 0);

  // Alerts summary
  const expiredMeds = meds.filter((m) => m.lotes.some((l) => new Date(l.validade) < now));
  const lowStockMeds = meds.filter((m) => {
    const t = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0);
    return t > 0 && t <= m.estoque_minimo;
  });

  if (loading)
    return (
      <AppLayout title="Dashboard" subtitle="Carregando...">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </AppLayout>
    );

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da farmácia hospitalar">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total" value={stats.total} icon={Pill} variant="info" delay={0} />
        <StatCard title="Controlados" value={stats.controlled} icon={ShieldCheck} variant="default" delay={0.04} />
        <StatCard title="Est. Baixo" value={stats.lowStock} icon={Package} variant="warning" delay={0.08} />
        <StatCard title="Crítico" value={stats.critical} icon={AlertTriangle} variant="critical" delay={0.12} />
        <StatCard title="Esgotados" value={stats.outOfStock} icon={XCircle} variant="critical" delay={0.16} />
        <StatCard title="Vence 60d" value={stats.expiringSoon} icon={Clock} variant="warning" delay={0.2} />
        <StatCard title="Transf. Pend." value={stats.pendingTransfers} icon={ArrowLeftRight} variant="info" delay={0.24} />
      </div>

      {/* Consumo 30d + Ações Rápidas */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="lg:col-span-2">
          <Card className="p-4 sm:p-5 shadow-card h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Consumo — Últimos 30 dias
              </h3>
              <Badge variant="outline" className="text-[10px]">
                {consumo30d.reduce((s, d) => s + d.qty, 0)} un.
              </Badge>
            </div>
            {consumo30d.every((d) => d.qty === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma saída nos últimos 30 dias</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={consumo30d} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={30} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Line type="monotone" dataKey="qty" stroke="hsl(214, 60%, 35%)" strokeWidth={2} dot={false} name="Unidades" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
          <Card className="p-4 sm:p-5 shadow-card h-full flex flex-col">
            <div className="text-center mb-4 pb-3 border-b">
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 hover:shadow-card-hover transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", a.color)}>
                    <a.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Top Estoques + Categorias */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
          <Card className="p-4 sm:p-5 shadow-card h-full">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Top Estoques
            </h3>
            {topStocked.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum medicamento cadastrado</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={topStocked} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="qty" fill="hsl(214, 60%, 35%)" radius={[0, 4, 4, 0]} barSize={14} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {catData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Card className="p-4 sm:p-5 shadow-card h-full">
              <h3 className="text-sm font-semibold mb-4">Distribuição por Categoria</h3>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" stroke="none">
                      {catData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {catData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{c.name}</span>
                      <span className="ml-auto font-medium">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Alertas em destaque */}
      {(expiredMeds.length > 0 || lowStockMeds.length > 0 || pendingTransfers > 0) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
          <Card className="p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alertas em Destaque
              </h3>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/alertas")}>
                Ver todos <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {expiredMeds.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="font-medium">{m.nome}</span>
                  <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive ml-auto">Vencido</Badge>
                </div>
              ))}
              {lowStockMeds.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm rounded-lg border border-warning/20 bg-warning/5 p-2.5">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <span className="font-medium">{m.nome}</span>
                  <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning ml-auto">Estoque Baixo</Badge>
                </div>
              ))}
              {pendingTransfers > 0 && (
                <div
                  className="flex items-center gap-3 text-sm rounded-lg border border-info/20 bg-info/5 p-2.5 cursor-pointer hover:bg-info/10 transition-colors"
                  onClick={() => navigate("/transferencias")}
                >
                  <ArrowLeftRight className="h-4 w-4 text-info shrink-0" />
                  <span className="font-medium">{pendingTransfers} transferência(s) aguardando aprovação</span>
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
