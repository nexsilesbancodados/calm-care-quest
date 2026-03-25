import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Search, Plus, ArrowDownCircle, ArrowUpCircle, Building2,
  Truck, FileText, Clock, CheckCircle2, XCircle, MapPin, Send,
} from "lucide-react";
import { toast } from "sonner";

type TransferDirection = "envio" | "recebimento";
type TransferStatus = "pendente" | "em_trânsito" | "concluído" | "cancelado";

interface Branch {
  id: string;
  name: string;
  address: string;
  type: string;
}

interface TransferItem {
  medicationName: string;
  dosage: string;
  quantity: number;
  batchNumber: string;
}

interface Transfer {
  id: string;
  direction: TransferDirection;
  originBranch: string;
  destinationBranch: string;
  status: TransferStatus;
  items: TransferItem[];
  date: string;
  expectedDate: string;
  responsiblePerson: string;
  receivedBy?: string;
  transportDoc?: string;
  notes: string;
}

const BRANCHES: Branch[] = [
  { id: "hq", name: "Hospital São Lucas — Sede", address: "Av. Principal, 1000 — Centro", type: "Sede" },
  { id: "fil-norte", name: "Unidade Norte", address: "Rua das Acácias, 250 — Zona Norte", type: "Filial" },
  { id: "fil-sul", name: "Unidade Sul", address: "Av. Sul, 780 — Zona Sul", type: "Filial" },
  { id: "fil-leste", name: "Unidade Leste", address: "Rua Leste, 320 — Zona Leste", type: "Filial" },
  { id: "caps", name: "CAPS III — Centro", address: "Rua da Saúde, 45 — Centro", type: "CAPS" },
  { id: "ambulatorio", name: "Ambulatório Psiquiátrico", address: "Av. Brasil, 1500 — Centro", type: "Ambulatório" },
];

const CURRENT_BRANCH = "hq";

const statusConfig: Record<TransferStatus, { label: string; icon: any; className: string }> = {
  pendente: { label: "Pendente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  em_trânsito: { label: "Em Trânsito", icon: Truck, className: "bg-info/10 text-info border-info/20" },
  concluído: { label: "Concluído", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  cancelado: { label: "Cancelado", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const directionConfig: Record<TransferDirection, { label: string; icon: any; className: string }> = {
  envio: { label: "Envio", icon: ArrowUpCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  recebimento: { label: "Recebimento", icon: ArrowDownCircle, className: "bg-success/10 text-success border-success/20" },
};

const initialTransfers: Transfer[] = [
  {
    id: "T001", direction: "envio", originBranch: "hq", destinationBranch: "fil-norte",
    status: "concluído",
    items: [
      { medicationName: "Risperidona", dosage: "2mg", quantity: 100, batchNumber: "RP2024-001" },
      { medicationName: "Fluoxetina", dosage: "20mg", quantity: 200, batchNumber: "FX2024-112" },
    ],
    date: "2026-03-15", expectedDate: "2026-03-16", responsiblePerson: "Farm. João Santos",
    receivedBy: "Farm. Lucia Almeida", transportDoc: "GT-2026-0045",
    notes: "Reposição mensal programada",
  },
  {
    id: "T002", direction: "envio", originBranch: "hq", destinationBranch: "caps",
    status: "em_trânsito",
    items: [
      { medicationName: "Haloperidol", dosage: "5mg/ml", quantity: 20, batchNumber: "HP2024-045" },
      { medicationName: "Clonazepam", dosage: "2mg", quantity: 30, batchNumber: "CZ2024-078" },
      { medicationName: "Diazepam", dosage: "10mg", quantity: 15, batchNumber: "DZ2024-134" },
    ],
    date: "2026-03-18", expectedDate: "2026-03-19", responsiblePerson: "Farm. Pedro Lima",
    transportDoc: "GT-2026-0052", notes: "Urgência — solicitação CAPS III",
  },
  {
    id: "T003", direction: "recebimento", originBranch: "fil-sul", destinationBranch: "hq",
    status: "pendente",
    items: [
      { medicationName: "Carbonato de Lítio", dosage: "300mg", quantity: 150, batchNumber: "LT2024-033" },
    ],
    date: "2026-03-18", expectedDate: "2026-03-20", responsiblePerson: "Farm. Ana Ribeiro",
    notes: "Devolução de excedente da Unidade Sul",
  },
  {
    id: "T004", direction: "envio", originBranch: "hq", destinationBranch: "fil-leste",
    status: "concluído",
    items: [
      { medicationName: "Sertralina", dosage: "50mg", quantity: 100, batchNumber: "SR2024-201" },
      { medicationName: "Olanzapina", dosage: "10mg", quantity: 40, batchNumber: "OZ2024-067" },
    ],
    date: "2026-03-12", expectedDate: "2026-03-13", responsiblePerson: "Farm. João Santos",
    receivedBy: "Farm. Roberto Nunes", transportDoc: "GT-2026-0038",
    notes: "",
  },
  {
    id: "T005", direction: "recebimento", originBranch: "ambulatorio", destinationBranch: "hq",
    status: "cancelado",
    items: [
      { medicationName: "Quetiapina", dosage: "100mg", quantity: 50, batchNumber: "QT2024-089" },
    ],
    date: "2026-03-10", expectedDate: "2026-03-11", responsiblePerson: "Farm. Carlos Dias",
    notes: "Cancelado — medicamento utilizado no local",
  },
  {
    id: "T006", direction: "envio", originBranch: "hq", destinationBranch: "ambulatorio",
    status: "pendente",
    items: [
      { medicationName: "Carbamazepina", dosage: "200mg", quantity: 80, batchNumber: "CB2024-090" },
      { medicationName: "Fluoxetina", dosage: "20mg", quantity: 100, batchNumber: "FX2024-112" },
    ],
    date: "2026-03-19", expectedDate: "2026-03-21", responsiblePerson: "Farm. Pedro Lima",
    notes: "Agendado para próximo embarque",
  },
];

const Transferencias = () => {
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "all">("all");
  const [dirFilter, setDirFilter] = useState<TransferDirection | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailTransfer, setDetailTransfer] = useState<Transfer | null>(null);
  const [activeTab, setActiveTab] = useState("lista");

  // New transfer form
  const [newTransfer, setNewTransfer] = useState({
    direction: "envio" as TransferDirection,
    destinationBranch: "",
    originBranch: "",
    responsiblePerson: "",
    expectedDate: "",
    transportDoc: "",
    notes: "",
    items: [{ medicationName: "", dosage: "", quantity: 0, batchNumber: "" }] as TransferItem[],
  });

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      const destBranch = BRANCHES.find((b) => b.id === t.destinationBranch);
      const origBranch = BRANCHES.find((b) => b.id === t.originBranch);
      const matchesSearch = !search ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        destBranch?.name.toLowerCase().includes(search.toLowerCase()) ||
        origBranch?.name.toLowerCase().includes(search.toLowerCase()) ||
        t.items.some((i) => i.medicationName.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesDir = dirFilter === "all" || t.direction === dirFilter;
      return matchesSearch && matchesStatus && matchesDir;
    });
  }, [transfers, search, statusFilter, dirFilter]);

  const stats = useMemo(() => ({
    pending: transfers.filter((t) => t.status === "pendente").length,
    inTransit: transfers.filter((t) => t.status === "em_trânsito").length,
    completed: transfers.filter((t) => t.status === "concluído").length,
    totalItems: transfers.reduce((s, t) => s + t.items.reduce((si, i) => si + i.quantity, 0), 0),
  }), [transfers]);

  const addItem = () => setNewTransfer((p) => ({ ...p, items: [...p.items, { medicationName: "", dosage: "", quantity: 0, batchNumber: "" }] }));
  const removeItem = (idx: number) => setNewTransfer((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: keyof TransferItem, value: string | number) => {
    setNewTransfer((p) => ({
      ...p,
      items: p.items.map((it, i) => i === idx ? { ...it, [field]: value } : it),
    }));
  };

  const handleCreate = () => {
    if (newTransfer.items.every((i) => !i.medicationName)) {
      toast.error("Adicione pelo menos um medicamento");
      return;
    }
    const t: Transfer = {
      id: `T${String(transfers.length + 1).padStart(3, "0")}`,
      direction: newTransfer.direction,
      originBranch: newTransfer.direction === "envio" ? CURRENT_BRANCH : newTransfer.originBranch,
      destinationBranch: newTransfer.direction === "envio" ? newTransfer.destinationBranch : CURRENT_BRANCH,
      status: "pendente",
      items: newTransfer.items.filter((i) => i.medicationName),
      date: new Date().toISOString().split("T")[0],
      expectedDate: newTransfer.expectedDate,
      responsiblePerson: newTransfer.responsiblePerson,
      transportDoc: newTransfer.transportDoc,
      notes: newTransfer.notes,
    };
    setTransfers((prev) => [t, ...prev]);
    setDialogOpen(false);
    setNewTransfer({ direction: "envio", destinationBranch: "", originBranch: "", responsiblePerson: "", expectedDate: "", transportDoc: "", notes: "", items: [{ medicationName: "", dosage: "", quantity: 0, batchNumber: "" }] });
    toast.success("Transferência registrada com sucesso!");
  };

  const updateStatus = (id: string, status: TransferStatus) => {
    setTransfers((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    setDetailTransfer((prev) => prev?.id === id ? { ...prev, status } : prev);
    toast.success(`Status atualizado para: ${statusConfig[status].label}`);
  };

  return (
    <AppLayout title="Transferências entre Filiais" subtitle={`${transfers.length} transferências registradas`}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pendentes", value: stats.pending, icon: Clock, variant: "warning" as const },
          { label: "Em Trânsito", value: stats.inTransit, icon: Truck, variant: "info" as const },
          { label: "Concluídas", value: stats.completed, icon: CheckCircle2, variant: "success" as const },
          { label: "Itens Movimentados", value: stats.totalItems, icon: Building2, variant: "default" as const },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", {
                "bg-warning/10 text-warning": s.variant === "warning",
                "bg-info/10 text-info": s.variant === "info",
                "bg-success/10 text-success": s.variant === "success",
                "bg-primary/10 text-primary": s.variant === "default",
              })}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="lista">Lista de Transferências</TabsTrigger>
            <TabsTrigger value="filiais">Filiais Cadastradas</TabsTrigger>
          </TabsList>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Nova Transferência
          </Button>
        </div>

        <TabsContent value="lista" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por ID, filial ou medicamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
            </div>
            <Select value={dirFilter} onValueChange={(v) => setDirFilter(v as any)}>
              <SelectTrigger className="w-[150px] bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas direções</SelectItem>
                <SelectItem value="envio">Envios</SelectItem>
                <SelectItem value="recebimento">Recebimentos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[150px] bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_trânsito">Em Trânsito</SelectItem>
                <SelectItem value="concluído">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">ID</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Direção</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Origem</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Destino</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-center">Itens</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Data</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide">Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma transferência encontrada</TableCell></TableRow>
                ) : filtered.map((t) => {
                  const dir = directionConfig[t.direction];
                  const st = statusConfig[t.status];
                  const orig = BRANCHES.find((b) => b.id === t.originBranch);
                  const dest = BRANCHES.find((b) => b.id === t.destinationBranch);
                  const totalQty = t.items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setDetailTransfer(t)}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{t.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[11px] font-medium gap-1", dir.className)}>
                          <dir.icon className="h-3 w-3" /> {dir.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{orig?.name || t.originBranch}</TableCell>
                      <TableCell className="text-sm">{dest?.name || t.destinationBranch}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-semibold">{t.items.length}</span>
                        <span className="text-xs text-muted-foreground ml-1">({totalQty} un.)</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(t.date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[11px] font-medium gap-1", st.className)}>
                          <st.icon className="h-3 w-3" /> {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.responsiblePerson}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </motion.div>
        </TabsContent>

        <TabsContent value="filiais">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BRANCHES.map((branch, i) => (
              <motion.div key={branch.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="p-4 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", branch.id === CURRENT_BRANCH ? "gradient-primary" : "bg-muted")}>
                      <Building2 className={cn("h-5 w-5", branch.id === CURRENT_BRANCH ? "text-primary-foreground" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{branch.name}</p>
                        {branch.id === CURRENT_BRANCH && <Badge className="text-[9px] gradient-primary text-primary-foreground border-0">Atual</Badge>}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{branch.address}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] mt-2">{branch.type}</Badge>
                      <div className="mt-3 flex gap-2 text-[11px]">
                        <span className="text-muted-foreground">
                          Envios: <span className="font-semibold text-foreground">{transfers.filter((t) => t.originBranch === branch.id).length}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Receb.: <span className="font-semibold text-foreground">{transfers.filter((t) => t.destinationBranch === branch.id).length}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detailTransfer} onOpenChange={(o) => { if (!o) setDetailTransfer(null); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          {detailTransfer && (() => {
            const t = detailTransfer;
            const dir = directionConfig[t.direction];
            const st = statusConfig[t.status];
            const orig = BRANCHES.find((b) => b.id === t.originBranch);
            const dest = BRANCHES.find((b) => b.id === t.destinationBranch);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-lg">Transferência {t.id}</DialogTitle>
                    <Badge variant="outline" className={cn("text-xs gap-1", st.className)}>
                      <st.icon className="h-3 w-3" /> {st.label}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="text-center flex-1">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Origem</p>
                      <p className="text-sm font-semibold mt-0.5">{orig?.name}</p>
                      <p className="text-[11px] text-muted-foreground">{orig?.type}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Send className="h-4 w-4 text-primary" />
                      <div className="text-[10px] text-muted-foreground">→</div>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Destino</p>
                      <p className="text-sm font-semibold mt-0.5">{dest?.name}</p>
                      <p className="text-[11px] text-muted-foreground">{dest?.type}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-xs text-muted-foreground">Data:</span><p className="font-medium">{new Date(t.date).toLocaleDateString("pt-BR")}</p></div>
                    <div><span className="text-xs text-muted-foreground">Previsão:</span><p className="font-medium">{t.expectedDate ? new Date(t.expectedDate).toLocaleDateString("pt-BR") : "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground">Responsável:</span><p className="font-medium">{t.responsiblePerson}</p></div>
                    <div><span className="text-xs text-muted-foreground">Recebido por:</span><p className="font-medium">{t.receivedBy || "—"}</p></div>
                    {t.transportDoc && <div className="col-span-2"><span className="text-xs text-muted-foreground">Guia de Transporte:</span><p className="font-mono font-medium text-xs">{t.transportDoc}</p></div>}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Medicamentos ({t.items.length})</p>
                    <div className="space-y-2">
                      {t.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border p-2.5">
                          <div>
                            <p className="text-sm font-medium">{item.medicationName} {item.dosage}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">Lote: {item.batchNumber}</p>
                          </div>
                          <Badge variant="outline" className="text-xs font-semibold">{item.quantity} un.</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {t.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Observações:</p>
                        <p className="text-sm bg-muted/50 rounded-lg p-2.5">{t.notes}</p>
                      </div>
                    </>
                  )}

                  {/* Status Actions */}
                  {t.status !== "concluído" && t.status !== "cancelado" && (
                    <>
                      <Separator />
                      <div className="flex gap-2">
                        {t.status === "pendente" && (
                          <>
                            <Button size="sm" className="flex-1 gap-1.5 bg-info text-info-foreground hover:bg-info/90" onClick={() => updateStatus(t.id, "em_trânsito")}>
                              <Truck className="h-3.5 w-3.5" /> Marcar Em Trânsito
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => updateStatus(t.id, "cancelado")}>
                              <XCircle className="h-3.5 w-3.5" /> Cancelar
                            </Button>
                          </>
                        )}
                        {t.status === "em_trânsito" && (
                          <Button size="sm" className="flex-1 gap-1.5 bg-success text-success-foreground hover:bg-success/90" onClick={() => updateStatus(t.id, "concluído")}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar Recebimento
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* New Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Transferência</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Direção</Label>
                <Select value={newTransfer.direction} onValueChange={(v) => setNewTransfer({ ...newTransfer, direction: v as TransferDirection })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="envio">Envio para filial</SelectItem>
                    <SelectItem value="recebimento">Recebimento de filial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{newTransfer.direction === "envio" ? "Destino" : "Origem"}</Label>
                <Select
                  value={newTransfer.direction === "envio" ? newTransfer.destinationBranch : newTransfer.originBranch}
                  onValueChange={(v) => setNewTransfer({
                    ...newTransfer,
                    ...(newTransfer.direction === "envio" ? { destinationBranch: v } : { originBranch: v }),
                  })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar filial" /></SelectTrigger>
                  <SelectContent>
                    {BRANCHES.filter((b) => b.id !== CURRENT_BRANCH).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Responsável</Label>
                <Input value={newTransfer.responsiblePerson} onChange={(e) => setNewTransfer({ ...newTransfer, responsiblePerson: e.target.value })} placeholder="Nome do farmacêutico" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Previsão de Entrega</Label>
                <Input type="date" value={newTransfer.expectedDate} onChange={(e) => setNewTransfer({ ...newTransfer, expectedDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Guia de Transporte (opcional)</Label>
              <Input value={newTransfer.transportDoc} onChange={(e) => setNewTransfer({ ...newTransfer, transportDoc: e.target.value })} placeholder="Ex: GT-2026-0060" className="font-mono" />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold uppercase tracking-wide">Medicamentos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs gap-1">
                  <Plus className="h-3 w-3" /> Adicionar Item
                </Button>
              </div>
              <div className="space-y-3">
                {newTransfer.items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-medium">Item {idx + 1}</span>
                      {newTransfer.items.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removeItem(idx)}>Remover</Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={item.medicationName} onValueChange={(v) => {
                        const med = mockMedications.find((m) => m.name === v);
                        if (med) {
                          updateItem(idx, "medicationName", med.name);
                          updateItem(idx, "dosage", med.dosage);
                          updateItem(idx, "batchNumber", med.batchNumber);
                        }
                      }}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Medicamento" /></SelectTrigger>
                        <SelectContent>
                          {mockMedications.map((m) => <SelectItem key={m.id} value={m.name}>{m.name} {m.dosage}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="number" min={1} placeholder="Quantidade" value={item.quantity || ""} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="text-xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea value={newTransfer.notes} onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="gradient-primary text-primary-foreground gap-2">
                <Send className="h-4 w-4" /> Registrar Transferência
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Transferencias;
