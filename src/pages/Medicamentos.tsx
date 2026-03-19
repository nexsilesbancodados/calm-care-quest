import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MedicationTable } from "@/components/MedicationTable";
import { MedicationDialog } from "@/components/MedicationDialog";
import { MedicationDetail } from "@/components/MedicationDetail";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { getStockStatus, type MedicationCategory } from "@/types/medication";
import type { Medication } from "@/types/medication";

const Medicamentos = () => {
  const { medications, addMedication, updateMedication, deleteMedication } = useMedicationContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MedicationCategory | "all">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "normal" | "baixo" | "crítico" | "esgotado">("all");

  const filtered = useMemo(() => {
    return medications.filter((med) => {
      const matchesSearch = !searchQuery || med.name.toLowerCase().includes(searchQuery.toLowerCase()) || med.genericName.toLowerCase().includes(searchQuery.toLowerCase()) || med.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || med.category === categoryFilter;
      const matchesStock = stockFilter === "all" || getStockStatus(med.currentStock, med.minimumStock) === stockFilter;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [medications, searchQuery, categoryFilter, stockFilter]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [detailMed, setDetailMed] = useState<Medication | null>(null);

  const handleAdd = () => { setEditingMed(null); setDialogOpen(true); };
  const handleRowClick = (med: Medication) => { setDetailMed(med); };
  const handleEditFromDetail = (med: Medication) => { setDetailMed(null); setEditingMed(med); setDialogOpen(true); };
  const handleSave = (data: Omit<Medication, "id" | "lastUpdated">) => {
    if (editingMed) updateMedication(editingMed.id, data);
    else addMedication(data);
  };

  return (
    <AppLayout title="Medicamentos" subtitle={`${filtered.length} medicamentos cadastrados`}>
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
    </AppLayout>
  );
};

export default Medicamentos;
