import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, ArrowDownCircle, ArrowUpCircle, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MovementType = "entrada" | "saída" | "dispensação";

interface Movement {
  id: string;
  medicationId: string;
  medicationName: string;
  type: MovementType;
  quantity: number;
  date: string;
  responsiblePerson: string;
  patient?: string;
  ward?: string;
  notes: string;
}

const typeConfig: Record<MovementType, { label: string; icon: any; className: string }> = {
  entrada: { label: "Entrada", icon: ArrowDownCircle, className: "bg-success/10 text-success border-success/20" },
  saída: { label: "Saída", icon: ArrowUpCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  dispensação: { label: "Dispensação", icon: Repeat, className: "bg-info/10 text-info border-info/20" },
};


const Movimentacoes = () => {
  const { medications, adjustStock, getMedicationById } = useMedicationContext();
  const { user } = useAuth();
  const { log } = useAudit();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchMovements = useCallback(async () => {
    const { data } = await (await import("@/integrations/supabase/client")).supabase
      .from("movements").select("*").order("created_at", { ascending: false });
    if (data) {
      setMovements(data.map((r: any) => ({
        id: r.id,
        medicationId: r.medication_id || "",
        medicationName: r.medication_name,
        type: r.type as MovementType,
        quantity: r.quantity,
        date: r.created_at?.split("T")[0] || "",
        responsiblePerson: r.responsible_person,
        patient: r.patient,
        ward: r.ward,
        notes: r.notes,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  const [newMov, setNewMov] = useState({
    medicationId: "", type: "entrada" as MovementType,
    quantity: 0, responsiblePerson: "", patient: "", ward: "", notes: "", date: new Date().toISOString().split("T")[0],
  });

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const matchesSearch = !search || m.medicationName.toLowerCase().includes(search.toLowerCase()) || m.responsiblePerson.toLowerCase().includes(search.toLowerCase()) || (m.patient?.toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === "all" || m.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [movements, search, typeFilter]);

  const selectedMed = newMov.medicationId ? getMedicationById(newMov.medicationId) : undefined;

  const handleAdd = async () => {
    if (!newMov.medicationId || !newMov.quantity) {
      toast.error("Selecione um medicamento e informe a quantidade");
      return;
    }

    const med = getMedicationById(newMov.medicationId);
    if (!med) return;

    // Validate stock for outgoing movements
    if (newMov.type !== "entrada" && med.currentStock < newMov.quantity) {
      toast.error(`Estoque insuficiente! Disponível: ${med.currentStock} un. de ${med.name}`);
      return;
    }

    const medLabel = `${med.name} ${med.dosage}`;
    const delta = newMov.type === "entrada" ? newMov.quantity : -newMov.quantity;

    // Update stock
    adjustStock(newMov.medicationId, delta);

    // Save movement to Supabase
    const { data: movData, error: movError } = await (await import("@/integrations/supabase/client")).supabase
      .from("movements").insert({
        medication_id: newMov.medicationId,
        medication_name: medLabel,
        type: newMov.type,
        quantity: newMov.quantity,
        responsible_person: newMov.responsiblePerson || user?.name || "—",
        patient: newMov.patient || null,
        ward: newMov.ward || null,
        notes: newMov.notes,
      }).select().single();

    if (movError) { toast.error("Erro ao registrar movimentação"); return; }

    const movement: Movement = {
      id: movData.id,
      medicationId: newMov.medicationId,
      medicationName: medLabel,
      type: newMov.type,
      quantity: newMov.quantity,
      date: movData.created_at?.split("T")[0] || newMov.date,
      responsiblePerson: newMov.responsiblePerson || user?.name || "—",
      patient: newMov.patient,
      ward: newMov.ward,
      notes: newMov.notes,
    };
    setMovements((prev) => [movement, ...prev]);

    // Audit log
    log({
      userId: user?.id || "",
      userName: user?.name || "",
      action: typeConfig[newMov.type].label,
      module: "Movimentações",
      details: `${newMov.quantity} un. ${medLabel} — ${newMov.notes || "sem observações"}`,
      severity: "info",
    });

    toast.success(`${typeConfig[newMov.type].label} registrada: ${newMov.quantity} un. de ${med.name}`);
    setDialogOpen(false);
    setNewMov({ medicationId: "", type: "entrada", quantity: 0, responsiblePerson: "", patient: "", ward: "", notes: "", date: new Date().toISOString().split("T")[0] });
  };

  const todayCount = movements.filter((m) => m.date === new Date().toISOString().split("T")[0]).length;

  return (
    <AppLayout title="Movimentações" subtitle={`${movements.length} registros • ${todayCount} hoje`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {(["entrada", "saída", "dispensação"] as MovementType[]).map((type, i) => {
          const config = typeConfig[type];
          const count = movements.filter((m) => m.type === type).length;
          const totalQty = movements.filter((m) => m.type === type).reduce((sum, m) => sum + m.quantity, 0);
          return (
            <motion.div key={type} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", config.className)}>
                  <config.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                  <p className="text-lg font-bold">{count} <span className="text-xs font-normal text-muted-foreground">({totalQty} un.)</span></p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por medicamento, responsável ou paciente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-[160px] bg-card"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saída">Saída</SelectItem>
              <SelectItem value="dispensação">Dispensação</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Registrar
          </Button>
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Data</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Tipo</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Medicamento</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-center">Qtd</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Responsável</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Paciente/Ala</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide">Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhuma movimentação encontrada</TableCell></TableRow>
            ) : filtered.map((mov) => {
              const config = typeConfig[mov.type];
              return (
                <TableRow key={mov.id} className="hover:bg-accent/30 transition-colors">
                  <TableCell className="text-sm text-muted-foreground">{new Date(mov.date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[11px] font-medium gap-1", config.className)}>
                      <config.icon className="h-3 w-3" /> {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{mov.medicationName}</TableCell>
                  <TableCell className="text-center font-semibold text-sm">{mov.quantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{mov.responsiblePerson}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {mov.patient && <span>{mov.patient}</span>}
                    {mov.ward && <span className="text-xs"> • {mov.ward}</span>}
                    {!mov.patient && !mov.ward && "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{mov.notes || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo</Label>
                <Select value={newMov.type} onValueChange={(v) => setNewMov({ ...newMov, type: v as MovementType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saída">Saída</SelectItem>
                    <SelectItem value="dispensação">Dispensação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Data</Label>
                <Input type="date" value={newMov.date} onChange={(e) => setNewMov({ ...newMov, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Medicamento</Label>
              <Select value={newMov.medicationId} onValueChange={(v) => setNewMov({ ...newMov, medicationId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar medicamento" /></SelectTrigger>
                <SelectContent>
                  {medications.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.dosage} — Estoque: {m.currentStock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMed && newMov.type !== "entrada" && (
                <p className="text-[11px] text-muted-foreground">
                  Disponível: <span className="font-semibold">{selectedMed.currentStock} un.</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Quantidade</Label>
                <Input type="number" min={1} value={newMov.quantity || ""} onChange={(e) => setNewMov({ ...newMov, quantity: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Responsável</Label>
                <Input value={newMov.responsiblePerson} onChange={(e) => setNewMov({ ...newMov, responsiblePerson: e.target.value })} placeholder={user?.name || "Nome"} />
              </div>
            </div>
            {(newMov.type === "dispensação" || newMov.type === "saída") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Paciente</Label>
                  <Input value={newMov.patient} onChange={(e) => setNewMov({ ...newMov, patient: e.target.value })} placeholder="ID ou nome" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Ala</Label>
                  <Input value={newMov.ward} onChange={(e) => setNewMov({ ...newMov, ward: e.target.value })} placeholder="Ala A, B, C..." />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea value={newMov.notes} onChange={(e) => setNewMov({ ...newMov, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAdd} className="gradient-primary text-primary-foreground">Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Movimentacoes;
