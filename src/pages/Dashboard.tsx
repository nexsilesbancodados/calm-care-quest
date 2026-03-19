import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { MedicationTable } from "@/components/MedicationTable";
import { MedicationDialog } from "@/components/MedicationDialog";
import { useMedications } from "@/hooks/useMedications";
import { Pill, AlertTriangle, XCircle, Clock, Package, ShieldCheck } from "lucide-react";
import type { Medication } from "@/types/medication";

const Dashboard = () => {
  const {
    medications, stats,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    stockFilter, setStockFilter,
    addMedication, updateMedication, deleteMedication,
  } = useMedications();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  const handleAdd = () => { setEditingMed(null); setDialogOpen(true); };
  const handleEdit = (med: Medication) => { setEditingMed(med); setDialogOpen(true); };
  const handleSave = (data: Omit<Medication, "id" | "lastUpdated">) => {
    if (editingMed) {
      updateMedication(editingMed.id, data);
    } else {
      addMedication(data);
    }
  };

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da farmácia hospitalar">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total" value={stats.total} icon={Pill} variant="info" delay={0} />
        <StatCard title="Controlados" value={stats.controlled} icon={ShieldCheck} variant="default" delay={0.05} />
        <StatCard title="Estoque Baixo" value={stats.lowStock} icon={Package} variant="warning" delay={0.1} />
        <StatCard title="Crítico" value={stats.critical} icon={AlertTriangle} variant="critical" delay={0.15} />
        <StatCard title="Esgotados" value={stats.outOfStock} icon={XCircle} variant="critical" delay={0.2} />
        <StatCard title="Vence em 60d" value={stats.expiringSoon} icon={Clock} variant="warning" delay={0.25} />
      </div>

      {/* Medication Table */}
      <MedicationTable
        medications={medications}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        onAdd={handleAdd}
        onEdit={handleEdit}
      />

      {/* Dialog */}
      <MedicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        medication={editingMed}
        onSave={handleSave}
        onDelete={deleteMedication}
      />
    </AppLayout>
  );
};

export default Dashboard;
