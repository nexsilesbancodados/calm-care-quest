import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Search, Plus, Pill, ChevronLeft, ChevronRight, ChevronDown,
  Package, AlertTriangle, XCircle, CheckCircle, ShieldCheck,
  MapPin, Barcode, Edit2, Trash2, Eye, Calendar, TrendingDown,
  ArrowUpDown, Filter, RefreshCw, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Medicamento, Lote, Categoria, Fornecedor } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG } from "@/types/database";

const PAGE_SIZE = 50;

const FORMAS = ["Comprimido", "Cápsula", "Solução Oral", "Injetável", "Gotas", "Pomada", "Creme", "Gel", "Supositório", "Adesivo", "Spray", "Pó para Suspensão"];

type SortKey = "nome" | "estoque" | "status" | "preco";
type SortDir = "asc" | "desc";

const Medicamentos = () => {
  const { log } = useAudit();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[]; categoria?: Categoria })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formaFilter, setFormaFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medicamento | null>(null);
  const [detailMed, setDetailMed] = useState<(Medicamento & { lotes: Lote[]; categoria?: Categoria }) | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [form, setForm] = useState({
    nome: "", generico: "", principio_ativo: "", concentracao: "",
    forma_farmaceutica: "Comprimido", codigo_barras: "", categoria_id: "",
    controlado: false, fornecedor_id: "", estoque_minimo: 0, estoque_maximo: 0,
    localizacao: "", preco_unitario: 0,
  });

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ id: string; nome: string; lotesAtivos: number; unidades: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { count } = await supabase.from("medicamentos").select("id", { count: "exact", head: true }).eq("ativo", true);
    setTotalCount(count || 0);

    const [{ data: medsData }, { data: lotesData }, { data: catsData }, { data: fornData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome").range(from, to),
      supabase.from("lotes").select("*").eq("ativo", true),
      supabase.from("categorias_medicamento").select("*").eq("ativo", true),
      supabase.from("fornecedores").select("*").eq("ativo", true).order("nome"),
    ]);
    setCategorias(catsData as Categoria[] || []);
    setFornecedores(fornData as Fornecedor[] || []);
    setMeds((medsData || []).map((m: any) => ({
      ...m,
      lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
      categoria: (catsData || []).find((c: any) => c.id === m.categoria_id),
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page]);

  const now = new Date();

  // Stats
  const stats = useMemo(() => {
    const total = meds.length;
    const controlled = meds.filter(m => m.controlado).length;
    const normal = meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "normal").length;
    const baixo = meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "baixo").length;
    const critico = meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "critico").length;
    const esgotado = meds.filter(m => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "esgotado").length;
    const totalUnits = meds.reduce((s, m) => s + getEstoqueTotal(m.lotes), 0);
    const totalValue = meds.reduce((s, m) => s + m.lotes.reduce((ls, l) => ls + l.quantidade_atual * l.preco_unitario, 0), 0);
    return { total, controlled, normal, baixo, critico, esgotado, totalUnits, totalValue };
  }, [meds]);

  const filtered = useMemo(() => {
    let result = meds.filter(m => {
      const matchSearch = !search ||
        m.nome.toLowerCase().includes(search.toLowerCase()) ||
        m.generico.toLowerCase().includes(search.toLowerCase()) ||
        m.principio_ativo.toLowerCase().includes(search.toLowerCase()) ||
        m.codigo_barras?.includes(search);
      const matchCat = catFilter === "all" || m.categoria_id === catFilter;
      const matchStatus = statusFilter === "all" || getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === statusFilter;
      const matchForma = formaFilter === "all" || m.forma_farmaceutica === formaFilter;
      return matchSearch && matchCat && matchStatus && matchForma;
    });

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "nome": cmp = a.nome.localeCompare(b.nome); break;
        case "estoque": cmp = getEstoqueTotal(a.lotes) - getEstoqueTotal(b.lotes); break;
        case "status": {
          const order = { esgotado: 0, critico: 1, baixo: 2, normal: 3 };
          cmp = order[getEstoqueStatus(getEstoqueTotal(a.lotes), a.estoque_minimo)] - order[getEstoqueStatus(getEstoqueTotal(b.lotes), b.estoque_minimo)];
          break;
        }
        case "preco": cmp = a.preco_unitario - b.preco_unitario; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [meds, search, catFilter, statusFilter, formaFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleExpand = (id: string) => setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openNew = () => {
    setEditMed(null);
    setForm({ nome: "", generico: "", principio_ativo: "", concentracao: "", forma_farmaceutica: "Comprimido", codigo_barras: "", categoria_id: "", controlado: false, fornecedor_id: "", estoque_minimo: 0, estoque_maximo: 0, localizacao: "", preco_unitario: 0 });
    setDialogOpen(true);
  };

  const openEdit = (m: Medicamento) => {
    setEditMed(m);
    setForm({ nome: m.nome, generico: m.generico, principio_ativo: m.principio_ativo, concentracao: m.concentracao, forma_farmaceutica: m.forma_farmaceutica, codigo_barras: m.codigo_barras || "", categoria_id: m.categoria_id || "", controlado: m.controlado, fornecedor_id: m.fornecedor_id || "", estoque_minimo: m.estoque_minimo, estoque_maximo: m.estoque_maximo, localizacao: m.localizacao, preco_unitario: m.preco_unitario });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const row = { nome: form.nome, generico: form.generico, principio_ativo: form.principio_ativo, concentracao: form.concentracao, forma_farmaceutica: form.forma_farmaceutica, codigo_barras: form.codigo_barras || null, categoria_id: form.categoria_id || null, controlado: form.controlado, fornecedor_id: form.fornecedor_id || null, estoque_minimo: form.estoque_minimo, estoque_maximo: form.estoque_maximo, localizacao: form.localizacao, preco_unitario: form.preco_unitario };

    if (editMed) {
      const { error } = await supabase.from("medicamentos").update(row).eq("id", editMed.id);
      if (error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      setMeds(prev => prev.map(m => m.id === editMed.id ? { ...m, ...row, categoria: categorias.find(c => c.id === row.categoria_id) } as any : m));
      await log({ acao: "Atualização", tabela: "medicamentos", registro_id: editMed.id });
      toast.success("Medicamento atualizado!");
    } else {
      const { data, error } = await supabase.from("medicamentos").insert(row).select().single();
      if (error) { toast.error("Erro ao cadastrar"); setSaving(false); return; }
      setMeds(prev => [{ ...data, lotes: [], categoria: categorias.find(c => c.id === data.categoria_id) } as any, ...prev]);
      await log({ acao: "Cadastro", tabela: "medicamentos", registro_id: data.id });
      toast.success("Medicamento cadastrado!");
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const confirmDeactivate = (id: string) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;
    const lotesAtivos = med.lotes.filter(l => l.ativo && l.quantidade_atual > 0);
    const unidades = lotesAtivos.reduce((s, l) => s + l.quantidade_atual, 0);
    setDeactivateConfirm({ id, nome: med.nome, lotesAtivos: lotesAtivos.length, unidades });
  };

  const handleDeactivate = async () => {
    if (!deactivateConfirm) return;
    await supabase.from("medicamentos").update({ ativo: false }).eq("id", deactivateConfirm.id);
    setMeds(prev => prev.filter(m => m.id !== deactivateConfirm.id));
    await log({ acao: "Desativação", tabela: "medicamentos", registro_id: deactivateConfirm.id });
    toast.success("Medicamento desativado");
    setDeactivateConfirm(null);
  };

  const duplicateMed = (m: Medicamento) => {
    setEditMed(null);
    setForm({ nome: m.nome + " (cópia)", generico: m.generico, principio_ativo: m.principio_ativo, concentracao: m.concentracao, forma_farmaceutica: m.forma_farmaceutica, codigo_barras: "", categoria_id: m.categoria_id || "", controlado: m.controlado, fornecedor_id: m.fornecedor_id || "", estoque_minimo: m.estoque_minimo, estoque_maximo: m.estoque_maximo, localizacao: m.localizacao, preco_unitario: m.preco_unitario });
    setDialogOpen(true);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown className={cn("h-3 w-3 ml-1 inline-block transition-colors", sortKey === col ? "text-primary" : "text-muted-foreground/40")} />
  );

  if (loading) return (
    <AppLayout title="Medicamentos">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-[150px] rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout
      title="Medicamentos"
      subtitle={`${totalCount} cadastrados • ${stats.totalUnits.toLocaleString("pt-BR")} unidades`}
      actions={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-5">
        {[
          { label: "Total", value: stats.total, icon: Pill, color: "bg-primary/10 text-primary", filter: "all" },
          { label: "Normal", value: stats.normal, icon: CheckCircle, color: "bg-success/10 text-success", filter: "normal" },
          { label: "Baixo", value: stats.baixo, icon: TrendingDown, color: "bg-warning/10 text-warning", filter: "baixo" },
          { label: "Crítico", value: stats.critico, icon: AlertTriangle, color: "bg-destructive/10 text-destructive", filter: "critico" },
          { label: "Esgotado", value: stats.esgotado, icon: XCircle, color: "bg-muted text-muted-foreground", filter: "esgotado" },
          { label: "Controlados", value: stats.controlled, icon: ShieldCheck, color: "bg-info/10 text-info", filter: "all" },
          { label: "Valor Total", value: `R$ ${(stats.totalValue / 1000).toFixed(1)}k`, icon: Package, color: "bg-primary/10 text-primary", filter: "all" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              "rounded-xl border bg-card p-3 shadow-card cursor-pointer hover:shadow-card-hover transition-all text-center",
              statusFilter === kpi.filter && kpi.filter !== "all" && "ring-2 ring-primary"
            )}
            onClick={() => kpi.filter !== "all" ? setStatusFilter(statusFilter === kpi.filter ? "all" : kpi.filter) : null}
          >
            <div className={cn("flex h-8 w-8 mx-auto items-center justify-center rounded-lg mb-1", kpi.color)}>
              <kpi.icon className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold leading-tight">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, genérico, princípio ativo ou código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/60 rounded-xl h-10"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[160px] bg-card rounded-xl h-10">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categorias.map(c => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} />
                  {c.nome}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={formaFilter} onValueChange={setFormaFilter}>
          <SelectTrigger className="w-[160px] bg-card rounded-xl h-10"><SelectValue placeholder="Forma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas formas</SelectItem>
            {FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2 rounded-xl h-10">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          {(statusFilter !== "all" || catFilter !== "all" || formaFilter !== "all" || search) && (
            <button className="ml-2 text-primary hover:underline" onClick={() => { setStatusFilter("all"); setCatFilter("all"); setFormaFilter("all"); setSearch(""); }}>
              Limpar filtros
            </button>
          )}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="text-xs font-semibold cursor-pointer select-none" onClick={() => toggleSort("nome")}>
                Medicamento <SortIcon col="nome" />
              </TableHead>
              <TableHead className="text-xs font-semibold">Categoria</TableHead>
              <TableHead className="text-xs font-semibold text-center cursor-pointer select-none" onClick={() => toggleSort("estoque")}>
                Estoque <SortIcon col="estoque" />
              </TableHead>
              <TableHead className="text-xs font-semibold cursor-pointer select-none" onClick={() => toggleSort("status")}>
                Status <SortIcon col="status" />
              </TableHead>
              <TableHead className="text-xs font-semibold text-center">Lotes</TableHead>
              <TableHead className="text-xs font-semibold">Local</TableHead>
              <TableHead className="text-xs font-semibold text-right cursor-pointer select-none" onClick={() => toggleSort("preco")}>
                Preço <SortIcon col="preco" />
              </TableHead>
              <TableHead className="text-xs font-semibold w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                      <Pill className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhum medicamento encontrado</p>
                    <Button variant="outline" size="sm" className="text-xs mt-1" onClick={openNew}>
                      <Plus className="h-3 w-3 mr-1" /> Cadastrar novo
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map(med => {
              const total = getEstoqueTotal(med.lotes);
              const status = getEstoqueStatus(total, med.estoque_minimo);
              const cfg = ESTOQUE_STATUS_CONFIG[status];
              const expanded = expandedIds.has(med.id);
              const activeLotes = med.lotes.filter(l => l.ativo);
              const estoqueUsoPct = med.estoque_maximo > 0 ? Math.min(100, (total / med.estoque_maximo) * 100) : 0;
              const nearExpiry = activeLotes.some(l => {
                const diff = (new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                return diff > 0 && diff <= 60;
              });
              const hasExpired = activeLotes.some(l => new Date(l.validade) < now);

              return (
                <React.Fragment key={med.id}>
                  <TableRow
                    className={cn("hover:bg-accent/30 transition-colors", expanded && "bg-accent/10")}
                  >
                    <TableCell className="w-8">
                      {activeLotes.length > 0 && (
                        <button onClick={() => toggleExpand(med.id)} className="p-1 hover:bg-muted rounded">
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !expanded && "-rotate-90")} />
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cfg.className.split(" ").slice(0, 1).join(" ") || "bg-primary/10")}>
                          <Pill className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">{med.nome}</p>
                            {med.controlado && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>Substância Controlada</TooltipContent>
                              </Tooltip>
                            )}
                            {hasExpired && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>Possui lote vencido</TooltipContent>
                              </Tooltip>
                            )}
                            {nearExpiry && !hasExpired && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Calendar className="h-3.5 w-3.5 text-warning shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>Lote próximo do vencimento</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {med.concentracao && `${med.concentracao} • `}{med.forma_farmaceutica}
                            {med.generico && ` • ${med.generico}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {med.categoria ? (
                        <Badge variant="outline" className="text-[10px] gap-1" style={{ borderColor: med.categoria.cor + "60" }}>
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: med.categoria.cor }} />
                          {med.categoria.nome}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-sm">{total}</span>
                        {med.estoque_maximo > 0 && (
                          <Progress
                            value={estoqueUsoPct}
                            className={cn("h-1 w-12", estoqueUsoPct < 25 ? "[&>div]:bg-destructive" : estoqueUsoPct < 50 ? "[&>div]:bg-warning" : "[&>div]:bg-success")}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", cfg.className)}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{activeLotes.length}</TableCell>
                    <TableCell>
                      {med.localizacao ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="font-mono">{med.localizacao}</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      R$ {med.preco_unitario.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(med)}>
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => duplicateMed(med)}>
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => confirmDeactivate(med.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Desativar</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded lotes */}
                  {expanded && activeLotes
                    .sort((a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime())
                    .map(lote => {
                      const diffDays = Math.ceil((new Date(lote.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isExpired = diffDays <= 0;
                      const isNearExpiry = diffDays > 0 && diffDays <= 60;
                      const isFefo = lote.id === activeLotes.filter(l => new Date(l.validade) > now).sort((a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime())[0]?.id;

                      return (
                        <TableRow key={lote.id} className="bg-muted/15 hover:bg-muted/25">
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="pl-14">
                            <div className="flex items-center gap-2">
                              <Barcode className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-mono font-medium">Lote {lote.numero_lote}</span>
                              {isFefo && <Badge variant="outline" className="text-[9px] bg-info/10 text-info border-info/20 h-4">FEFO</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs font-semibold">{lote.quantidade_atual}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className={cn(
                                "text-[11px]",
                                isExpired && "text-destructive font-semibold",
                                isNearExpiry && "text-warning font-medium"
                              )}>
                                {new Date(lote.validade).toLocaleDateString("pt-BR")}
                                {isExpired && " (VENCIDO)"}
                                {isNearExpiry && ` (${diffDays}d)`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages} ({totalCount} registros)
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const startPage = Math.max(0, Math.min(page - 2, totalPages - 5));
              const pageNum = startPage + i;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Deactivate Confirm */}
      <AlertDialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Desativar {deactivateConfirm?.nome}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateConfirm && deactivateConfirm.lotesAtivos > 0
                ? `Este medicamento tem ${deactivateConfirm.lotesAtivos} lote(s) ativo(s) com ${deactivateConfirm.unidades} unidade(s) em estoque. A desativação é reversível pelo administrador.`
                : "Este medicamento não tem estoque ativo. A desativação é reversível pelo administrador."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground gap-1">
              <Trash2 className="h-3.5 w-3.5" /> Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editMed ? <Edit2 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
              {editMed ? "Editar Medicamento" : "Novo Medicamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Identification */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identificação</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Nome Comercial *</Label>
                  <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Risperidona" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome Genérico</Label>
                  <Input value={form.generico} onChange={e => setForm({ ...form, generico: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Princípio Ativo</Label>
                  <Input value={form.principio_ativo} onChange={e => setForm({ ...form, principio_ativo: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Concentração</Label>
                  <Input value={form.concentracao} onChange={e => setForm({ ...form, concentracao: e.target.value })} placeholder="Ex: 50mg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Forma Farmacêutica</Label>
                  <Select value={form.forma_farmaceutica} onValueChange={v => setForm({ ...form, forma_farmaceutica: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Barcode className="h-3 w-3" /> Código de Barras</Label>
                  <Input value={form.codigo_barras} onChange={e => setForm({ ...form, codigo_barras: e.target.value })} className="font-mono" />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Classificação</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={form.categoria_id} onValueChange={v => setForm({ ...form, categoria_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} />{c.nome}</div>
                      </SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fornecedor</Label>
                  <Select value={form.fornecedor_id} onValueChange={v => setForm({ ...form, fornecedor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <Switch checked={form.controlado} onCheckedChange={v => setForm({ ...form, controlado: v })} id="ctrl" />
                  <div>
                    <label htmlFor="ctrl" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Substância Controlada
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Requer registro em livro de psicotrópicos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Estoque & Localização</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Estoque Mínimo</Label>
                  <Input type="number" value={form.estoque_minimo} onChange={e => setForm({ ...form, estoque_minimo: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estoque Máximo</Label>
                  <Input type="number" value={form.estoque_maximo} onChange={e => setForm({ ...form, estoque_maximo: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Localização</Label>
                  <Input value={form.localizacao} onChange={e => setForm({ ...form, localizacao: e.target.value })} placeholder="A-01" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Preço Unit. (R$)</Label>
                  <Input type="number" step="0.01" value={form.preco_unitario} onChange={e => setForm({ ...form, preco_unitario: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground gap-2">
                {saving ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : editMed ? <><Edit2 className="h-3.5 w-3.5" /> Salvar</> : <><Plus className="h-3.5 w-3.5" /> Cadastrar</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Medicamentos;
