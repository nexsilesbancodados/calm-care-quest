import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { MedicationTable } from "@/components/MedicationTable";
import { MedicationDialog } from "@/components/MedicationDialog";
import { useMedications } from "@/hooks/useMedications";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Pill, AlertTriangle, XCircle, Clock, Package, ShieldCheck,
  ArrowDownCircle, ArrowUpCircle, Repeat, UserCheck, Truck, FileCheck,
} from "lucide-react";
import type { Medication } from "@/types/medication";

const recentActivity = [
  { id: 1, type: "dispensação", icon: Repeat, text: "Risperidona 2mg dispensada para Paciente #1042", time: "Há 12 min", user: "Enf. Maria Silva", className: "bg-info/10 text-info" },
  { id: 2, type: "entrada", icon: ArrowDownCircle, text: "Entrada de 100 un. Haloperidol 5mg/ml — NF 45892", time: "Há 45 min", user: "Farm. João Santos", className: "bg-success/10 text-success" },
  { id: 3, type: "alerta", icon: AlertTriangle, text: "Clorpromazina 25mg/5ml — validade em 27 dias", time: "Há 1h", user: "Sistema", className: "bg-warning/10 text-warning" },
  { id: 4, type: "transferência", icon: Truck, text: "40 un. Zolpidem transferidas para Farmácia Central", time: "Há 2h", user: "Farm. Pedro Lima", className: "bg-primary/10 text-primary" },
  { id: 5, type: "dispensação", icon: Repeat, text: "Clonazepam 2mg — uso SOS Paciente #0987", time: "Há 3h", user: "Enf. Ana Costa", className: "bg-info/10 text-info" },
  { id: 6, type: "auditoria", icon: FileCheck, text: "Conferência dupla aprovada — Diazepam 10mg", time: "Há 4h", user: "Farm. Carlos Mendes", className: "bg-accent text-accent-foreground" },
  { id: 7, type: "entrada", icon: ArrowDownCircle, text: "Entrada de 500 un. Fluoxetina 20mg — NF 45670", time: "Há 5h", user: "Farm. João Santos", className: "bg-success/10 text-success" },
  { id: 8, type: "paciente", icon: UserCheck, text: "Prescrição atualizada — Paciente #0856 (Lítio)", time: "Há 6h", user: "Dr. Ana Beatriz", className: "bg-muted text-muted-foreground" },
];

const quickAlerts = [
  { label: "Zolpidem 10mg", detail: "Esgotado — aguardando reposição", severity: "critical" as const },
  { label: "Clorpromazina 25mg", detail: "Vence em 27 dias", severity: "warning" as const },
  { label: "Clonazepam 2mg", detail: "Estoque crítico: 15/80 un.", severity: "critical" as const },
  { label: "Diazepam 10mg", detail: "Estoque baixo: 45/60 un.", severity: "warning" as const },
];

const severityConfig = {
  warning: "border-warning/30 bg-warning/5",
  critical: "border-destructive/30 bg-destructive/5",
};

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard title="Total" value={stats.total} icon={Pill} variant="info" delay={0} />
        <StatCard title="Controlados" value={stats.controlled} icon={ShieldCheck} variant="default" delay={0.05} />
        <StatCard title="Estoque Baixo" value={stats.lowStock} icon={Package} variant="warning" delay={0.1} />
        <StatCard title="Crítico" value={stats.critical} icon={AlertTriangle} variant="critical" delay={0.15} />
        <StatCard title="Esgotados" value={stats.outOfStock} icon={XCircle} variant="critical" delay={0.2} />
        <StatCard title="Vence em 60d" value={stats.expiringSoon} icon={Clock} variant="warning" delay={0.25} />
      </div>

      {/* Activity + Alerts Row */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="p-4 sm:p-5 shadow-card h-full">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Atividade Recente
            </h3>
            <div className="space-y-1">
              {recentActivity.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.04 }}
                  className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-accent/30 transition-colors group"
                >
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md mt-0.5", item.className)}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{item.text}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{item.user}</span>
                      <span className="text-[11px] text-muted-foreground/50">•</span>
                      <span className="text-[11px] text-muted-foreground/70">{item.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Quick Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="p-4 sm:p-5 shadow-card h-full">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertas Urgentes
            </h3>
            <div className="space-y-3">
              {quickAlerts.map((alert, i) => (
                <motion.div
                  key={alert.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className={cn("rounded-lg border p-3", severityConfig[alert.severity])}
                >
                  <p className="text-sm font-medium text-foreground">{alert.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t">
              <a href="/alertas" className="text-xs text-primary hover:underline font-medium">
                Ver todos os alertas →
              </a>
            </div>
          </Card>
        </motion.div>
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
