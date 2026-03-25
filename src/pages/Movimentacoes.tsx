import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowDownCircle, ArrowUpCircle, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { Movimentacao, TipoMovimentacao } from "@/types/database";

const typeConfig: Record<string, { label: string; icon: any; className: string }> = {
  entrada: { label: "Entrada", icon: ArrowDownCircle, className: "bg-success/10 text-success border-success/20" },
  saida: { label: "Saída", icon: ArrowUpCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  dispensacao: { label: "Dispensação", icon: Repeat, className: "bg-info/10 text-info border-info/20" },
  ajuste: { label: "Ajuste", icon: ArrowDownCircle, className: "bg-warning/10 text-warning border-warning/20" },
  transferencia: { label: "Transferência", icon: Repeat, className: "bg-primary/10 text-primary border-primary/20" },
};

const Movimentacoes = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    supabase.from("movimentacoes").select("*, medicamentos(nome, concentracao)").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { setMovements(data || []); setLoading(false); });
  }, []);

  const filtered = movements.filter(m => {
    const matchSearch = !search || (m.medicamentos?.nome || "").toLowerCase().includes(search.toLowerCase()) || (m.paciente || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || m.tipo === typeFilter;
    return matchSearch && matchType;
  });

  if (loading) return <AppLayout title="Movimentações"><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div></AppLayout>;

  return (
    <AppLayout title="Movimentações" subtitle={`${movements.length} registros`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Data</TableHead>
              <TableHead className="text-xs font-semibold">Tipo</TableHead>
              <TableHead className="text-xs font-semibold">Medicamento</TableHead>
              <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
              <TableHead className="text-xs font-semibold">Paciente/Setor</TableHead>
              <TableHead className="text-xs font-semibold">Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma movimentação</TableCell></TableRow>
            ) : filtered.map(m => {
              const cfg = typeConfig[m.tipo] || typeConfig.entrada;
              return (
                <TableRow key={m.id}>
                  <TableCell className="text-sm text-muted-foreground">{new Date(m.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[11px] gap-1", cfg.className)}><cfg.icon className="h-3 w-3" />{cfg.label}</Badge></TableCell>
                  <TableCell className="font-medium text-sm">{m.medicamentos?.nome || "—"} {m.medicamentos?.concentracao || ""}</TableCell>
                  <TableCell className="text-center font-semibold">{m.quantidade}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.paciente || m.setor || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.observacao || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>
    </AppLayout>
  );
};

export default Movimentacoes;
