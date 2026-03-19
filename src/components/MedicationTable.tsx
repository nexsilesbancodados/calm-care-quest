import { motion } from "framer-motion";
import { Search, Filter, Plus } from "lucide-react";
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

export function MedicationTable({
  medications, searchQuery, onSearchChange,
  categoryFilter, onCategoryChange,
  stockFilter, onStockFilterChange,
  onAdd, onEdit,
}: MedicationTableProps) {
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
          <Input
            placeholder="Buscar por nome, genérico ou lote..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={(v) => onCategoryChange(v as MedicationCategory | "all")}>
            <SelectTrigger className="w-[180px] bg-card">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={(v) => onStockFilterChange(v as any)}>
            <SelectTrigger className="w-[150px] bg-card">
              <SelectValue placeholder="Estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo estoque</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="baixo">Baixo</SelectItem>
              <SelectItem value="crítico">Crítico</SelectItem>
              <SelectItem value="esgotado">Esgotado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onAdd} className="gradient-primary text-primary-foreground gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Medicamento</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Categoria</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Forma/Dosagem</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Lote</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-center">Estoque</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Local</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Validade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Nenhum medicamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              medications.map((med, i) => {
                const status = getStockStatus(med.currentStock, med.minimumStock);
                const statusConfig = getStockStatusConfig(status);
                const cat = CATEGORIES.find((c) => c.value === med.category);
                const isExpiringSoon = (() => {
                  const diff = (new Date(med.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                  return diff <= 60 && diff > 0;
                })();
                const isExpired = new Date(med.expirationDate) < new Date();

                return (
                  <TableRow
                    key={med.id}
                    className="cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => onEdit(med)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-foreground">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.genericName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[11px] font-medium", cat?.color)}>
                        {cat?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {med.form} • {med.dosage}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{med.batchNumber}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-semibold text-foreground">{med.currentStock}</span>
                      <span className="text-xs text-muted-foreground">/{med.minimumStock}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[11px] font-medium", statusConfig.className)}>
                        {statusConfig.label}
                      </Badge>
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
      </div>
    </motion.div>
  );
}
