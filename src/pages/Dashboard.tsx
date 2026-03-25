import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Pill, AlertTriangle, XCircle, Clock, Package, ShieldCheck, ClipboardList, Barcode, ArrowLeftRight, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Medicamento, Lote } from "@/types/database";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#6b7280"];

const quickActions = [
  { label: "Nova Movimentação", icon: ClipboardList, path: "/movimentacoes", color: "bg-info/10 text-info" },
  { label: "Gerar Etiquetas", icon: Barcode, path: "/etiquetas", color: "bg-primary/10 text-primary" },
  { label: "Nova Transferência", icon: ArrowLeftRight, path: "/transferencias", color: "bg-success/10 text-success" },
  { label: "Ver Relatórios", icon: BarChart3, path: "/relatorios", color: "bg-warning/10 text-warning" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const { data: medsData } = await supabase.from("medicamentos").select("*").eq("ativo", true);
      const { data: lotesData } = await supabase.from("lotes").select("*").eq("ativo", true);
      const { data: catsData } = await supabase.from("categorias_medicamento").select("*");
      setCategorias(catsData || []);
      const medsWithLotes = (medsData || []).map((m: any) => ({
        ...m,
        lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
      }));
      setMeds(medsWithLotes);
      setLoading(false);
    };
    fetch();
  }, []);

  const stats = {
    total: meds.length,
    controlled: meds.filter(m => m.controlado).length,
    lowStock: meds.filter(m => {
      const total = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0);
      return total > 0 && total <= m.estoque_minimo;
    }).length,
    critical: meds.filter(m => {
      const total = m.lotes.reduce((s, l) => s + l.quantidade_atual, 0);
      return total > 0 && total <= m.estoque_minimo * 0.25;
    }).length,
    outOfStock: meds.filter(m => m.lotes.reduce((s, l) => s + l.quantidade_atual, 0) === 0).length,
    expiringSoon: meds.filter(m => m.lotes.some(l => {
      const diff = (new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 60 && diff > 0;
    })).length,
  };

  const topStocked = [...meds]
    .map(m => ({ name: m.nome, qty: m.lotes.reduce((s, l) => s + l.quantidade_atual, 0) }))
    .sort((a, b) => b.qty - a.qty).slice(0, 5);

  const catData = categorias.map(c => ({
    name: c.nome,
    value: meds.filter(m => m.categoria_id === c.id).reduce((s, m) => s + m.lotes.reduce((sl, l) => sl + l.quantidade_atual, 0), 0),
  })).filter(c => c.value > 0);

  if (loading) return (
    <AppLayout title="Dashboard" subtitle="Carregando...">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6"><Skeleton className="h-64 rounded-xl lg:col-span-2" /><Skeleton className="h-64 rounded-xl" /></div>
    </AppLayout>
  );

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da farmácia hospitalar">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total" value={stats.total} icon={Pill} variant="info" delay={0} />
        <StatCard title="Controlados" value={stats.controlled} icon={ShieldCheck} variant="default" delay={0.05} />
        <StatCard title="Estoque Baixo" value={stats.lowStock} icon={Package} variant="warning" delay={0.1} />
        <StatCard title="Crítico" value={stats.critical} icon={AlertTriangle} variant="critical" delay={0.15} />
        <StatCard title="Esgotados" value={stats.outOfStock} icon={XCircle} variant="critical" delay={0.2} />
        <StatCard title="Vence em 60d" value={stats.expiringSoon} icon={Clock} variant="warning" delay={0.25} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="lg:col-span-2">
          <Card className="p-4 sm:p-5 shadow-card h-full">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Maiores Estoques</h3>
            {topStocked.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">Nenhum medicamento cadastrado</p> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topStocked} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="qty" fill="hsl(214, 60%, 35%)" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
          <Card className="p-4 sm:p-5 shadow-card h-full flex flex-col">
            <div className="text-center mb-4 pb-3 border-b">
              <p className="text-2xl font-bold text-foreground tabular-nums">{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
              <p className="text-[11px] text-muted-foreground">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1">
              {quickActions.map((a) => (
                <button key={a.label} onClick={() => navigate(a.path)} className="flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 hover:shadow-card-hover transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", a.color)}><a.icon className="h-4 w-4" /></div>
                  <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {catData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5 shadow-card">
            <h3 className="text-sm font-semibold mb-4">Distribuição por Categoria</h3>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" stroke="none">
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">{catData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground truncate">{c.name}</span>
                  <span className="ml-auto font-medium">{c.value}</span>
                </div>
              ))}</div>
            </div>
          </Card>
        </motion.div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
