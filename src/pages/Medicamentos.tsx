import { useState, useMemo, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MedicationTable } from "@/components/MedicationTable";
import { MedicationDialog } from "@/components/MedicationDialog";
import { MedicationDetail } from "@/components/MedicationDetail";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { getStockStatus, type MedicationCategory, type Medication } from "@/types/medication";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Medicamentos = () => {
  const { medications, addMedication, updateMedication, deleteMedication } = useMedicationContext();
  const { user } = useAuth();
  const { log } = useAudit();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MedicationCategory | "all">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "normal" | "baixo" | "crítico" | "esgotado">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [detailMed, setDetailMed] = useState<Medication | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvResults, setCsvResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return medications.filter((med) => {
      const matchesSearch = !searchQuery || med.name.toLowerCase().includes(searchQuery.toLowerCase()) || med.genericName.toLowerCase().includes(searchQuery.toLowerCase()) || med.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || med.category === categoryFilter;
      const matchesStock = stockFilter === "all" || getStockStatus(med.currentStock, med.minimumStock) === stockFilter;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [medications, searchQuery, categoryFilter, stockFilter]);

  const handleAdd = () => { setEditingMed(null); setDialogOpen(true); };
  const handleRowClick = (med: Medication) => { setDetailMed(med); };
  const handleEditFromDetail = (med: Medication) => { setDetailMed(null); setEditingMed(med); setDialogOpen(true); };
  const handleSave = (data: Omit<Medication, "id" | "lastUpdated">) => {
    if (editingMed) updateMedication(editingMed.id, data);
    else addMedication(data);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { toast.error("Arquivo CSV vazio ou sem dados"); return; }

      const header = lines[0].split(/[;,]/).map((h) => h.trim().toLowerCase());
      const nameIdx = header.findIndex((h) => h.includes("nome") || h === "name");
      const genericIdx = header.findIndex((h) => h.includes("genérico") || h.includes("generico") || h === "genericname");
      const categoryIdx = header.findIndex((h) => h.includes("categoria") || h === "category");
      const dosageIdx = header.findIndex((h) => h.includes("dosagem") || h === "dosage");
      const formIdx = header.findIndex((h) => h.includes("forma") || h === "form");
      const manufacturerIdx = header.findIndex((h) => h.includes("fabricante") || h === "manufacturer");
      const batchIdx = header.findIndex((h) => h.includes("lote") || h === "batch");
      const expiryIdx = header.findIndex((h) => h.includes("validade") || h.includes("expir"));
      const stockIdx = header.findIndex((h) => h.includes("estoque") || h === "stock" || h === "currentstock");
      const minStockIdx = header.findIndex((h) => h.includes("mínimo") || h.includes("minimo") || h === "minimumstock");
      const locationIdx = header.findIndex((h) => h.includes("local") || h === "location");
      const controlledIdx = header.findIndex((h) => h.includes("controlad") || h === "controlled");

      if (nameIdx === -1) { toast.error("Coluna 'Nome' não encontrada no CSV"); return; }

      let success = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[;,]/).map((c) => c.trim());
        const name = cols[nameIdx];
        if (!name) { errors.push(`Linha ${i + 1}: nome vazio`); continue; }

        try {
          addMedication({
            name,
            genericName: cols[genericIdx] || name,
            category: (cols[categoryIdx] || "outro") as MedicationCategory,
            dosage: cols[dosageIdx] || "—",
            form: cols[formIdx] || "Comprimido",
            manufacturer: cols[manufacturerIdx] || "—",
            batchNumber: cols[batchIdx] || `IMP-${String(i).padStart(4, "0")}`,
            expirationDate: cols[expiryIdx] || "2027-12-31",
            currentStock: Number(cols[stockIdx]) || 0,
            minimumStock: Number(cols[minStockIdx]) || 50,
            location: cols[locationIdx] || "A-01",
            controlledSubstance: cols[controlledIdx]?.toLowerCase() === "sim" || cols[controlledIdx]?.toLowerCase() === "true",
            notes: "Importado via CSV",
          });
          success++;
        } catch {
          errors.push(`Linha ${i + 1}: erro ao processar ${name}`);
        }
      }

      log({ userId: user?.id || "", userName: user?.name || "", action: "Importação CSV", module: "Medicamentos", details: `${success} medicamentos importados, ${errors.length} erros`, severity: errors.length > 0 ? "warning" : "info" });
      setCsvResults({ success, errors });
      toast.success(`${success} medicamentos importados!`);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const csv = "Nome;Genérico;Categoria;Dosagem;Forma;Fabricante;Lote;Validade;Estoque;Mínimo;Local;Controlado\nExemplo Med;Exemplo Genérico;antidepressivo;50mg;Comprimido;Lab Exemplo;LOT-001;2027-06-30;200;50;A-01;Não";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template-importacao-medicamentos.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="Medicamentos" subtitle={`${filtered.length} medicamentos cadastrados`}>
      {/* CSV Import Button */}
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={() => setCsvDialogOpen(true)} className="gap-2 text-xs">
          <Upload className="h-3.5 w-3.5" /> Importar CSV
        </Button>
      </div>

      <MedicationTable
        medications={filtered}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        onAdd={handleAdd}
        onEdit={handleRowClick}
      />

      <MedicationDialog open={dialogOpen} onOpenChange={setDialogOpen} medication={editingMed} onSave={handleSave} onDelete={deleteMedication} />

      <MedicationDetail
        medication={detailMed}
        open={!!detailMed}
        onOpenChange={(open) => { if (!open) setDetailMed(null); }}
        onEdit={handleEditFromDetail}
        onDelete={(id) => { deleteMedication(id); setDetailMed(null); }}
      />

      {/* CSV Import Dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={(open) => { setCsvDialogOpen(open); if (!open) setCsvResults(null); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Importação via CSV</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Importe medicamentos em massa a partir de um arquivo CSV. O arquivo deve conter as colunas: <strong>Nome</strong>, Genérico, Categoria, Dosagem, Forma, Fabricante, Lote, Validade, Estoque, Mínimo, Local, Controlado.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> Baixar Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Clique para selecionar o arquivo CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Separador: vírgula (,) ou ponto e vírgula (;)</p>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVImport} />
            </div>

            {csvResults && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="font-medium">{csvResults.success} medicamentos importados com sucesso</span>
                </div>
                {csvResults.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">{csvResults.errors.length} erros:</span>
                    </div>
                    <div className="max-h-[100px] overflow-y-auto text-xs text-muted-foreground space-y-0.5">
                      {csvResults.errors.map((err, i) => <p key={i}>{err}</p>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Medicamentos;
