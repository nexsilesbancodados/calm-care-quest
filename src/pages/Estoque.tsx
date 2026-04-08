import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import {
  Package, AlertTriangle, CheckCircle, TrendingDown, Search, ChevronDown, ChevronRight,
  Calendar, Wrench, ShieldAlert, DollarSign, Clock, ArrowUpDown, ChevronLeft,
  Filter, X, BarChart3, TableIcon, AlertCircle, Info, TrendingUp, ShoppingCart,
  Pill, Syringe, Droplets, Wind, Eye, Sparkles, FlaskConical, CircleDot, type LucideIcon,
} from "lucide-react";

const FORMA_ICON_MAP: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  "Comprimido": { icon: Pill, color: "text-primary", bg: "bg-primary/10" },
  "Cápsula": { icon: CircleDot, color: "text-info", bg: "bg-info/10" },
  "Injetável": { icon: Syringe, color: "text-destructive", bg: "bg-destructive/10" },
  "Solução": { icon: FlaskConical, color: "text-accent", bg: "bg-accent/10" },
  "Solução Oral": { icon: Droplets, color: "text-accent", bg: "bg-accent/10" },
  "Suspensão": { icon: FlaskConical, color: "text-info", bg: "bg-info/10" },
  "Pomada": { icon: Sparkles, color: "text-warning", bg: "bg-warning/10" },
  "Creme": { icon: Sparkles, color: "text-warning", bg: "bg-warning/10" },
  "Gel": { icon: Droplets, color: "text-success", bg: "bg-success/10" },
  "Colírio": { icon: Eye, color: "text-info", bg: "bg-info/10" },
  "Spray": { icon: Wind, color: "text-accent", bg: "bg-accent/10" },
  "Aerossol": { icon: Wind, color: "text-accent", bg: "bg-accent/10" },
  "Xarope": { icon: Droplets, color: "text-primary", bg: "bg-primary/10" },
  "Supositório": { icon: CircleDot, color: "text-warning", bg: "bg-warning/10" },
  "Pó": { icon: Sparkles, color: "text-muted-foreground", bg: "bg-muted" },
};

function getFormaVisual(forma: string) {
  const match = Object.entries(FORMA_ICON_MAP).find(([key]) =>
    forma.toLowerCase().includes(key.toLowerCase())
  );
  return match ? match[1] : { icon: Pill, color: "text-muted-foreground", bg: "bg-muted" };
}
import { toast } from "sonner";
import type { Medicamento, Lote, Categoria } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG } from "@/types/database";

const COLORS = ["hsl(220,65%,38%)", "hsl(160,60%,42%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(210,80%,55%)", "hsl(280,60%,55%)", "hsl(160,40%,35%)"];
const PAGE_SIZE = 50;

const MOTIVOS_AJUSTE = [
  { value: "inventario", label: "Inventário" },
  { value: "perda", label: "Perda" },
  { value: "vencimento", label: "Vencimento" },
  { value: "erro_lancamento", label: "Erro de Lançamento" },
  { value: "outro", label: "Outro" },
];

type SortKey = "nome" | "estoque" | "status" | "valor" | "validade" | "cobertura";
type SortDir = "asc" | "desc";

const Estoque = () => {
  const { log } = useAudit();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [formaFilter, setFormaFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "charts">("table");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  // Consumo 30d para CMM
  const [consumo30d, setConsumo30d] = useState<Record<string, number>>({});

  // Ajuste dialog
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteMed, setAjusteMed] = useState<(Medicamento & { lotes: Lote[] }) | null>(null);
  const [ajusteForm, setAjusteForm] = useState({ lote_id: "", quantidade_nova: 0, motivo: "", observacao: "" });
  const [ajusteSaving, setAjusteSaving] = useState(false);

  const now = useMemo(() => new Date(), []);

  const fetchData = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: medsData }, { data: lotesData }, { data: catsData }, { data: movData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").eq("ativo", true),
      supabase.from("categorias_medicamento").select("*"),
      supabase.from("movimentacoes").select("medicamento_id, quantidade")
        .in("tipo", ["saida", "dispensacao"])
        .gte("created_at", thirtyDaysAgo),
    ]);
    setCategorias(catsData as Categoria[] || []);
    setMeds((medsData || []).map((m: any) => ({
      ...m,
      lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
    })));

    // Agregar consumo por medicamento
    const cMap: Record<string, number> = {};
    (movData || []).forEach((m: any) => {
      if (m.medicamento_id) {
        cMap[m.medicamento_id] = (cMap[m.medicamento_id] || 0) + m.quantidade;
      }
    });
    setConsumo30d(cMap);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.filial_id]);

  const toggleExpand = (id: string) => setExpandedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const formas = useMemo(() => [...new Set(meds.map(m => m.forma_farmaceutica).filter(Boolean))].sort(), [meds]);

  const getFefoLote = (lotes: Lote[]) => {
    return [...lotes].filter(l => l.ativo && new Date(l.validade) > now)
      .sort((a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime())[0];
  };

  const getProximaValidade = (lotes: Lote[]) => {
    const fefo = getFefoLote(lotes);
    return fefo ? new Date(fefo.validade) : null;
  };

  // Computed data with coverage
  const enriched = useMemo(() => meds.map(m => {
    const total = getEstoqueTotal(m.lotes);
    const status = getEstoqueStatus(total, m.estoque_minimo);
    const valorTotal = m.lotes.reduce((s, l) => s + l.quantidade_atual * l.preco_unitario, 0);
    const proxValidade = getProximaValidade(m.lotes);
    const lotesVencidos = m.lotes.filter(l => new Date(l.validade) <= now).length;
    const lotesProxVenc = m.lotes.filter(l => {
      const d = Math.ceil((new Date(l.validade).getTime() - now.getTime()) / 86400000);
      return d > 0 && d <= 60;
    }).length;

    // Cobertura em dias
    const consumo = consumo30d[m.id] || 0;
    const cmmDiario = consumo / 30;
    const coberturaDias = cmmDiario > 0 ? Math.round(total / cmmDiario) : (consumo === 0 ? -1 : Infinity);
    // -1 = sem histórico, Infinity = estoque mas sem consumo

    return { ...m, total, status, valorTotal, proxValidade, lotesVencidos, lotesProxVenc, coberturaDias };
  }), [meds, now, consumo30d]);

  const filtered = useMemo(() => {
    let items = enriched.filter(m => {
      const matchSearch = !search ||
        m.nome.toLowerCase().includes(search.toLowerCase()) ||
        m.generico.toLowerCase().includes(search.toLowerCase()) ||
        m.principio_ativo.toLowerCase().includes(search.toLowerCase()) ||
        m.codigo_barras?.includes(search);
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      const matchCat = catFilter === "all" || m.categoria_id === catFilter;
      const matchForma = formaFilter === "all" || m.forma_farmaceutica === formaFilter;
      return matchSearch && matchStatus && matchCat && matchForma;
    });

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "nome": cmp = a.nome.localeCompare(b.nome); break;
        case "estoque": cmp = a.total - b.total; break;
        case "status": {
          const order = { esgotado: 0, critico: 1, baixo: 2, normal: 3 };
          cmp = (order[a.status] ?? 4) - (order[b.status] ?? 4);
          break;
        }
        case "valor": cmp = a.valorTotal - b.valorTotal; break;
        case "validade": {
          const av = a.proxValidade?.getTime() ?? Infinity;
          const bv = b.proxValidade?.getTime() ?? Infinity;
          cmp = av - bv;
          break;
        }
        case "cobertura": {
          // -1 (sem histórico) goes to end
          const av = a.coberturaDias === -1 ? Infinity : a.coberturaDias;
          const bv = b.coberturaDias === -1 ? Infinity : b.coberturaDias;
          cmp = av - bv;
          break;
        }
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return items;
  }, [enriched, search, statusFilter, catFilter, formaFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const totalUnits = enriched.reduce((s, m) => s + m.total, 0);
  const totalValue = enriched.reduce((s, m) => s + m.valorTotal, 0);
  const statusCounts = {
    normal: enriched.filter(m => m.status === "normal").length,
    baixo: enriched.filter(m => m.status === "baixo").length,
    critico: enriched.filter(m => m.status === "critico").length,
    esgotado: enriched.filter(m => m.status === "esgotado").length,
  };
  const totalControlados = enriched.filter(m => m.controlado).length;
  const totalVencidos = enriched.reduce((s, m) => s + m.lotesVencidos, 0);
  const totalProxVenc = enriched.reduce((s, m) => s + m.lotesProxVenc, 0);

  const hasFilters = search || statusFilter !== "all" || catFilter !== "all" || formaFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setCatFilter("all"); setFormaFilter("all"); setPage(1); };

  // Chart data
  const topStock = useMemo(() =>
    [...enriched].sort((a, b) => b.total - a.total).slice(0, 10)
      .map(m => ({ name: m.nome.length > 22 ? m.nome.substring(0, 22) + "…" : m.nome, estoque: m.total })),
    [enriched]
  );

  const catData = useMemo(() =>
    categorias.map(c => ({
      name: c.nome,
      value: enriched.filter(m => m.categoria_id === c.id).reduce((s, m) => s + m.total, 0),
      color: c.cor || COLORS[0],
    })).filter(c => c.value > 0),
    [enriched, categorias]
  );

  const valorPorCat = useMemo(() =>
    categorias.map(c => ({
      name: c.nome,
      valor: enriched.filter(m => m.categoria_id === c.id).reduce((s, m) => s + m.valorTotal, 0),
    })).filter(c => c.valor > 0).sort((a, b) => b.valor - a.valor),
    [enriched, categorias]
  );

  // Items próximos do vencimento para alerta
  const alertaVencimento = useMemo(() =>
    enriched.flatMap(m => m.lotes
      .filter(l => {
        const d = Math.ceil((new Date(l.validade).getTime() - now.getTime()) / 86400000);
        return d <= 60;
      })
      .map(l => ({
        medNome: m.nome,
        lote: l.numero_lote,
        validade: l.validade,
        quantidade: l.quantidade_atual,
        dias: Math.ceil((new Date(l.validade).getTime() - now.getTime()) / 86400000),
        vencido: new Date(l.validade) <= now,
      }))
    ).sort((a, b) => a.dias - b.dias).slice(0, 10),
    [enriched, now]
  );

  // Coverage badge helper
  const renderCobertura = (dias: number) => {
    if (dias === -1) return <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-muted">—</Badge>;
    if (dias === Infinity || dias > 999) return <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20">∞</Badge>;
    if (dias > 30) return <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20">{dias > 90 ? "> 90d" : `${dias}d`}</Badge>;
    if (dias > 15) return <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/20">{dias}d</Badge>;
    return <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">{dias}d</Badge>;
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
      filial_id: profile?.filial_id,
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

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort(field)}>
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === field ? "text-primary" : "text-muted-foreground/40")} />
    </button>
  );

  if (loading) return (
    <AppLayout title="Estoque">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Estoque" subtitle={`${enriched.length} medicamentos • ${totalUnits.toLocaleString("pt-BR")} unidades`}>
      <TooltipProvider>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: "Total Itens", value: enriched.length, icon: Package, color: "text-primary", bg: "bg-primary/10", filter: null },
            { label: "Normal", value: statusCounts.normal, icon: CheckCircle, color: "text-success", bg: "bg-success/10", filter: "normal" },
            { label: "Baixo", value: statusCounts.baixo, icon: TrendingDown, color: "text-warning", bg: "bg-warning/10", filter: "baixo" },
            { label: "Crítico", value: statusCounts.critico, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", filter: "critico" },
            { label: "Esgotado", value: statusCounts.esgotado, icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted", filter: "esgotado" },
            { label: "Controlados", value: totalControlados, icon: ShieldAlert, color: "text-info", bg: "bg-info/10", filter: null },
            { label: "Valor Total", value: `R$ ${(totalValue / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-success", bg: "bg-success/10", filter: null },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className={cn(
                "rounded-xl border bg-card p-3.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
                kpi.filter && statusFilter === kpi.filter && "ring-2 ring-primary shadow-md"
              )}
              onClick={() => kpi.filter && setStatusFilter(statusFilter === kpi.filter ? "all" : kpi.filter)}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", kpi.bg)}>
                  <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                  <p className="text-lg font-bold leading-tight">{typeof kpi.value === "number" ? kpi.value : kpi.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerta de vencimento */}
        {(totalVencidos > 0 || totalProxVenc > 0) && (
          <div
            className="mb-5 rounded-xl border border-warning/30 bg-warning/5 p-4"
          >
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground mb-1">Alertas de Validade</h4>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                  {totalVencidos > 0 && (
                    <span className="flex items-center gap-1 text-destructive font-medium">
                      <AlertTriangle className="h-3 w-3" /> {totalVencidos} lote(s) vencido(s)
                    </span>
                  )}
                  {totalProxVenc > 0 && (
                    <span className="flex items-center gap-1 text-warning font-medium">
                      <Clock className="h-3 w-3" /> {totalProxVenc} lote(s) próximo(s) do vencimento (≤60 dias)
                    </span>
                  )}
                </div>
                {alertaVencimento.length > 0 && (
                  <div className="grid gap-1.5 max-h-32 overflow-y-auto">
                    {alertaVencimento.map((a, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-2 text-[11px] py-1 px-2 rounded-md",
                        a.vencido ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning-foreground"
                      )}>
                        <span className="font-medium truncate flex-1">{a.medNome}</span>
                        <span className="font-mono">Lote {a.lote}</span>
                        <span>{a.quantidade} un</span>
                        <Badge variant="outline" className={cn("text-[9px] h-4",
                          a.vencido ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"
                        )}>
                          {a.vencido ? "VENCIDO" : `${a.dias}d`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, genérico, princípio ativo ou código..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-card"
            />
          </div>
          <Select value={catFilter} onValueChange={v => { setCatFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] bg-card"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categorias.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                    {c.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={formaFilter} onValueChange={v => { setFormaFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] bg-card"><SelectValue placeholder="Forma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas formas</SelectItem>
              {formas.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Sort select */}
          <Select value={`${sortKey}-${sortDir}`} onValueChange={v => {
            const [k, d] = v.split("-") as [SortKey, SortDir];
            setSortKey(k); setSortDir(d); setPage(1);
          }}>
            <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Ordenar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nome-asc">Nome A-Z</SelectItem>
              <SelectItem value="nome-desc">Nome Z-A</SelectItem>
              <SelectItem value="estoque-desc">Estoque maior</SelectItem>
              <SelectItem value="estoque-asc">Estoque menor</SelectItem>
              <SelectItem value="cobertura-asc">Menor cobertura</SelectItem>
              <SelectItem value="cobertura-desc">Maior cobertura</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border bg-card overflow-hidden">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="rounded-none text-xs gap-1.5" onClick={() => setViewMode("table")}>
              <TableIcon className="h-3.5 w-3.5" /> Tabela
            </Button>
            <Button variant={viewMode === "charts" ? "default" : "ghost"} size="sm" className="rounded-none text-xs gap-1.5" onClick={() => setViewMode("charts")}>
              <BarChart3 className="h-3.5 w-3.5" /> Gráficos
            </Button>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 text-muted-foreground">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">
            {filtered.length} resultado(s)
            {hasFilters && ` de ${enriched.length}`}
          </p>
        </div>

        {viewMode === "table" ? (
          <>
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-8"></TableHead>
                    <TableHead><SortHeader label="Medicamento" field="nome" /></TableHead>
                    <TableHead>Forma / Concentração</TableHead>
                    <TableHead className="text-center"><SortHeader label="Estoque" field="estoque" /></TableHead>
                    <TableHead><SortHeader label="Status" field="status" /></TableHead>
                    <TableHead className="text-center"><SortHeader label="Cobertura" field="cobertura" /></TableHead>
                    <TableHead className="text-center"><SortHeader label="Próx. Validade" field="validade" /></TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-right"><SortHeader label="Valor" field="valor" /></TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm font-medium">Nenhum item encontrado</p>
                        <p className="text-xs mt-1">Tente ajustar os filtros de busca</p>
                      </TableCell>
                    </TableRow>
                  ) : paginated.map(med => {
                    const cfg = ESTOQUE_STATUS_CONFIG[med.status];
                    const expanded = expandedIds.has(med.id);
                    const fefoLote = getFefoLote(med.lotes);
                    const progressPct = med.estoque_maximo > 0 ? Math.min(100, (med.total / med.estoque_maximo) * 100) : 0;
                    const showReposicao = med.status === "esgotado" || med.status === "critico";

                    return (
                      <React.Fragment key={med.id}>
                        <TableRow
                          className="hover:bg-accent/30 cursor-pointer group"
                          onClick={() => med.lotes.length > 0 && toggleExpand(med.id)}
                        >
                          <TableCell className="w-8">
                            {med.lotes.length > 0 && (
                              expanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              {(() => {
                                const fv = getFormaVisual(med.forma_farmaceutica);
                                const FormaIcon = fv.icon;
                                return (
                                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", fv.bg)}>
                                    <FormaIcon className={cn("h-4 w-4", fv.color)} />
                                  </div>
                                );
                              })()}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium">{med.nome}</p>
                                  {med.controlado && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">Medicamento Controlado</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground">{med.principio_ativo || med.generico}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {med.forma_farmaceutica} {med.concentracao && `• ${med.concentracao}`}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-semibold text-sm">{med.total}</span>
                              {med.estoque_maximo > 0 && (
                                <Tooltip>
                                  <TooltipTrigger className="w-full max-w-[60px]">
                                    <Progress value={progressPct} className="h-1.5" />
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    {med.total} / {med.estoque_maximo} (mín: {med.estoque_minimo})
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]", cfg.className)}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger>
                                {renderCobertura(med.coberturaDias)}
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                {med.coberturaDias === -1
                                  ? "Sem histórico de saídas nos últimos 30 dias"
                                  : med.coberturaDias === Infinity || med.coberturaDias > 999
                                    ? "Estoque disponível, sem consumo recente"
                                    : `CMM diário: ${(consumo30d[med.id] / 30).toFixed(1)} un/dia`}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-center">
                            {med.proxValidade ? (
                              <span className={cn("text-xs", (() => {
                                const d = Math.ceil((med.proxValidade.getTime() - now.getTime()) / 86400000);
                                if (d <= 0) return "text-destructive font-semibold";
                                if (d <= 60) return "text-warning font-medium";
                                return "text-muted-foreground";
                              })())}>
                                {med.proxValidade.toLocaleDateString("pt-BR")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{med.localizacao || "—"}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            R$ {med.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {showReposicao && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => { e.stopPropagation(); navigate(`/entrada?medicamento_id=${med.id}&nome=${encodeURIComponent(med.nome)}`); }}
                                    >
                                      <ShoppingCart className="h-3 w-3" /> Repor
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">Pedir Reposição</TooltipContent>
                                </Tooltip>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); openAjuste(med); }}
                                title="Ajuste de Estoque"
                              >
                                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded && med.lotes
                          .sort((a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime())
                          .map(lote => {
                            const diffDays = Math.ceil((new Date(lote.validade).getTime() - now.getTime()) / 86400000);
                            const isExpired = diffDays <= 0;
                            const isNearExpiry = diffDays > 0 && diffDays <= 60;
                            const isFefo = lote.id === fefoLote?.id;
                            return (
                              <TableRow key={lote.id} className="bg-muted/20 hover:bg-muted/30">
                                <TableCell></TableCell>
                                <TableCell colSpan={2} className="text-xs text-muted-foreground pl-8">
                                  <span className="font-mono font-medium">Lote {lote.numero_lote}</span>
                                  {isFefo && (
                                    <Badge variant="outline" className="ml-2 text-[9px] bg-info/10 text-info border-info/20">FEFO</Badge>
                                  )}
                                  {isExpired && (
                                    <Badge variant="outline" className="ml-2 text-[9px] bg-destructive/10 text-destructive border-destructive/20">VENCIDO</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center text-xs font-medium">{lote.quantidade_atual}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <span className={cn("text-[11px]",
                                      isExpired && "text-destructive font-semibold",
                                      isNearExpiry && "text-warning font-medium"
                                    )}>
                                      {new Date(lote.validade).toLocaleDateString("pt-BR")}
                                      {isNearExpiry && ` (${diffDays}d)`}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell></TableCell>
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0 text-xs"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Tabs defaultValue="estoque" className="space-y-4">
            <TabsList>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="categorias">Categorias</TabsTrigger>
              <TabsTrigger value="valor">Valor Financeiro</TabsTrigger>
            </TabsList>

            <TabsContent value="estoque">
              <div className="space-y-6">
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">Top 10 — Maior Estoque</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topStock} margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="estoque" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">Distribuição por Status</h3>
                  <div className="flex items-center">
                    <ResponsiveContainer width="50%" height={240}>
                      <PieChart>
                        <Pie data={[
                          { name: "Normal", value: statusCounts.normal },
                          { name: "Baixo", value: statusCounts.baixo },
                          { name: "Crítico", value: statusCounts.critico },
                          { name: "Esgotado", value: statusCounts.esgotado },
                        ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" stroke="none">
                          <Cell fill="hsl(var(--success))" />
                          <Cell fill="hsl(var(--warning))" />
                          <Cell fill="hsl(var(--destructive))" />
                          <Cell fill="hsl(var(--muted-foreground))" />
                        </Pie>
                        <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 flex-1">
                      {[
                        { label: "Normal", count: statusCounts.normal, color: "bg-success" },
                        { label: "Baixo", count: statusCounts.baixo, color: "bg-warning" },
                        { label: "Crítico", count: statusCounts.critico, color: "bg-destructive" },
                        { label: "Esgotado", count: statusCounts.esgotado, color: "bg-muted-foreground" },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-2 text-xs">
                          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", s.color)} />
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="ml-auto font-semibold">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="categorias">
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-4">Unidades por Categoria</h3>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={280}>
                    <PieChart>
                      <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" stroke="none">
                        {catData.map((c, i) => <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1 max-h-[280px] overflow-y-auto">
                    {catData.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color || COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground truncate flex-1">{c.name}</span>
                        <span className="font-semibold">{c.value.toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="valor">
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-2">Valor em Estoque por Categoria</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Total: R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={valorPorCat} margin={{ left: 10, right: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <RTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor"]}
                    />
                    <Bar dataKey="valor" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Ajuste Dialog */}
        <Dialog open={ajusteOpen} onOpenChange={setAjusteOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                Ajuste de Estoque — {ajusteMed?.nome}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Lote *</Label>
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
                <Label className="text-xs font-medium">Quantidade Nova</Label>
                <Input type="number" min={0} value={ajusteForm.quantidade_nova} onChange={e => setAjusteForm({ ...ajusteForm, quantidade_nova: Number(e.target.value) })} />
                {ajusteForm.lote_id && (() => {
                  const loteAtual = ajusteMed?.lotes.find(l => l.id === ajusteForm.lote_id);
                  const delta = ajusteForm.quantidade_nova - (loteAtual?.quantidade_atual || 0);
                  return (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      Atual: <span className="font-medium">{loteAtual?.quantidade_atual}</span>
                      → Nova: <span className="font-medium">{ajusteForm.quantidade_nova}</span>
                      <span className={cn("font-semibold ml-1", delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "")}>
                        ({delta > 0 ? "+" : ""}{delta})
                      </span>
                    </p>
                  );
                })()}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Motivo *</Label>
                <Select value={ajusteForm.motivo} onValueChange={v => setAjusteForm({ ...ajusteForm, motivo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_AJUSTE.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Observação *</Label>
                <Textarea value={ajusteForm.observacao} onChange={e => setAjusteForm({ ...ajusteForm, observacao: e.target.value })} rows={2} placeholder="Descreva o motivo do ajuste..." />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setAjusteOpen(false)}>Cancelar</Button>
                <Button onClick={handleAjuste} disabled={ajusteSaving} className="gradient-primary text-primary-foreground">
                  {ajusteSaving ? "Salvando..." : "Confirmar Ajuste"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AppLayout>
  );
};

export default Estoque;
