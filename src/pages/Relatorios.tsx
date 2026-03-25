import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Printer, Filter, Pill, Package, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import type { Medicamento, Lote, Categoria } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus } from "@/types/database";

const COLORS = ["#1e3a5f", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#6b7280"];

const Relatorios = () => {
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");

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

  const filtered = catFilter === "all" ? meds : meds.filter(m => m.categoria_id === catFilter);
  const totalUnits = filtered.reduce((s, m) => s + getEstoqueTotal(m.lotes), 0);
  const topStock = [...filtered].map(m => ({ name: m.nome, qty: getEstoqueTotal(m.lotes) })).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const stockStatus = [
    { name: "Normal", value: filtered.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "normal").length, color: "#10b981" },
    { name: "Baixo", value: filtered.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "baixo").length, color: "#f59e0b" },
    { name: "Crítico", value: filtered.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "critico").length, color: "#ef4444" },
    { name: "Esgotado", value: filtered.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "esgotado").length, color: "#6b7280" },
  ];

  const handleCSV = () => {
    const headers = ["Medicamento", "Concentração", "Estoque", "Mínimo", "Status"];
    const rows = filtered.map(m => {
      const total = getEstoqueTotal(m.lotes);
      return [m.nome, m.concentracao, total, m.estoque_minimo, getEstoqueStatus(total, m.estoque_minimo)];
    });
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  if (loading) return <AppLayout title="Relatórios"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout title="Relatórios & Análises" subtitle="Visão analítica">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1.5">
          <Button onClick={handleCSV} variant="outline" size="sm" className="gap-1.5 text-xs h-8"><Download className="h-3.5 w-3.5" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{ label: "Itens", value: filtered.length, icon: Pill }, { label: "Unidades", value: totalUnits.toLocaleString("pt-BR"), icon: Package }, { label: "Média/Item", value: filtered.length ? Math.round(totalUnits / filtered.length) : 0, icon: TrendingUp }].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1"><m.icon className="h-3.5 w-3.5 text-primary" /><p className="text-[11px] text-muted-foreground uppercase">{m.label}</p></div>
            <p className="text-xl font-bold">{m.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-4">Maiores Estoques</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topStock} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip /><Bar dataKey="qty" fill="hsl(214, 60%, 35%)" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-4">Status do Estoque</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={240}>
              <PieChart><Pie data={stockStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" stroke="none">
                {stockStatus.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">{stockStatus.map(s => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-muted-foreground">{s.name}</span>
                <span className="ml-auto font-medium">{s.value}</span>
              </div>
            ))}</div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Relatorios;
