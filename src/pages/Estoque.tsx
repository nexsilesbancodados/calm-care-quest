import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Package, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";
import type { Medicamento, Lote, Categoria } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG } from "@/types/database";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#6b7280"];

const Estoque = () => {
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: medsData }, { data: lotesData }, { data: catsData }] = await Promise.all([
        supabase.from("medicamentos").select("*").eq("ativo", true),
        supabase.from("lotes").select("*").eq("ativo", true),
        supabase.from("categorias_medicamento").select("*"),
      ]);
      setCategorias(catsData as Categoria[] || []);
      setMeds((medsData || []).map((m: any) => ({ ...m, lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id) })));
      setLoading(false);
    };
    fetch();
  }, []);

  const statusBreakdown = [
    { status: "normal", count: meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "normal").length },
    { status: "baixo", count: meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "baixo").length },
    { status: "critico", count: meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "critico").length },
    { status: "esgotado", count: meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "esgotado").length },
  ];

  const topStock = [...meds].map(m => ({ name: m.nome, stock: getEstoqueTotal(m.lotes) })).sort((a, b) => b.stock - a.stock).slice(0, 8);
  const catData = categorias.map(c => ({
    name: c.nome,
    value: meds.filter(m => m.categoria_id === c.id).reduce((s, m) => s + getEstoqueTotal(m.lotes), 0),
  })).filter(c => c.value > 0);

  const totalUnits = meds.reduce((s, m) => s + getEstoqueTotal(m.lotes), 0);

  if (loading) return <AppLayout title="Estoque"><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div></AppLayout>;

  return (
    <AppLayout title="Estoque" subtitle={`${totalUnits.toLocaleString("pt-BR")} unidades em ${meds.length} itens`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statusBreakdown.map((s, i) => {
          const cfg = ESTOQUE_STATUS_CONFIG[s.status as keyof typeof ESTOQUE_STATUS_CONFIG];
          const icons = [CheckCircle, TrendingDown, AlertTriangle, Package];
          const Icon = icons[i];
          return (
            <motion.div key={s.status} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", cfg.className)}><Icon className="h-4 w-4" /></div>
                <div><p className="text-xs text-muted-foreground">{cfg.label}</p><p className="text-xl font-bold">{s.count}</p></div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-4">Maiores Estoques</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topStock} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip />
              <Bar dataKey="stock" fill="hsl(214, 60%, 35%)" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-4">Por Categoria</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={240}>
              <PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" stroke="none">
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
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Estoque;
