import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
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
  ArrowUpDown, Filter, RefreshCw, Copy, ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Medicamento, Lote, Categoria, Fornecedor, TipoItem } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG, TIPO_ITEM_CONFIG } from "@/types/database";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 50;

const FORMAS = ["Comprimido", "Cápsula", "Solução Oral", "Injetável", "Gotas", "Pomada", "Creme", "Gel", "Supositório", "Adesivo", "Spray", "Pó para Suspensão"];

type SortKey = "nome" | "estoque" | "status" | "preco";
type SortDir = "asc" | "desc";

const Medicamentos = () => {
  const { log } = useAudit();
  const { profile } = useAuth();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[]; categoria?: Categoria })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formaFilter, setFormaFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState<"all" | TipoItem>("all");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  const handleCatFilter = (v: string) => { setCatFilter(v); setPage(0); };
  const handleFormaFilter = (v: string) => { setFormaFilter(v); setPage(0); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(0); };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medicamento | null>(null);
  const [detailMed, setDetailMed] = useState<(Medicamento & { lotes: Lote[]; categoria?: Categoria }) | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [form, setForm] = useState({
    tipo_item: "medicamento" as TipoItem,
    nome: "", generico: "", principio_ativo: "", concentracao: "",
    forma_farmaceutica: "Comprimido", codigo_barras: "", categoria_id: "",
    controlado: false, lista_controlada: "" as string,
    fornecedor_id: "", estoque_minimo: 0, estoque_maximo: 0,
    localizacao: "", preco_unitario: 0,
    unidade_estoque: "unidade", unidade_entrada: "unidade",
    fator_conversao: 1, ponto_pedido: 0,
  });

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ id: string; nome: string; lotesAtivos: number; unidades: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Build query with server-side filters
    let countQuery = supabase.from("medicamentos").select("id", { count: "exact", head: true }).eq("ativo", true);
    let medsQuery = supabase.from("medicamentos").select("*").eq("ativo", true).order("nome");

    // Apply category filter at DB level
    if (catFilter !== "all") {
      countQuery = countQuery.eq("categoria_id", catFilter);
      medsQuery = medsQuery.eq("categoria_id", catFilter);
    }

    // Apply forma filter at DB level
    if (formaFilter !== "all") {
      countQuery = countQuery.eq("forma_farmaceutica", formaFilter);
      medsQuery = medsQuery.eq("forma_farmaceutica", formaFilter);
    }

    // Apply tipo_item filter at DB level
    if (tipoFilter !== "all") {
      countQuery = countQuery.eq("tipo_item", tipoFilter);
      medsQuery = medsQuery.eq("tipo_item", tipoFilter);
    }

    // Apply search filter at DB level
    if (debouncedSearch.trim()) {
      const term = `%${debouncedSearch.trim()}%`;
      countQuery = countQuery.or(`nome.ilike.${term},generico.ilike.${term},principio_ativo.ilike.${term},codigo_barras.ilike.${term}`);
      medsQuery = medsQuery.or(`nome.ilike.${term},generico.ilike.${term},principio_ativo.ilike.${term},codigo_barras.ilike.${term}`);
    }

    const { count } = await countQuery;
    setTotalCount(count || 0);

    const [{ data: medsData }, { data: lotesData }, { data: catsData }, { data: fornData }] = await Promise.all([
      medsQuery.range(from, to),
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

  useEffect(() => { fetchData(); }, [page, catFilter, formaFilter, tipoFilter, debouncedSearch, profile?.filial_id]);

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
    // Category, forma, and search are now applied server-side
    // Only status filter needs client-side (depends on lotes data)
    let result = meds.filter(m => {
      const matchStatus = statusFilter === "all" || getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === statusFilter;
      return matchStatus;
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
  }, [meds, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleExpand = (id: string) => setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openNew = () => {
    setEditMed(null);
    setForm({ tipo_item: "medicamento", nome: "", generico: "", principio_ativo: "", concentracao: "", forma_farmaceutica: "Comprimido", codigo_barras: "", categoria_id: "", controlado: false, lista_controlada: "", fornecedor_id: "", estoque_minimo: 0, estoque_maximo: 0, localizacao: "", preco_unitario: 0, unidade_estoque: "unidade", unidade_entrada: "unidade", fator_conversao: 1, ponto_pedido: 0 });
    setDialogOpen(true);
  };

  const openEdit = (m: Medicamento) => {
    setEditMed(m);
    const mAny = m as any;
    setForm({ tipo_item: ((m as any).tipo_item ?? "medicamento") as TipoItem, nome: m.nome, generico: m.generico, principio_ativo: m.principio_ativo, concentracao: m.concentracao, forma_farmaceutica: m.forma_farmaceutica, codigo_barras: m.codigo_barras || "", categoria_id: m.categoria_id || "", controlado: m.controlado, lista_controlada: (m as unknown as { lista_controlada?: string }).lista_controlada ?? "", fornecedor_id: m.fornecedor_id || "", estoque_minimo: m.estoque_minimo, estoque_maximo: m.estoque_maximo, localizacao: m.localizacao, preco_unitario: m.preco_unitario, unidade_estoque: mAny.unidade_estoque || "unidade", unidade_entrada: mAny.unidade_entrada || "unidade", fator_conversao: mAny.fator_conversao || 1, ponto_pedido: mAny.ponto_pedido || 0 });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório"); return; }
    if (form.controlado && !form.lista_controlada) {
      toast.error("Medicamento controlado exige classificação (Portaria 344/98)");
      return;
    }
    if (form.estoque_maximo > 0 && form.estoque_maximo < form.estoque_minimo) {
      toast.error("Estoque máximo deve ser ≥ mínimo");
      return;
    }
    setSaving(true);
    const row = { tipo_item: form.tipo_item, nome: form.nome, generico: form.generico, principio_ativo: form.principio_ativo, concentracao: form.concentracao, forma_farmaceutica: form.forma_farmaceutica, codigo_barras: form.codigo_barras || null, categoria_id: form.categoria_id || null, controlado: form.tipo_item === "medicamento" ? form.controlado : false, lista_controlada: form.tipo_item === "medicamento" && form.controlado ? form.lista_controlada : null, fornecedor_id: form.fornecedor_id || null, estoque_minimo: form.estoque_minimo, estoque_maximo: form.estoque_maximo, localizacao: form.localizacao, preco_unitario: form.preco_unitario, unidade_estoque: form.unidade_estoque, unidade_entrada: form.unidade_entrada, fator_conversao: form.fator_conversao, ponto_pedido: form.ponto_pedido, ...(editMed ? {} : { filial_id: profile?.filial_id }) };

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
    const mAny = m as any;
    setForm({ tipo_item: ((m as any).tipo_item ?? "medicamento") as TipoItem, nome: m.nome + " (cópia)", generico: m.generico, principio_ativo: m.principio_ativo, concentracao: m.concentracao, forma_farmaceutica: m.forma_farmaceutica, codigo_barras: "", categoria_id: m.categoria_id || "", controlado: m.controlado, lista_controlada: (m as unknown as { lista_controlada?: string }).lista_controlada ?? "", fornecedor_id: m.fornecedor_id || "", estoque_minimo: m.estoque_minimo, estoque_maximo: m.estoque_maximo, localizacao: m.localizacao, preco_unitario: m.preco_unitario, unidade_estoque: mAny.unidade_estoque || "unidade", unidade_entrada: mAny.unidade_entrada || "unidade", fator_conversao: mAny.fator_conversao || 1, ponto_pedido: mAny.ponto_pedido || 0 });
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
      title="Itens / Estoque"
      subtitle={`${totalCount} cadastrados • ${stats.totalUnits.toLocaleString("pt-BR")} unidades`}
      actions={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      }
    >
      {/* Tipo de item — abas */}
      <Tabs value={tipoFilter} onValueChange={(v) => { setTipoFilter(v as any); setPage(0); }} className="mb-4">
        <TabsList className="grid w-full grid-cols-5 sm:w-auto sm:inline-flex">
          <TabsTrigger value="all" className="gap-1.5 text-xs">Tudo</TabsTrigger>
          {(Object.keys(TIPO_ITEM_CONFIG) as TipoItem[]).map((t) => (
            <TabsTrigger key={t} value={t} className="gap-1.5 text-xs">
              <span>{TIPO_ITEM_CONFIG[t].emoji}</span>
              <span className="hidden sm:inline">{TIPO_ITEM_CONFIG[t].label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
          <div
            key={kpi.label}
            className={cn(
              "group relative rounded-xl border bg-card p-3 shadow-card cursor-pointer hover:shadow-card-hover transition-all text-center overflow-hidden",
              statusFilter === kpi.filter && kpi.filter !== "all" && "ring-2 ring-primary"
            )}
            onClick={() => kpi.filter !== "all" ? handleStatusFilter(statusFilter === kpi.filter ? "all" : kpi.filter) : null}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {/* Hover gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className={cn("flex h-9 w-9 mx-auto items-center justify-center rounded-xl mb-1.5 transition-all duration-300 group-hover:scale-110", kpi.color)}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold leading-tight font-display">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{kpi.label}</p>
            </div>
          </div>
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
        <Select value={catFilter} onValueChange={handleCatFilter}>
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
        <Select value={formaFilter} onValueChange={handleFormaFilter}>
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
            <button className="ml-2 text-primary hover:underline" onClick={() => { setStatusFilter("all"); setCatFilter("all"); setFormaFilter("all"); setSearch(""); setPage(0); }}>
              Limpar filtros
            </button>
          )}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300">
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
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden p-0 gap-0 rounded-2xl border-border/50">
          {/* Header with gradient accent */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-glow to-primary rounded-t-2xl" />
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-3 text-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  {editMed ? <Edit2 className="h-5 w-5 text-primary" /> : <Pill className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <span className="font-display font-bold">{editMed ? "Editar Medicamento" : "Novo Medicamento"}</span>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">
                    {editMed ? "Atualize as informações do medicamento" : "Preencha os dados para cadastrar um novo medicamento"}
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-6 pb-6 max-h-[calc(90vh-180px)] space-y-6">
            {/* Section: Identificação */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold font-display">1</div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">Identificação</h4>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              {/* Tipo de item — escolha primeiro */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs font-semibold text-foreground/80">Tipo de Item <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(TIPO_ITEM_CONFIG) as TipoItem[]).map((t) => {
                    const cfg = TIPO_ITEM_CONFIG[t];
                    const active = form.tipo_item === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, tipo_item: t })}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all text-xs font-medium",
                          active ? "border-primary bg-primary/5 shadow-sm" : "border-border/40 hover:border-border bg-muted/20"
                        )}
                      >
                        <span className="text-xl">{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold text-foreground/80">Nome {form.tipo_item === "medicamento" ? "Comercial" : ""} <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    placeholder={form.tipo_item === "medicamento" ? "Ex: Risperidona 2mg" : form.tipo_item === "material" ? "Ex: Seringa descartável 10ml" : form.tipo_item === "epi" ? "Ex: Máscara cirúrgica" : "Ex: Álcool 70%"}
                    className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                  />
                </div>
                {form.tipo_item === "medicamento" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground/80">Nome Genérico</Label>
                      <Input
                        value={form.generico}
                        onChange={e => setForm({ ...form, generico: e.target.value })}
                        placeholder="Ex: Risperidona"
                        className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground/80">Princípio Ativo</Label>
                      <Input
                        value={form.principio_ativo}
                        onChange={e => setForm({ ...form, principio_ativo: e.target.value })}
                        placeholder="Ex: Risperidona"
                        className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground/80">Concentração</Label>
                      <Input
                        value={form.concentracao}
                        onChange={e => setForm({ ...form, concentracao: e.target.value })}
                        placeholder="Ex: 2mg/mL"
                        className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground/80">Forma Farmacêutica</Label>
                      <Select value={form.forma_farmaceutica} onValueChange={v => setForm({ ...form, forma_farmaceutica: v })}>
                        <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">{FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                    <Barcode className="h-3 w-3 text-muted-foreground" /> Código de Barras
                  </Label>
                  <Input
                    value={form.codigo_barras}
                    onChange={e => setForm({ ...form, codigo_barras: e.target.value })}
                    placeholder="EAN-13"
                    className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all font-mono tracking-wider placeholder:text-muted-foreground/40 placeholder:font-sans placeholder:tracking-normal"
                  />
                </div>
              </div>
            </div>

            {/* Section: Classificação */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold font-display">2</div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">Classificação</h4>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Categoria</Label>
                  <Select value={form.categoria_id} onValueChange={v => setForm({ ...form, categoria_id: v })}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40"><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                    <SelectContent className="rounded-xl">{categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2.5">
                          <div className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ring-offset-background" style={{ backgroundColor: c.cor, boxShadow: `0 0 6px ${c.cor}40` }} />
                          {c.nome}
                        </div>
                      </SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Fornecedor</Label>
                  <Select value={form.fornecedor_id} onValueChange={v => setForm({ ...form, fornecedor_id: v })}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                    <SelectContent className="rounded-xl">{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <div className={cn(
                    "flex items-center gap-4 rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer",
                    form.controlado
                      ? "border-primary/40 bg-primary/5 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.2)]"
                      : "border-border/30 bg-muted/20 hover:border-border/50 hover:bg-muted/30"
                  )} onClick={() => setForm({ ...form, controlado: !form.controlado })}>
                    <Switch checked={form.controlado} onCheckedChange={v => setForm({ ...form, controlado: v })} id="ctrl" />
                    <div className="flex-1">
                      <label htmlFor="ctrl" className="text-sm font-semibold cursor-pointer flex items-center gap-2">
                        <ShieldCheck className={cn("h-4 w-4 transition-colors", form.controlado ? "text-primary" : "text-muted-foreground")} />
                        Substância Controlada
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-1">Requer registro em livro de psicotrópicos (Portaria 344/98)</p>
                    </div>
                    {form.controlado && (
                      <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] animate-fade-in">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  {form.controlado && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <Label className="text-xs">Lista 344/98 *</Label>
                      <Select
                        value={form.lista_controlada}
                        onValueChange={(v) => setForm({ ...form, lista_controlada: v })}
                      >
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue placeholder="Classificar (A1, B1, C1...)" />
                        </SelectTrigger>
                        <SelectContent>
                          {["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C3", "C4", "C5"].map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Estoque & Localização */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold font-display">3</div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">Estoque & Localização</h4>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Estoque Mínimo</Label>
                  <div className="relative">
                    <Input type="number" value={form.estoque_minimo} onChange={e => setForm({ ...form, estoque_minimo: Number(e.target.value) })} className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all font-mono pr-10" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">{form.unidade_estoque.toUpperCase().slice(0,3)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Estoque Máximo</Label>
                  <div className="relative">
                    <Input type="number" value={form.estoque_maximo} onChange={e => setForm({ ...form, estoque_maximo: Number(e.target.value) })} className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all font-mono pr-10" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">{form.unidade_estoque.toUpperCase().slice(0,3)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Ponto de Pedido</Label>
                  <div className="relative">
                    <Input type="number" value={form.ponto_pedido} onChange={e => setForm({ ...form, ponto_pedido: Number(e.target.value) })} className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all font-mono pr-16" placeholder="0" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3" /> {form.unidade_estoque.toUpperCase().slice(0,3)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Nível para gerar alerta de compra</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Preço Unitário</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">R$</span>
                    <Input type="number" step="0.01" value={form.preco_unitario} onChange={e => setForm({ ...form, preco_unitario: Number(e.target.value) })} className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all font-mono pl-10" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" /> Localização
                  </Label>
                  <Input value={form.localizacao} onChange={e => setForm({ ...form, localizacao: e.target.value })} placeholder="A-01-03" className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all font-mono tracking-wider placeholder:text-muted-foreground/40" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Unidade de Estoque</Label>
                  <Select value={form.unidade_estoque} onValueChange={v => setForm({ ...form, unidade_estoque: v })}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["unidade", "comprimido", "ampola", "frasco", "ml", "mg", "gota", "sachê", "adesivo", "supositório"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Unidade de Entrada</Label>
                  <Select value={form.unidade_entrada} onValueChange={v => setForm({ ...form, unidade_entrada: v })}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["unidade", "caixa", "frasco", "blister", "cartela", "litro", "pacote"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Fator de Conversão</Label>
                  <Input type="number" min={1} value={form.fator_conversao} onChange={e => setForm({ ...form, fator_conversao: Number(e.target.value) })} className="h-11 rounded-xl bg-muted/30 border-border/40 focus:bg-background focus:border-primary/50 transition-all font-mono" />
                  {form.fator_conversao > 1 && (
                    <p className="text-[10px] text-primary font-medium">1 {form.unidade_entrada} = {form.fator_conversao} {form.unidade_estoque}(s)</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/50 bg-muted/20">
            <p className="text-[10px] text-muted-foreground">
              <span className="text-destructive">*</span> Campos obrigatórios
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl h-10 px-5">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.nome} className="gradient-primary text-primary-foreground gap-2 rounded-xl h-10 px-6 shadow-md hover:shadow-lg transition-all">
                {saving ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : editMed ? (
                  <><Edit2 className="h-4 w-4" /> Salvar Alterações</>
                ) : (
                  <><Plus className="h-4 w-4" /> Cadastrar Medicamento</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Medicamentos;
