import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowDownCircle, ArrowUpCircle, Repeat, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const typeConfig: Record<string, { label: string; icon: any; className: string }> = {
  entrada: { label: "Entrada", icon: ArrowDownCircle, className: "bg-success/10 text-success border-success/20" },
  saida: { label: "Saída", icon: ArrowUpCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  dispensacao: { label: "Dispensação", icon: Repeat, className: "bg-info/10 text-info border-info/20" },
  ajuste: { label: "Ajuste", icon: ArrowDownCircle, className: "bg-warning/10 text-warning border-warning/20" },
  transferencia: { label: "Transferência", icon: Repeat, className: "bg-primary/10 text-primary border-primary/20" },
};

const PAGE_SIZE = 50;

const Movimentacoes = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let query = supabase.from("movimentacoes").select("*, medicamentos(nome, concentracao)").order("created_at", { ascending: false });
      if (typeFilter !== "all") query = query.eq("tipo", typeFilter);
      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data } = await query;
      setMovements(data || []);
      setLoading(false);
    };
    fetchData();
  }, [typeFilter, dateFrom, dateTo, page]);

  const filtered = movements.filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (m.medicamentos?.nome || "").toLowerCase().includes(s) || (m.paciente || "").toLowerCase().includes(s) || (m.setor || "").toLowerCase().includes(s) || (m.nota_fiscal || "").toLowerCase().includes(s);
  });

  const resetFilters = () => { setSearch(""); setTypeFilter("all"); setDateFrom(""); setDateTo(""); setPage(0); };

  return (
    <AppLayout title="Movimentações" subtitle="Histórico completo de entradas e saídas">
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar medicamento, paciente, setor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-[140px] bg-card text-xs" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-[140px] bg-card text-xs" />
        </div>
        {(search || typeFilter !== "all" || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={resetFilters}>Limpar filtros</Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
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
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma movimentação encontrada</TableCell></TableRow>
                ) : filtered.map(m => {
                  const cfg = typeConfig[m.tipo] || typeConfig.entrada;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-[11px] gap-1", cfg.className)}><cfg.icon className="h-3 w-3" />{cfg.label}</Badge></TableCell>
                      <TableCell className="font-medium text-sm">{m.medicamentos?.nome || "—"} <span className="text-muted-foreground text-xs">{m.medicamentos?.concentracao || ""}</span></TableCell>
                      <TableCell className="text-center font-semibold">{m.quantidade}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.paciente || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.setor || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{m.nota_fiscal || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.observacao || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </motion.div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Página {page + 1} • {filtered.length} registros nesta página</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="gap-1"><ChevronLeft className="h-4 w-4" />Anterior</Button>
              <Button variant="outline" size="sm" disabled={movements.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="gap-1">Próxima<ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default Movimentacoes;
