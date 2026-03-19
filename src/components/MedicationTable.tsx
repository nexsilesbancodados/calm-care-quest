import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Plus, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORIES, getStockStatus, getStockStatusConfig, type MedicationCategory } from "@/types/medication";
import type { Medication } from "@/types/medication";
import { cn } from "@/lib/utils";

interface MedicationTableProps {
  medications: Medication[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categoryFilter: MedicationCategory | "all";
  onCategoryChange: (c: MedicationCategory | "all") => void;
  stockFilter: string;
  onStockFilterChange: (s: "all" | "normal" | "baixo" | "crítico" | "esgotado") => void;
  onAdd: () => void;
  onEdit: (med: Medication) => void;
}

type SortKey = "name" | "currentStock" | "expirationDate" | "category";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

export function MedicationTable({
  medications, searchQuery, onSearchChange,
  categoryFilter, onCategoryChange,
  stockFilter, onStockFilterChange,
  onAdd, onEdit,
}: MedicationTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    const arr = [...medications];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "currentStock": cmp = a.currentStock - b.currentStock; break;
        case "expirationDate": cmp = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime(); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  }, [medications, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <TableHead
      className="font-semibold text-xs uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => handleSort(sortKeyName)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sortKey === sortKeyName ? "text-primary" : "text-muted-foreground/40")} />
      </span>
    </TableHead>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="space-y-4"
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, genérico ou lote..." value={searchQuery} onChange={(e) => { onSearchChange(e.target.value); setPage(1); }} className="pl-9 bg-card" />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={(v) => { onCategoryChange(v as MedicationCategory | "all"); setPage(1); }}>
            <SelectTrigger className="w-[180px] bg-card">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={(v) => { onStockFilterChange(v as any); setPage(1); }}>
            <SelectTrigger className="w-[150px] bg-card"><SelectValue placeholder="Estoque" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo estoque</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="baixo">Baixo</SelectItem>
              <SelectItem value="crítico">Crítico</SelectItem>
              <SelectItem value="esgotado">Esgotado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onAdd} className="gradient-primary text-primary-foreground gap-2 shadow-sm">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <SortHeader label="Medicamento" sortKeyName="name" />
              <SortHeader label="Categoria" sortKeyName="category" />
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Forma/Dosagem</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Lote</TableHead>
              <SortHeader label="Estoque" sortKeyName="currentStock" />
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Local</TableHead>
              <SortHeader label="Validade" sortKeyName="expirationDate" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum medicamento encontrado</TableCell>
              </TableRow>
            ) : (
              paginated.map((med) => {
                const status = getStockStatus(med.currentStock, med.minimumStock);
                const statusConfig = getStockStatusConfig(status);
                const cat = CATEGORIES.find((c) => c.value === med.category);
                const isExpiringSoon = (() => {
                  const diff = (new Date(med.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                  return diff <= 60 && diff > 0;
                })();
                const isExpired = new Date(med.expirationDate) < new Date();

                return (
                  <TableRow key={med.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => onEdit(med)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-foreground">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.genericName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[11px] font-medium", cat?.color)}>{cat?.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{med.form} • {med.dosage}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{med.batchNumber}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-semibold text-foreground">{med.currentStock}</span>
                      <span className="text-xs text-muted-foreground">/{med.minimumStock}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[11px] font-medium", statusConfig.className)}>{statusConfig.label}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{med.location}</TableCell>
                    <TableCell>
                      <span className={cn("text-xs", isExpired ? "text-destructive font-semibold" : isExpiringSoon ? "text-warning font-medium" : "text-muted-foreground")}>
                        {new Date(med.expirationDate).toLocaleDateString("pt-BR")}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, sorted.length)} de {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-muted-foreground px-1">…</span>}
                    <Button variant={p === page ? "default" : "ghost"} size="icon" className="h-7 w-7 text-xs" onClick={() => setPage(p)}>
                      {p}
                    </Button>
                  </span>
                ))}
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
