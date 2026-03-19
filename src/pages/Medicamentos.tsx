import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MedicationTable } from "@/components/MedicationTable";
import { MedicationDialog } from "@/components/MedicationDialog";
import { MedicationDetail } from "@/components/MedicationDetail";
import { useMedications } from "@/hooks/useMedications";
import type { Medication } from "@/types/medication";

const Medicamentos = () => {
  const {
    medications, stats,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    stockFilter, setStockFilter,
    addMedication, updateMedication, deleteMedication,
  } = useMedications();

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
    <AppLayout title="Medicamentos" subtitle={`${medications.length} medicamentos cadastrados`}>
      <MedicationTable
        medications={medications}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        onAdd={handleAdd}
        onEdit={handleRowClick}
      />

      <MedicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        medication={editingMed}
        onSave={handleSave}
        onDelete={deleteMedication}
      />

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
