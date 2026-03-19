import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { mockMedications } from "@/data/mockMedications";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Users, User, FileText, Calendar, Pill,
  Activity, AlertCircle, Clock, Heart, Brain,
} from "lucide-react";
import { toast } from "sonner";

type PatientStatus = "internado" | "ambulatorial" | "alta";

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
}

const statusConfig: Record<PatientStatus, { label: string; className: string }> = {
  internado: { label: "Internado", className: "bg-info/10 text-info border-info/20" },
  ambulatorial: { label: "Ambulatorial", className: "bg-warning/10 text-warning border-warning/20" },
  alta: { label: "Alta", className: "bg-success/10 text-success border-success/20" },
};

const initialPatients: Patient[] = [
  {
    id: "P001", name: "Carlos Eduardo Santos", registrationNumber: "2026-1042", dateOfBirth: "1985-06-15", gender: "Masculino",
    ward: "Ala B", bed: "B-12", diagnosis: "Esquizofrenia Paranoide (F20.0)", status: "internado", admissionDate: "2026-01-10",
    attendingDoctor: "Dr. Ricardo Mendes", allergies: "Dipirona", notes: "Paciente estável, em acompanhamento semanal.",
    prescriptions: [
      { id: "RX001", medicationName: "Risperidona", dosage: "2mg", frequency: "2x ao dia", startDate: "2026-01-10", prescribedBy: "Dr. Ricardo Mendes", notes: "Dose ajustada em 15/02", active: true },
      { id: "RX002", medicationName: "Clonazepam", dosage: "2mg", frequency: "1x à noite", startDate: "2026-01-10", prescribedBy: "Dr. Ricardo Mendes", notes: "SOS em caso de agitação", active: true },
    ],
  },
  {
    id: "P002", name: "Maria Aparecida Lima", registrationNumber: "2026-0987", dateOfBirth: "1972-11-22", gender: "Feminino",
    ward: "Ala A", bed: "A-05", diagnosis: "Transtorno Bipolar tipo I (F31.1)", status: "internado", admissionDate: "2026-02-20",
    attendingDoctor: "Dra. Fernanda Oliveira", allergies: "Nenhuma conhecida", notes: "Em fase maníaca, estabilização em curso.",
    prescriptions: [
      { id: "RX003", medicationName: "Carbonato de Lítio", dosage: "300mg", frequency: "3x ao dia", startDate: "2026-02-20", prescribedBy: "Dra. Fernanda Oliveira", notes: "Litemia: 0.8 mEq/L (14/03)", active: true },
      { id: "RX004", medicationName: "Quetiapina", dosage: "100mg", frequency: "1x à noite", startDate: "2026-02-22", prescribedBy: "Dra. Fernanda Oliveira", notes: "", active: true },
      { id: "RX005", medicationName: "Olanzapina", dosage: "10mg", frequency: "1x ao dia", startDate: "2026-02-20", endDate: "2026-03-05", prescribedBy: "Dra. Fernanda Oliveira", notes: "Substituída por Quetiapina", active: false },
    ],
  },
  {
    id: "P003", name: "José Antônio Ferreira", registrationNumber: "2026-1103", dateOfBirth: "1990-03-08", gender: "Masculino",
    ward: "Ala C", bed: "C-03", diagnosis: "Transtorno de Ansiedade Generalizada (F41.1)", status: "internado", admissionDate: "2026-03-05",
    attendingDoctor: "Dr. Ricardo Mendes", allergies: "Sulfa, Penicilina", notes: "Internação breve, previsão de alta em 7 dias.",
    prescriptions: [
      { id: "RX006", medicationName: "Sertralina", dosage: "50mg", frequency: "1x pela manhã", startDate: "2026-03-05", prescribedBy: "Dr. Ricardo Mendes", notes: "", active: true },
      { id: "RX007", medicationName: "Diazepam", dosage: "10mg", frequency: "SOS", startDate: "2026-03-05", prescribedBy: "Dr. Ricardo Mendes", notes: "Máx 3x ao dia", active: true },
    ],
  },
  {
    id: "P004", name: "Ana Beatriz Souza", registrationNumber: "2025-0856", dateOfBirth: "1995-09-30", gender: "Feminino",
    ward: "Ala B", bed: "B-08", diagnosis: "Depressão Grave com Sintomas Psicóticos (F32.3)", status: "internado", admissionDate: "2025-12-15",
    attendingDoctor: "Dra. Fernanda Oliveira", allergies: "Nenhuma conhecida", notes: "Melhora significativa, avaliação para alta programada.",
    prescriptions: [
      { id: "RX008", medicationName: "Fluoxetina", dosage: "20mg", frequency: "1x pela manhã", startDate: "2025-12-15", prescribedBy: "Dra. Fernanda Oliveira", notes: "", active: true },
      { id: "RX009", medicationName: "Risperidona", dosage: "2mg", frequency: "1x à noite", startDate: "2025-12-15", endDate: "2026-02-28", prescribedBy: "Dra. Fernanda Oliveira", notes: "Suspensa após remissão dos sintomas psicóticos", active: false },
    ],
  },
  {
    id: "P005", name: "Roberto Carlos Pereira", registrationNumber: "2026-0750", dateOfBirth: "1968-01-12", gender: "Masculino",
    ward: "—", diagnosis: "Dependência de Álcool (F10.2)", status: "ambulatorial", admissionDate: "2026-02-01",
    attendingDoctor: "Dr. Paulo Guedes", allergies: "Nenhuma conhecida", notes: "Atendimento quinzenal no ambulatório.",
    prescriptions: [
      { id: "RX010", medicationName: "Carbamazepina", dosage: "200mg", frequency: "2x ao dia", startDate: "2026-02-01", prescribedBy: "Dr. Paulo Guedes", notes: "Prevenção de convulsões", active: true },
    ],
  },
  {
    id: "P006", name: "Luciana de Almeida", registrationNumber: "2025-0412", dateOfBirth: "1988-07-19", gender: "Feminino",
    ward: "—", diagnosis: "Transtorno Borderline (F60.3)", status: "alta", admissionDate: "2025-08-10",
    attendingDoctor: "Dra. Fernanda Oliveira", allergies: "Ibuprofeno", notes: "Alta em 10/01/2026, acompanhamento ambulatorial.",
    prescriptions: [
      { id: "RX011", medicationName: "Sertralina", dosage: "50mg", frequency: "1x pela manhã", startDate: "2025-08-10", endDate: "2026-01-10", prescribedBy: "Dra. Fernanda Oliveira", notes: "", active: false },
    ],
  },
];

const Pacientes = () => {
  const [patients, setPatients] = useState(initialPatients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientStatus | "all">("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [rxDialogOpen, setRxDialogOpen] = useState(false);

  const [newRx, setNewRx] = useState({
    medicationName: "", dosage: "", frequency: "", prescribedBy: "", notes: "",
  });

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

  const handleAddRx = () => {
    if (!selectedPatient || !newRx.medicationName) return;
    const rx: Prescription = {
      id: `RX${crypto.randomUUID().slice(0, 4)}`,
      ...newRx,
      startDate: new Date().toISOString().split("T")[0],
      active: true,
    };
    setPatients((prev) => prev.map((p) => p.id === selectedPatient.id
      ? { ...p, prescriptions: [rx, ...p.prescriptions] }
      : p
    ));
    setSelectedPatient((prev) => prev ? { ...prev, prescriptions: [rx, ...prev.prescriptions] } : prev);
    setRxDialogOpen(false);
    setNewRx({ medicationName: "", dosage: "", frequency: "", prescribedBy: "", notes: "" });
    toast.success("Prescrição adicionada!");
  };

  const toggleRxActive = (patientId: string, rxId: string) => {
    setPatients((prev) => prev.map((p) => p.id === patientId
      ? { ...p, prescriptions: p.prescriptions.map((r) => r.id === rxId ? { ...r, active: !r.active, endDate: r.active ? new Date().toISOString().split("T")[0] : undefined } : r) }
      : p
    ));
    setSelectedPatient((prev) => prev && prev.id === patientId
      ? { ...prev, prescriptions: prev.prescriptions.map((r) => r.id === rxId ? { ...r, active: !r.active, endDate: r.active ? new Date().toISOString().split("T")[0] : undefined } : r) }
      : prev
    );
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

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Reg: {p.registrationNumber} • {age(p.dateOfBirth)} anos</p>
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
                  <div><span className="text-xs text-muted-foreground block">Idade</span><span className="font-medium">{age(selectedPatient.dateOfBirth)} anos ({selectedPatient.gender})</span></div>
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

              {/* Prescriptions */}
              <Card className="p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Prescrições</h3>
                    <Badge variant="outline" className="text-[10px]">{selectedPatient.prescriptions.filter((r) => r.active).length} ativas</Badge>
                  </div>
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
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add Prescription Dialog */}
      <Dialog open={rxDialogOpen} onOpenChange={setRxDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Nova Prescrição — {selectedPatient?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Medicamento</Label>
              <Select value={newRx.medicationName} onValueChange={(v) => {
                const med = mockMedications.find((m) => m.name === v);
                setNewRx({ ...newRx, medicationName: v, dosage: med?.dosage || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecionar medicamento" /></SelectTrigger>
                <SelectContent>{mockMedications.map((m) => <SelectItem key={m.id} value={m.name}>{m.name} {m.dosage}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Dosagem</Label>
                <Input value={newRx.dosage} onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })} placeholder="Ex: 2mg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Frequência</Label>
                <Input value={newRx.frequency} onChange={(e) => setNewRx({ ...newRx, frequency: e.target.value })} placeholder="Ex: 2x ao dia" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Prescrito por</Label>
              <Input value={newRx.prescribedBy} onChange={(e) => setNewRx({ ...newRx, prescribedBy: e.target.value })} placeholder="Nome do médico" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea value={newRx.notes} onChange={(e) => setNewRx({ ...newRx, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRxDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddRx} className="gradient-primary text-primary-foreground">Prescrever</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Pacientes;
