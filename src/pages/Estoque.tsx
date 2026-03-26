import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Package, AlertTriangle, CheckCircle, TrendingDown, Search, ChevronDown, ChevronRight, Calendar, Wrench } from "lucide-react";
import { toast } from "sonner";
import type { Medicamento, Lote, Categoria } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG } from "@/types/database";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#6b7280"];

const MOTIVOS_AJUSTE = [
  { value: "inventario", label: "Inventário" },
  { value: "perda", label: "Perda" },
  { value: "vencimento", label: "Vencimento" },
  { value: "erro_lancamento", label: "Erro de Lançamento" },
  { value: "outro", label: "Outro" },
];

const Estoque = () => {
  const { log } = useAudit();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "charts">("table");

  // Ajuste dialog
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteMed, setAjusteMed] = useState<(Medicamento & { lotes: Lote[] }) | null>(null);
  const [ajusteForm, setAjusteForm] = useState({ lote_id: "", quantidade_nova: 0, motivo: "", observacao: "" });
  const [ajusteSaving, setAjusteSaving] = useState(false);

  const fetchData = async () => {
    const [{ data: medsData }, { data: lotesData }, { data: catsData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").eq("ativo", true),
      supabase.from("categorias_medicamento").select("*"),
    ]);
    setCategorias(catsData as Categoria[] || []);
    setMeds((medsData || []).map((m: any) => ({ ...m, lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id) })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

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

  // Get FEFO lote for a med (first non-expired lote sorted by validade)
  const getFefoLoteId = (lotes: Lote[]) => {
    const sorted = [...lotes].filter(l => l.ativo && new Date(l.validade) > now).sort((a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime());
    return sorted[0]?.id;
  };

  // Ajuste handlers
  const openAjuste = (med: Medicamento & { lotes: Lote[] }) => {
    setAjusteMed(med);
    setAjusteForm({ lote_id: med.lotes[0]?.id || "", quantidade_nova: med.lotes[0]?.quantidade_atual || 0, motivo: "", observacao: "" });
    setAjusteOpen(true);
  };

  const handleAjuste = async () => {
    if (!ajusteForm.lote_id || !ajusteForm.motivo || !ajusteForm.observacao.trim()) {
      toast.error("Preencha lote, motivo e observação");
      return;
    }
    setAjusteSaving(true);
    const lote = ajusteMed?.lotes.find(l => l.id === ajusteForm.lote_id);
    if (!lote) { setAjusteSaving(false); return; }

    const delta = ajusteForm.quantidade_nova - lote.quantidade_atual;

    await supabase.from("lotes").update({ quantidade_atual: ajusteForm.quantidade_nova }).eq("id", ajusteForm.lote_id);

    await supabase.from("movimentacoes").insert({
      tipo: "ajuste" as any,
      medicamento_id: ajusteMed!.id,
      lote_id: ajusteForm.lote_id,
      quantidade: Math.abs(delta),
      usuario_id: user?.id,
      observacao: `[${MOTIVOS_AJUSTE.find(m => m.value === ajusteForm.motivo)?.label}] ${ajusteForm.observacao}`,
    });

    await log({
      acao: "Ajuste de Estoque",
      tabela: "lotes",
      registro_id: ajusteForm.lote_id,
      dados_anteriores: { quantidade_atual: lote.quantidade_atual },
      dados_novos: { quantidade_atual: ajusteForm.quantidade_nova, motivo: ajusteForm.motivo, delta },
    });

    toast.success(`Estoque ajustado: ${lote.quantidade_atual} → ${ajusteForm.quantidade_nova}`);
    setAjusteOpen(false);
    setAjusteSaving(false);
    fetchData();
  };

  const handleAjusteLoteChange = (loteId: string) => {
    const lote = ajusteMed?.lotes.find(l => l.id === loteId);
    setAjusteForm({ ...ajusteForm, lote_id: loteId, quantidade_nova: lote?.quantidade_atual || 0 });
  };

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
                <TableHead className="text-xs font-semibold w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Nenhum item encontrado</TableCell></TableRow>
              ) : filtered.map(med => {
                const total = getEstoqueTotal(med.lotes);
                const status = getEstoqueStatus(total, med.estoque_minimo);
                const cfg = ESTOQUE_STATUS_CONFIG[status];
                const expanded = expandedIds.has(med.id);
                const valorTotal = med.lotes.reduce((s, l) => s + l.quantidade_atual * l.preco_unitario, 0);
                const fefoId = getFefoLoteId(med.lotes);
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
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openAjuste(med); }} title="Ajuste de Estoque">
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded && med.lotes.sort((a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime()).map(lote => {
                      const diffDays = Math.ceil((new Date(lote.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isExpired = diffDays <= 0;
                      const isNearExpiry = diffDays > 0 && diffDays <= 60;
                      const isFefo = lote.id === fefoId;
                      return (
                        <TableRow key={lote.id} className="bg-muted/20 hover:bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="text-xs text-muted-foreground pl-8">
                            <span className="font-mono font-medium">Lote {lote.numero_lote}</span>
                            {isFefo && <Badge variant="outline" className="ml-2 text-[9px] bg-info/10 text-info border-info/20">FEFO</Badge>}
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
                          <TableCell></TableCell>
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

      {/* Ajuste Dialog */}
      <Dialog open={ajusteOpen} onOpenChange={setAjusteOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Ajuste de Estoque — {ajusteMed?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Lote *</Label>
              <Select value={ajusteForm.lote_id} onValueChange={handleAjusteLoteChange}>
                <SelectTrigger><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
                <SelectContent>
                  {ajusteMed?.lotes.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      Lote {l.numero_lote} — Atual: {l.quantidade_atual} un. — Val: {new Date(l.validade).toLocaleDateString("pt-BR")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade Nova</Label>
              <Input type="number" min={0} value={ajusteForm.quantidade_nova} onChange={e => setAjusteForm({ ...ajusteForm, quantidade_nova: Number(e.target.value) })} />
              {ajusteForm.lote_id && (
                <p className="text-[11px] text-muted-foreground">
                  Atual: {ajusteMed?.lotes.find(l => l.id === ajusteForm.lote_id)?.quantidade_atual} → Nova: {ajusteForm.quantidade_nova}
                  {" "}(delta: {ajusteForm.quantidade_nova - (ajusteMed?.lotes.find(l => l.id === ajusteForm.lote_id)?.quantidade_atual || 0)})
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo *</Label>
              <Select value={ajusteForm.motivo} onValueChange={v => setAjusteForm({ ...ajusteForm, motivo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_AJUSTE.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observação *</Label>
              <Textarea value={ajusteForm.observacao} onChange={e => setAjusteForm({ ...ajusteForm, observacao: e.target.value })} rows={2} placeholder="Descreva o motivo do ajuste..." />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setAjusteOpen(false)}>Cancelar</Button>
              <Button onClick={handleAjuste} disabled={ajusteSaving} className="gradient-primary text-primary-foreground">
                {ajusteSaving ? "Salvando..." : "Confirmar Ajuste"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Estoque;
