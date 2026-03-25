import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Package, AlertTriangle, CheckCircle, TrendingDown, Search, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import type { Medicamento, Lote, Categoria } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG } from "@/types/database";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#6b7280"];

const Estoque = () => {
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "charts">("table");

  useEffect(() => {
    const fetch = async () => {
      const [{ data: medsData }, { data: lotesData }, { data: catsData }] = await Promise.all([
        supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
        supabase.from("lotes").select("*").eq("ativo", true),
        supabase.from("categorias_medicamento").select("*"),
      ]);
      setCategorias(catsData as Categoria[] || []);
      setMeds((medsData || []).map((m: any) => ({ ...m, lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id) })));
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleExpand = (id: string) => setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = meds.filter(m => {
    const total = getEstoqueTotal(m.lotes);
    const status = getEstoqueStatus(total, m.estoque_minimo);
    const matchSearch = !search || m.nome.toLowerCase().includes(search.toLowerCase()) || m.generico.toLowerCase().includes(search.toLowerCase()) || m.codigo_barras?.includes(search);
    const matchStatus = statusFilter === "all" || status === statusFilter;
    const matchCat = catFilter === "all" || m.categoria_id === catFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const statusBreakdown = [
    { status: "normal", count: meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "normal").length },
    { status: "baixo", count: meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "baixo").length },
    { status: "critico", count: meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "critico").length },
    { status: "esgotado", count: meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "esgotado").length },
  ];

  const topStock = [...meds].map(m => ({ name: m.nome.substring(0, 20), stock: getEstoqueTotal(m.lotes) })).sort((a, b) => b.stock - a.stock).slice(0, 8);
  const catData = categorias.map(c => ({
    name: c.nome,
    value: meds.filter(m => m.categoria_id === c.id).reduce((s, m) => s + getEstoqueTotal(m.lotes), 0),
  })).filter(c => c.value > 0);

  const totalUnits = meds.reduce((s, m) => s + getEstoqueTotal(m.lotes), 0);
  const totalValue = meds.reduce((s, m) => s + m.lotes.reduce((ls, l) => ls + l.quantidade_atual * l.preco_unitario, 0), 0);
  const now = new Date();

  if (loading) return <AppLayout title="Estoque"><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div></AppLayout>;

  return (
    <AppLayout title="Estoque" subtitle={`${totalUnits.toLocaleString("pt-BR")} unidades • R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}>
      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statusBreakdown.map((s, i) => {
          const cfg = ESTOQUE_STATUS_CONFIG[s.status as keyof typeof ESTOQUE_STATUS_CONFIG];
          const icons = [CheckCircle, TrendingDown, AlertTriangle, Package];
          const Icon = icons[i];
          return (
            <motion.div key={s.status} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={cn("rounded-xl border bg-card p-4 shadow-card cursor-pointer transition-all hover:shadow-card-hover", statusFilter === s.status && "ring-2 ring-primary")}
              onClick={() => setStatusFilter(statusFilter === s.status ? "all" : s.status)}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", cfg.className)}><Icon className="h-4 w-4" /></div>
                <div><p className="text-xs text-muted-foreground">{cfg.label}</p><p className="text-xl font-bold">{s.count}</p></div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, genérico ou código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border bg-card overflow-hidden">
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="rounded-none text-xs" onClick={() => setViewMode("table")}>Tabela</Button>
          <Button variant={viewMode === "charts" ? "default" : "ghost"} size="sm" className="rounded-none text-xs" onClick={() => setViewMode("charts")}>Gráficos</Button>
        </div>
      </div>

      {viewMode === "table" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs font-semibold w-8"></TableHead>
                <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                <TableHead className="text-xs font-semibold">Concentração</TableHead>
                <TableHead className="text-xs font-semibold text-center">Estoque</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-center">Lotes</TableHead>
                <TableHead className="text-xs font-semibold">Local</TableHead>
                <TableHead className="text-xs font-semibold text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum item encontrado</TableCell></TableRow>
              ) : filtered.map(med => {
                const total = getEstoqueTotal(med.lotes);
                const status = getEstoqueStatus(total, med.estoque_minimo);
                const cfg = ESTOQUE_STATUS_CONFIG[status];
                const expanded = expandedIds.has(med.id);
                const valorTotal = med.lotes.reduce((s, l) => s + l.quantidade_atual * l.preco_unitario, 0);
                return (
                  <React.Fragment key={med.id}>
                    <TableRow className="hover:bg-accent/30 cursor-pointer" onClick={() => med.lotes.length > 0 && toggleExpand(med.id)}>
                      <TableCell className="w-8">
                        {med.lotes.length > 0 && (expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{med.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{med.generico}</p>
                      </TableCell>
                      <TableCell className="text-sm">{med.concentracao} • {med.forma_farmaceutica}</TableCell>
                      <TableCell className="text-center font-semibold">{total}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-[10px]", cfg.className)}>{cfg.label}</Badge></TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{med.lotes.length}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{med.localizacao}</TableCell>
                      <TableCell className="text-right text-sm font-medium">R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                    {expanded && med.lotes.sort((a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime()).map(lote => {
                      const diffDays = Math.ceil((new Date(lote.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isExpired = diffDays <= 0;
                      const isNearExpiry = diffDays > 0 && diffDays <= 60;
                      return (
                        <TableRow key={lote.id} className="bg-muted/20 hover:bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="text-xs text-muted-foreground pl-8">
                            <span className="font-mono font-medium">Lote {lote.numero_lote}</span>
                          </TableCell>
                          <TableCell className="text-center text-xs font-medium">{lote.quantidade_atual}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className={cn("text-[11px]", isExpired && "text-destructive font-semibold", isNearExpiry && "text-warning font-medium")}>
                                {new Date(lote.validade).toLocaleDateString("pt-BR")}
                                {isExpired && " (VENCIDO)"}
                                {isNearExpiry && ` (${diffDays}d)`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            R$ {(lote.quantidade_atual * lote.preco_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-5 shadow-card">
            <h3 className="text-sm font-semibold mb-4">Maiores Estoques</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topStock} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={18} />
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
      )}
    </AppLayout>
  );
};

export default Estoque;
