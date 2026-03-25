import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Users, User, FileText, Calendar, Pill,
  Activity, AlertCircle, Clock, Heart, Brain, UserPlus,
  Syringe, ClipboardCheck, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

type PatientStatus = "internado" | "ambulatorial" | "alta";

interface EvolutionEntry {
  id: string;
  date: string;
  type: "clinica" | "medicacao" | "intercorrencia" | "alta";
  description: string;
  author: string;
}

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  notes: string;
  active: boolean;
}

interface Patient {
  id: string;
  name: string;
  registrationNumber: string;
  dateOfBirth: string;
  gender: string;
  ward: string;
  bed?: string;
  diagnosis: string;
  status: PatientStatus;
  admissionDate: string;
  attendingDoctor: string;
  prescriptions: Prescription[];
  allergies: string;
  notes: string;
  evolution: EvolutionEntry[];
  dispensations: { date: string; medicationName: string; quantity: number }[];
}

const statusConfig: Record<PatientStatus, { label: string; className: string }> = {
  internado: { label: "Internado", className: "bg-info/10 text-info border-info/20" },
  ambulatorial: { label: "Ambulatorial", className: "bg-warning/10 text-warning border-warning/20" },
  alta: { label: "Alta", className: "bg-success/10 text-success border-success/20" },
};

const evolutionTypeConfig: Record<string, { label: string; className: string }> = {
  clinica: { label: "Avaliação Clínica", className: "bg-info/10 text-info" },
  medicacao: { label: "Alteração de Medicação", className: "bg-warning/10 text-warning" },
  intercorrencia: { label: "Intercorrência", className: "bg-destructive/10 text-destructive" },
  alta: { label: "Alta / Transferência", className: "bg-success/10 text-success" },
};

const Pacientes = () => {
  const { medications, adjustStock, getMedicationById } = useMedicationContext();
  const { user } = useAuth();
  const { log } = useAudit();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientStatus | "all">("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [rxDialogOpen, setRxDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [evoDialogOpen, setEvoDialogOpen] = useState(false);
  const [dispDialogOpen, setDispDialogOpen] = useState(false);

  const [newRx, setNewRx] = useState({ medicationName: "", dosage: "", frequency: "", prescribedBy: "", notes: "" });
  const [newPatient, setNewPatient] = useState({ name: "", dateOfBirth: "", gender: "Masculino", ward: "", bed: "", diagnosis: "", status: "internado" as PatientStatus, attendingDoctor: "", allergies: "", notes: "" });
  const [newEvo, setNewEvo] = useState({ type: "clinica" as EvolutionEntry["type"], description: "" });
  const [dispMedId, setDispMedId] = useState("");
  const [dispQty, setDispQty] = useState(0);

  const fetchPatients = useCallback(async () => {
    const { data: patientsData } = await supabase.from("patients").select("*").order("name");
    if (!patientsData) { setLoading(false); return; }

    const patientsList: Patient[] = [];
    for (const p of patientsData) {
      const { data: rxData } = await supabase.from("prescriptions").select("*").eq("patient_id", p.id);
      const { data: evoData } = await supabase.from("patient_evolution").select("*").eq("patient_id", p.id).order("created_at", { ascending: false });
      const { data: dispData } = await supabase.from("dispensations").select("*").eq("patient_id", p.id).order("dispensed_at", { ascending: false });

      patientsList.push({
        id: p.id,
        name: p.name,
        registrationNumber: p.registration_number,
        dateOfBirth: p.date_of_birth || "",
        gender: p.gender,
        ward: p.ward,
        bed: p.bed || undefined,
        diagnosis: p.diagnosis,
        status: p.status as PatientStatus,
        admissionDate: p.admission_date || "",
        attendingDoctor: p.attending_doctor,
        allergies: p.allergies,
        notes: p.notes,
        prescriptions: (rxData || []).map((r: any) => ({
          id: r.id, medicationName: r.medication_name, dosage: r.dosage,
          frequency: r.frequency, startDate: r.start_date, endDate: r.end_date || undefined,
          prescribedBy: r.prescribed_by, notes: r.notes, active: r.active,
        })),
        evolution: (evoData || []).map((e: any) => ({
          id: e.id, date: e.created_at, type: e.type, description: e.description, author: e.author,
        })),
        dispensations: (dispData || []).map((d: any) => ({
          date: d.dispensed_at?.split("T")[0] || "", medicationName: d.medication_name, quantity: d.quantity,
        })),
      });
    }
    setPatients(patientsList);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const filtered = useMemo(() =>
    patients.filter((p) => {
      const match = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.registrationNumber.includes(search) || p.diagnosis.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return match && matchStatus;
    }), [patients, search, statusFilter]);

  const stats = useMemo(() => ({
    total: patients.length,
    internados: patients.filter((p) => p.status === "internado").length,
    ambulatoriais: patients.filter((p) => p.status === "ambulatorial").length,
    totalRx: patients.reduce((s, p) => s + p.prescriptions.filter((r) => r.active).length, 0),
  }), [patients]);

  const handleAddPatient = () => {
    if (!newPatient.name || !newPatient.diagnosis) { toast.error("Preencha nome e diagnóstico"); return; }
    const p: Patient = {
      id: `P${String(patients.length + 1).padStart(3, "0")}`,
      ...newPatient,
      registrationNumber: `2026-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
      admissionDate: new Date().toISOString().split("T")[0],
      prescriptions: [],
      evolution: [],
      dispensations: [],
    };
    setPatients((prev) => [p, ...prev]);
    log({ userId: user?.id || "", userName: user?.name || "", action: "Cadastro de Paciente", module: "Pacientes", details: `${p.name} — ${p.diagnosis}`, severity: "info" });
    toast.success(`Paciente ${p.name} cadastrado!`);
    setPatientDialogOpen(false);
    setNewPatient({ name: "", dateOfBirth: "", gender: "Masculino", ward: "", bed: "", diagnosis: "", status: "internado", attendingDoctor: "", allergies: "", notes: "" });
  };

  const handleAddRx = () => {
    if (!selectedPatient || !newRx.medicationName) return;
    const rx: Prescription = {
      id: `RX${crypto.randomUUID().slice(0, 4)}`,
      ...newRx,
      startDate: new Date().toISOString().split("T")[0],
      active: true,
    };
    const update = (p: Patient) => p.id === selectedPatient.id ? { ...p, prescriptions: [rx, ...p.prescriptions] } : p;
    setPatients((prev) => prev.map(update));
    setSelectedPatient((prev) => prev ? update(prev) : prev);
    setRxDialogOpen(false);
    setNewRx({ medicationName: "", dosage: "", frequency: "", prescribedBy: "", notes: "" });
    toast.success("Prescrição adicionada!");
  };

  const toggleRxActive = (patientId: string, rxId: string) => {
    const update = (p: Patient) => p.id === patientId
      ? { ...p, prescriptions: p.prescriptions.map((r) => r.id === rxId ? { ...r, active: !r.active, endDate: r.active ? new Date().toISOString().split("T")[0] : undefined } : r) }
      : p;
    setPatients((prev) => prev.map(update));
    setSelectedPatient((prev) => prev && prev.id === patientId ? update(prev) : prev);
  };

  const handleAddEvolution = () => {
    if (!selectedPatient || !newEvo.description) { toast.error("Preencha a descrição"); return; }
    const entry: EvolutionEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: newEvo.type,
      description: newEvo.description,
      author: user?.name || "—",
    };
    const update = (p: Patient) => p.id === selectedPatient.id ? { ...p, evolution: [entry, ...p.evolution] } : p;
    setPatients((prev) => prev.map(update));
    setSelectedPatient((prev) => prev ? update(prev) : prev);
    log({ userId: user?.id || "", userName: user?.name || "", action: "Evolução Clínica", module: "Pacientes", details: `${selectedPatient.name} — ${evolutionTypeConfig[newEvo.type].label}`, severity: "info" });
    toast.success("Evolução registrada!");
    setEvoDialogOpen(false);
    setNewEvo({ type: "clinica", description: "" });
  };

  const handleDispense = () => {
    if (!selectedPatient || !dispMedId || dispQty <= 0) { toast.error("Selecione medicamento e quantidade"); return; }
    const med = getMedicationById(dispMedId);
    if (!med) return;
    if (med.currentStock < dispQty) { toast.error(`Estoque insuficiente! Disponível: ${med.currentStock} un.`); return; }

    adjustStock(dispMedId, -dispQty);
    const disp = { date: new Date().toISOString().split("T")[0], medicationName: `${med.name} ${med.dosage}`, quantity: dispQty };
    const update = (p: Patient) => p.id === selectedPatient.id ? { ...p, dispensations: [disp, ...p.dispensations] } : p;
    setPatients((prev) => prev.map(update));
    setSelectedPatient((prev) => prev ? update(prev) : prev);
    log({ userId: user?.id || "", userName: user?.name || "", action: "Dispensação p/ Paciente", module: "Pacientes", details: `${dispQty} un. ${med.name} → ${selectedPatient.name}`, severity: "info" });
    toast.success(`${dispQty} un. de ${med.name} dispensadas para ${selectedPatient.name}`);
    setDispDialogOpen(false);
    setDispMedId("");
    setDispQty(0);
  };

  const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  return (
    <AppLayout title="Pacientes & Prescrições" subtitle={`${stats.total} pacientes • ${stats.totalRx} prescrições ativas`}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, icon: Users, v: "default" },
          { label: "Internados", value: stats.internados, icon: Heart, v: "info" },
          { label: "Ambulatoriais", value: stats.ambulatoriais, icon: Activity, v: "warning" },
          { label: "Prescrições Ativas", value: stats.totalRx, icon: FileText, v: "success" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", {
                "bg-primary/10 text-primary": s.v === "default",
                "bg-info/10 text-info": s.v === "info",
                "bg-warning/10 text-warning": s.v === "warning",
                "bg-success/10 text-success": s.v === "success",
              })}><s.icon className="h-4 w-4" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar paciente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card text-sm" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[130px] bg-card text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="internado">Internados</SelectItem>
                <SelectItem value="ambulatorial">Ambulatorial</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setPatientDialogOpen(true)} className="w-full gradient-primary text-primary-foreground gap-2 text-sm">
            <UserPlus className="h-4 w-4" /> Novo Paciente
          </Button>

          <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Card
                  className={cn("p-3 cursor-pointer transition-all hover:shadow-card-hover", selectedPatient?.id === p.id ? "border-primary shadow-card ring-1 ring-primary/20" : "")}
                  onClick={() => setSelectedPatient(p)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold", p.status === "internado" ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {p.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Reg: {p.registrationNumber} • {p.dateOfBirth ? `${age(p.dateOfBirth)} anos` : "—"}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className={cn("text-[9px]", statusConfig[p.status].className)}>{statusConfig[p.status].label}</Badge>
                        {p.ward !== "—" && <span className="text-[10px] text-muted-foreground">{p.ward}{p.bed ? ` / ${p.bed}` : ""}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Pill className="h-3 w-3" />
                        {p.prescriptions.filter((r) => r.active).length}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Patient Detail */}
        <div className="lg:col-span-2">
          {!selectedPatient ? (
            <div className="flex flex-col items-center justify-center h-full py-24 text-muted-foreground">
              <Brain className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">Selecione um paciente para ver os detalhes</p>
            </div>
          ) : (
            <motion.div key={selectedPatient.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Header */}
              <Card className="p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{selectedPatient.name}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedPatient.diagnosis}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", statusConfig[selectedPatient.status].className)}>
                    {statusConfig[selectedPatient.status].label}
                  </Badge>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-xs text-muted-foreground block">Registro</span><span className="font-mono font-medium">{selectedPatient.registrationNumber}</span></div>
                  <div><span className="text-xs text-muted-foreground block">Idade</span><span className="font-medium">{selectedPatient.dateOfBirth ? `${age(selectedPatient.dateOfBirth)} anos (${selectedPatient.gender})` : "—"}</span></div>
                  <div><span className="text-xs text-muted-foreground block">Médico</span><span className="font-medium">{selectedPatient.attendingDoctor}</span></div>
                  <div><span className="text-xs text-muted-foreground block">Admissão</span><span className="font-medium">{new Date(selectedPatient.admissionDate).toLocaleDateString("pt-BR")}</span></div>
                  <div><span className="text-xs text-muted-foreground block">Ala / Leito</span><span className="font-medium">{selectedPatient.ward}{selectedPatient.bed ? ` / ${selectedPatient.bed}` : ""}</span></div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-xs text-muted-foreground block">Alergias</span>
                    <span className={cn("font-medium", selectedPatient.allergies !== "Nenhuma conhecida" && "text-destructive")}>
                      {selectedPatient.allergies !== "Nenhuma conhecida" && <AlertCircle className="h-3 w-3 inline mr-1" />}
                      {selectedPatient.allergies}
                    </span>
                  </div>
                </div>
                {selectedPatient.notes && (
                  <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded-lg p-2.5">{selectedPatient.notes}</p>
                )}
              </Card>

              {/* Tabs: Prescrições / Evolução / Dispensações */}
              <Card className="p-5 shadow-card">
                <Tabs defaultValue="prescricoes">
                  <TabsList className="mb-4">
                    <TabsTrigger value="prescricoes" className="text-xs gap-1"><FileText className="h-3 w-3" /> Prescrições</TabsTrigger>
                    <TabsTrigger value="evolucao" className="text-xs gap-1"><Activity className="h-3 w-3" /> Evolução</TabsTrigger>
                    <TabsTrigger value="dispensacoes" className="text-xs gap-1"><Syringe className="h-3 w-3" /> Dispensações</TabsTrigger>
                  </TabsList>

                  <TabsContent value="prescricoes">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="text-[10px]">{selectedPatient.prescriptions.filter((r) => r.active).length} ativas</Badge>
                      <Button size="sm" onClick={() => setRxDialogOpen(true)} className="gradient-primary text-primary-foreground gap-1.5 text-xs">
                        <Plus className="h-3.5 w-3.5" /> Nova Prescrição
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {selectedPatient.prescriptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma prescrição registrada</p>
                      ) : selectedPatient.prescriptions.map((rx) => (
                        <div key={rx.id} className={cn("rounded-lg border p-3 transition-colors", rx.active ? "bg-card" : "bg-muted/30 opacity-60")}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Pill className={cn("h-4 w-4", rx.active ? "text-primary" : "text-muted-foreground")} />
                              <div>
                                <p className={cn("text-sm font-medium", !rx.active && "line-through")}>{rx.medicationName} {rx.dosage}</p>
                                <p className="text-xs text-muted-foreground">{rx.frequency} • {rx.prescribedBy}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[9px]", rx.active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground")}>
                                {rx.active ? "Ativa" : "Suspensa"}
                              </Badge>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleRxActive(selectedPatient.id, rx.id)}>
                                {rx.active ? "Suspender" : "Reativar"}
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                            <span><Clock className="h-3 w-3 inline mr-0.5" /> Início: {new Date(rx.startDate).toLocaleDateString("pt-BR")}</span>
                            {rx.endDate && <span>Fim: {new Date(rx.endDate).toLocaleDateString("pt-BR")}</span>}
                          </div>
                          {rx.notes && <p className="text-[11px] text-muted-foreground mt-1.5 italic">{rx.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="evolucao">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="text-[10px]">{selectedPatient.evolution.length} registros</Badge>
                      <Button size="sm" onClick={() => setEvoDialogOpen(true)} className="gradient-primary text-primary-foreground gap-1.5 text-xs">
                        <Plus className="h-3.5 w-3.5" /> Nova Evolução
                      </Button>
                    </div>
                    {selectedPatient.evolution.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma evolução registrada</p>
                    ) : (
                      <div className="relative space-y-0">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                        {selectedPatient.evolution.map((evo, i) => {
                          const config = evolutionTypeConfig[evo.type];
                          return (
                            <motion.div key={evo.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative pl-10 pb-5">
                              <div className={cn("absolute left-2 top-1 h-5 w-5 rounded-full flex items-center justify-center border-2 border-background z-10", config.className)}>
                                <div className="h-2 w-2 rounded-full bg-current" />
                              </div>
                              <div className="rounded-lg border bg-card p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={cn("text-[9px]", config.className)}>{config.label}</Badge>
                                  <span className="text-[10px] text-muted-foreground">{new Date(evo.date).toLocaleDateString("pt-BR")} {new Date(evo.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <p className="text-sm text-foreground">{evo.description}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">— {evo.author}</p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="dispensacoes">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="text-[10px]">{selectedPatient.dispensations.length} dispensações</Badge>
                      <Button size="sm" onClick={() => setDispDialogOpen(true)} className="gradient-primary text-primary-foreground gap-1.5 text-xs">
                        <Syringe className="h-3.5 w-3.5" /> Dispensar Medicamento
                      </Button>
                    </div>
                    {selectedPatient.dispensations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma dispensação registrada</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedPatient.dispensations.map((d, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
                              <Pill className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{d.medicationName}</p>
                              <p className="text-[11px] text-muted-foreground">{new Date(d.date).toLocaleDateString("pt-BR")} • {d.quantity} unidades</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* New Patient Dialog */}
      <Dialog open={patientDialogOpen} onOpenChange={setPatientDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Cadastrar Paciente</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Nome Completo</Label><Input value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Data de Nascimento</Label><Input type="date" value={newPatient.dateOfBirth} onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Gênero</Label>
                <Select value={newPatient.gender} onValueChange={(v) => setNewPatient({ ...newPatient, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">Diagnóstico (CID)</Label><Input value={newPatient.diagnosis} onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })} placeholder="Ex: Esquizofrenia Paranoide (F20.0)" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label className="text-xs font-medium">Ala</Label><Input value={newPatient.ward} onChange={(e) => setNewPatient({ ...newPatient, ward: e.target.value })} placeholder="Ala A" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Leito</Label><Input value={newPatient.bed} onChange={(e) => setNewPatient({ ...newPatient, bed: e.target.value })} placeholder="A-01" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={newPatient.status} onValueChange={(v) => setNewPatient({ ...newPatient, status: v as PatientStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internado">Internado</SelectItem>
                    <SelectItem value="ambulatorial">Ambulatorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">Médico Responsável</Label><Input value={newPatient.attendingDoctor} onChange={(e) => setNewPatient({ ...newPatient, attendingDoctor: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">Alergias</Label><Input value={newPatient.allergies} onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })} placeholder="Nenhuma conhecida" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">Observações</Label><Textarea value={newPatient.notes} onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPatientDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddPatient} className="gradient-primary text-primary-foreground">Cadastrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Prescription Dialog */}
      <Dialog open={rxDialogOpen} onOpenChange={setRxDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Nova Prescrição — {selectedPatient?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Medicamento</Label>
              <Select value={newRx.medicationName} onValueChange={(v) => {
                const med = medications.find((m) => m.name === v);
                setNewRx({ ...newRx, medicationName: v, dosage: med?.dosage || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar medicamento" /></SelectTrigger>
                <SelectContent>{medications.map((m) => <SelectItem key={m.id} value={m.name}>{m.name} {m.dosage}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs font-medium">Dosagem</Label><Input value={newRx.dosage} onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })} placeholder="Ex: 2mg" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Frequência</Label><Input value={newRx.frequency} onChange={(e) => setNewRx({ ...newRx, frequency: e.target.value })} placeholder="Ex: 2x ao dia" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">Prescrito por</Label><Input value={newRx.prescribedBy} onChange={(e) => setNewRx({ ...newRx, prescribedBy: e.target.value })} placeholder="Nome do médico" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">Observações</Label><Textarea value={newRx.notes} onChange={(e) => setNewRx({ ...newRx, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRxDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddRx} className="gradient-primary text-primary-foreground">Prescrever</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evolution Dialog */}
      <Dialog open={evoDialogOpen} onOpenChange={setEvoDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Nova Evolução — {selectedPatient?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo</Label>
              <Select value={newEvo.type} onValueChange={(v) => setNewEvo({ ...newEvo, type: v as EvolutionEntry["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinica">Avaliação Clínica</SelectItem>
                  <SelectItem value="medicacao">Alteração de Medicação</SelectItem>
                  <SelectItem value="intercorrencia">Intercorrência</SelectItem>
                  <SelectItem value="alta">Alta / Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-medium">Descrição</Label><Textarea value={newEvo.description} onChange={(e) => setNewEvo({ ...newEvo, description: e.target.value })} rows={4} placeholder="Descreva a evolução clínica..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEvoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddEvolution} className="gradient-primary text-primary-foreground">Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispense Dialog */}
      <Dialog open={dispDialogOpen} onOpenChange={setDispDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Syringe className="h-5 w-5 text-primary" /> Dispensar para {selectedPatient?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Medicamento</Label>
              <Select value={dispMedId} onValueChange={setDispMedId}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {medications.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} {m.dosage} — Estoque: {m.currentStock}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quantidade</Label>
              <Input type="number" min={1} value={dispQty || ""} onChange={(e) => setDispQty(Number(e.target.value))} />
              {dispMedId && (
                <p className="text-[11px] text-muted-foreground">Disponível: <span className="font-semibold">{getMedicationById(dispMedId)?.currentStock || 0} un.</span></p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDispDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleDispense} className="gradient-primary text-primary-foreground">Dispensar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Pacientes;
