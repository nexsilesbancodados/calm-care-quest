import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { MedicationTable } from "@/components/MedicationTable";
import { MedicationDialog } from "@/components/MedicationDialog";
import { useMedications } from "@/hooks/useMedications";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Pill, AlertTriangle, XCircle, Clock, Package, ShieldCheck,
  ArrowDownCircle, ArrowUpCircle, Repeat, UserCheck, Truck, FileCheck,
  Plus, Barcode, ArrowLeftRight, ClipboardList, BarChart3, CalendarClock,
} from "lucide-react";
import type { Medication } from "@/types/medication";

const recentActivity = [
  { id: 1, type: "dispensação", icon: Repeat, text: "Risperidona 2mg dispensada para Paciente #1042", time: "Há 12 min", user: "Enf. Maria Silva", className: "bg-info/10 text-info" },
  { id: 2, type: "entrada", icon: ArrowDownCircle, text: "Entrada de 100 un. Haloperidol 5mg/ml — NF 45892", time: "Há 45 min", user: "Farm. João Santos", className: "bg-success/10 text-success" },
  { id: 3, type: "alerta", icon: AlertTriangle, text: "Clorpromazina 25mg/5ml — validade em 27 dias", time: "Há 1h", user: "Sistema", className: "bg-warning/10 text-warning" },
  { id: 4, type: "transferência", icon: Truck, text: "40 un. Zolpidem transferidas para Farmácia Central", time: "Há 2h", user: "Farm. Pedro Lima", className: "bg-primary/10 text-primary" },
  { id: 5, type: "dispensação", icon: Repeat, text: "Clonazepam 2mg — uso SOS Paciente #0987", time: "Há 3h", user: "Enf. Ana Costa", className: "bg-info/10 text-info" },
  { id: 6, type: "auditoria", icon: FileCheck, text: "Conferência dupla aprovada — Diazepam 10mg", time: "Há 4h", user: "Farm. Carlos Mendes", className: "bg-accent text-accent-foreground" },
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

// Simulated 7-day data
const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const weeklyFlow = weekDays.map((d, i) => ({
  day: d,
  entradas: Math.round(60 + Math.random() * 80 + (i < 5 ? 40 : 0)),
  dispensações: Math.round(40 + Math.random() * 60 + (i < 5 ? 30 : 0)),
  saídas: Math.round(10 + Math.random() * 30),
}));

const topDispensed = [
  { name: "Risperidona", qty: 48 },
  { name: "Clonazepam", qty: 42 },
  { name: "Fluoxetina", qty: 38 },
  { name: "Sertralina", qty: 31 },
  { name: "Haloperidol", qty: 27 },
];

const quickActions = [
  { label: "Nova Movimentação", icon: ClipboardList, path: "/movimentacoes", color: "bg-info/10 text-info" },
  { label: "Gerar Etiquetas", icon: Barcode, path: "/etiquetas", color: "bg-primary/10 text-primary" },
  { label: "Nova Transferência", icon: ArrowLeftRight, path: "/transferencias", color: "bg-success/10 text-success" },
  { label: "Ver Relatórios", icon: BarChart3, path: "/relatorios", color: "bg-warning/10 text-warning" },
];

const Dashboard = () => {
  const {
    medications, stats,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    stockFilter, setStockFilter,
    addMedication, updateMedication, deleteMedication,
  } = useMedications();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total" value={stats.total} icon={Pill} variant="info" delay={0} />
        <StatCard title="Controlados" value={stats.controlled} icon={ShieldCheck} variant="default" delay={0.05} />
        <StatCard title="Estoque Baixo" value={stats.lowStock} icon={Package} variant="warning" delay={0.1} />
        <StatCard title="Crítico" value={stats.critical} icon={AlertTriangle} variant="critical" delay={0.15} />
        <StatCard title="Esgotados" value={stats.outOfStock} icon={XCircle} variant="critical" delay={0.2} />
        <StatCard title="Vence em 60d" value={stats.expiringSoon} icon={Clock} variant="warning" delay={0.25} />
      </div>

      {/* Charts + Quick Actions Row */}
      <div className="grid lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {/* Weekly Flow Chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="lg:col-span-2">
          <Card className="p-4 sm:p-5 shadow-card h-full">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Fluxo dos Últimos 7 Dias
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weeklyFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={30} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="entradas" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="Entradas" />
                <Area type="monotone" dataKey="dispensações" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} name="Dispensações" />
                <Area type="monotone" dataKey="saídas" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={1.5} name="Saídas" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Top Dispensed */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <Card className="p-4 sm:p-5 shadow-card h-full">
            <h3 className="text-sm font-semibold mb-3">Top Dispensados (7d)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topDispensed} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`${v} un.`]} />
                <Bar dataKey="qty" fill="hsl(174, 62%, 38%)" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Quick Actions + Clock */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
          <Card className="p-4 sm:p-5 shadow-card h-full flex flex-col">
            {/* Clock */}
            <div className="text-center mb-4 pb-3 border-b">
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 flex-1">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 hover:shadow-card-hover transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", action.color)}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Activity + Alerts Row */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
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
                  transition={{ delay: 0.45 + i * 0.04 }}
                  className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-accent/30 transition-colors"
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
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
                  transition={{ delay: 0.5 + i * 0.06 }}
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
