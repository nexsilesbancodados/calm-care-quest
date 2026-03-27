import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search, ArrowDownCircle, ArrowUpCircle, Repeat, ChevronLeft, ChevronRight,
  Calendar, Download, ClipboardList, RefreshCw, Wrench, ArrowLeftRight, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { label: string; icon: any; className: string; qtyClass: string }> = {
  entrada: { label: "Entrada", icon: ArrowDownCircle, className: "bg-success/10 text-success border-success/20", qtyClass: "text-success" },
  saida: { label: "Saída", icon: ArrowUpCircle, className: "bg-destructive/10 text-destructive border-destructive/20", qtyClass: "text-destructive" },
  dispensacao: { label: "Dispensação", icon: ArrowUpCircle, className: "bg-info/10 text-info border-info/20", qtyClass: "text-info" },
  ajuste: { label: "Ajuste", icon: Wrench, className: "bg-warning/10 text-warning border-warning/20", qtyClass: "text-warning" },
  transferencia: { label: "Transferência", icon: ArrowLeftRight, className: "bg-primary/10 text-primary border-primary/20", qtyClass: "text-primary" },
};

const PAGE_SIZE = 50;

const Movimentacoes = () => {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    let countQuery = supabase.from("movimentacoes").select("id", { count: "exact", head: true });
    if (typeFilter !== "all") countQuery = countQuery.eq("tipo", typeFilter as any);
    if (dateFrom) countQuery = countQuery.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) countQuery = countQuery.lte("created_at", `${dateTo}T23:59:59`);
    const { count } = await countQuery;
    setTotalCount(count || 0);

    let query = supabase.from("movimentacoes").select("*, medicamentos(nome, concentracao)").order("created_at", { ascending: false });
    if (typeFilter !== "all") query = query.eq("tipo", typeFilter as any);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data } = await query;
    setMovements(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [typeFilter, dateFrom, dateTo, page, profile?.filial_id]);

  const filtered = movements.filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (m.medicamentos?.nome || "").toLowerCase().includes(s) || (m.paciente || "").toLowerCase().includes(s) || (m.setor || "").toLowerCase().includes(s) || (m.nota_fiscal || "").toLowerCase().includes(s);
  });

  const hasFilters = search || typeFilter !== "all" || dateFrom || dateTo;
  const resetFilters = () => { setSearch(""); setTypeFilter("all"); setDateFrom(""); setDateTo(""); setPage(0); };
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Type breakdown stats
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(typeConfig).forEach(k => { counts[k] = 0; });
    movements.forEach(m => { counts[m.tipo] = (counts[m.tipo] || 0) + 1; });
    return counts;
  }, [movements]);

  const entradas = movements.filter(m => m.tipo === "entrada").reduce((s, m) => s + m.quantidade, 0);
  const saidas = movements.filter(m => ["saida", "dispensacao"].includes(m.tipo)).reduce((s, m) => s + m.quantidade, 0);

  const handleExportCSV = () => {
    const headers = ["Data", "Tipo", "Medicamento", "Concentração", "Quantidade", "Paciente", "Setor", "NF", "Observação"];
    const rows = filtered.map(m => [
      new Date(m.created_at).toLocaleString("pt-BR"), m.tipo, m.medicamentos?.nome || "—", m.medicamentos?.concentracao || "",
      m.quantidade, m.paciente || "—", m.setor || "—", m.nota_fiscal || "—", (m.observacao || "").replace(/;/g, ","),
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <AppLayout title="Movimentações" subtitle="Histórico completo de entradas e saídas">
      <TooltipProvider>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total", value: totalCount, icon: ClipboardList, color: "text-primary", bg: "bg-primary/10", filter: null },
            { label: "Entradas", value: `+${entradas}`, icon: ArrowDownCircle, color: "text-success", bg: "bg-success/10", filter: "entrada" },
            { label: "Dispensações", value: typeCounts.dispensacao || 0, icon: ArrowUpCircle, color: "text-info", bg: "bg-info/10", filter: "dispensacao" },
            { label: "Ajustes", value: typeCounts.ajuste || 0, icon: Wrench, color: "text-warning", bg: "bg-warning/10", filter: "ajuste" },
            { label: "Transferências", value: typeCounts.transferencia || 0, icon: ArrowLeftRight, color: "text-primary", bg: "bg-primary/10", filter: "transferencia" },
          ].map((kpi, i) => (
            <div key={kpi.label}
              className={cn("rounded-xl border bg-card p-3.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
                kpi.filter && typeFilter === kpi.filter && "ring-2 ring-primary")}
              onClick={() => kpi.filter && setTypeFilter(typeFilter === kpi.filter ? "all" : kpi.filter)}>
              <div className="flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", kpi.bg)}>
                  <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar medicamento, paciente, setor, NF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
          </div>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(typeConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  <span className="flex items-center gap-2"><v.icon className="h-3.5 w-3.5" /> {v.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-[140px] bg-card text-xs" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-[140px] bg-card text-xs" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={resetFilters}>
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{totalCount} registro(s)</p>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchData}><RefreshCw className="h-3.5 w-3.5 text-muted-foreground" /></Button>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : (
          <>
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Data/Hora</TableHead>
                    <TableHead className="text-xs font-semibold">Tipo</TableHead>
                    <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
                    <TableHead className="text-xs font-semibold">Paciente</TableHead>
                    <TableHead className="text-xs font-semibold">Setor</TableHead>
                    <TableHead className="text-xs font-semibold">NF</TableHead>
                    <TableHead className="text-xs font-semibold">Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16">
                        <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm font-medium text-muted-foreground">Nenhuma movimentação encontrada</p>
                        <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros ou período</p>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(m => {
                    const cfg = typeConfig[m.tipo] || typeConfig.entrada;
                    const isEntry = m.tipo === "entrada";
                    return (
                      <TableRow key={m.id} className="hover:bg-accent/30">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[11px] gap-1", cfg.className)}>
                            <cfg.icon className="h-3 w-3" />{cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{m.medicamentos?.nome || "—"}</span>
                          {m.medicamentos?.concentracao && <span className="text-muted-foreground text-xs ml-1">{m.medicamentos.concentracao}</span>}
                        </TableCell>
                        <TableCell className={cn("text-center font-semibold", cfg.qtyClass)}>
                          {isEntry ? "+" : "-"}{m.quantidade}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.paciente || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.setor || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{m.nota_fiscal || "—"}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger className="text-xs text-muted-foreground max-w-[150px] truncate block">
                              {m.observacao || "—"}
                            </TooltipTrigger>
                            {m.observacao && <TooltipContent className="text-xs max-w-[300px]">{m.observacao}</TooltipContent>}
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i;
                    else if (page <= 2) pageNum = i;
                    else if (page >= totalPages - 3) pageNum = totalPages - 5 + i;
                    else pageNum = page - 2 + i;
                    return (
                      <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setPage(pageNum)}>
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
          </>
        )}
      </TooltipProvider>
    </AppLayout>
  );
};

export default Movimentacoes;
