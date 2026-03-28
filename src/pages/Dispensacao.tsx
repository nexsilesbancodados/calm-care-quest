import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ClipboardList, AlertTriangle, Search, ArrowUpCircle, Package, ShieldAlert,
  Calendar, CheckCircle2, History, User, Pill, Info, Syringe, FileText, X, Check, ChevronsUpDown, RotateCcw
} from "lucide-react";
import type { Medicamento, Lote, Prescricao } from "@/types/database";

const MOTIVOS_DEVOLUCAO = [
  "Alta hospitalar",
  "Troca de medicamento",
  "Reação adversa",
  "Sobra de dose",
  "Outro",
] as const;

// --- Paciente recorrente helpers ---
interface PacienteRecorrente { nome: string; prontuario: string; setor: string; }
const PACIENTES_KEY = "dispensacao_pacientes";
function getPacientesRecorrentes(): PacienteRecorrente[] {
  try { return JSON.parse(localStorage.getItem(PACIENTES_KEY) || "[]"); } catch { return []; }
}
function savePacienteRecorrente(p: PacienteRecorrente) {
  const list = getPacientesRecorrentes().filter(x => x.nome !== p.nome || x.prontuario !== p.prontuario);
  list.unshift(p);
  localStorage.setItem(PACIENTES_KEY, JSON.stringify(list.slice(0, 10)));
}

const Dispensacao = () => {
  const { log } = useAudit();
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ medicamento_id: "", lote_id: "", quantidade: 0, paciente: "", prontuario: "", setor: "", observacao: "", prescricao_id: "" });
  const [histSearch, setHistSearch] = useState("");
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [medSearch, setMedSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tab, setTab] = useState("dispensar");

  // 1a: Auto FEFO state
  const [autoFefoLoteId, setAutoFefoLoteId] = useState<string>("");

  // 1b: Paciente recorrente combobox
  const [pacienteOpen, setPacienteOpen] = useState(false);
  const pacientesRecorrentes = useMemo(() => getPacientesRecorrentes(), [history]);

  // 1c: Quantidade incomum alert
  const [qtyAlertOpen, setQtyAlertOpen] = useState(false);

  // 1d: Show kept-patient message
  const [showKeptMessage, setShowKeptMessage] = useState(false);

  // Devolução form state
  const [devForm, setDevForm] = useState({ medicamento_id: "", lote_id: "", quantidade: 0, paciente: "", prontuario: "", motivo: "", observacao: "" });
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [devMedSearch, setDevMedSearch] = useState("");
  const [devHistory, setDevHistory] = useState<any[]>([]);

  const loadData = async () => {
    const [{ data: medsData }, { data: lotesData }, { data: histData }, { data: prescData }, { data: devHistData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").eq("ativo", true).gt("quantidade_atual", 0),
      supabase.from("movimentacoes").select("*, medicamentos(nome, concentracao)").eq("tipo", "dispensacao").order("created_at", { ascending: false }).limit(100),
      supabase.from("prescricoes").select("*").in("status", ["ativa", "parcialmente_dispensada"]).order("created_at", { ascending: false }),
      supabase.from("movimentacoes").select("*, medicamentos(nome, concentracao)").eq("tipo", "devolucao" as any).order("created_at", { ascending: false }).limit(50),
    ]);
    const medsWithLotes = (medsData || []).map((m: any) => ({
      ...m,
      lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id).sort((a: any, b: any) => new Date(a.validade).getTime() - new Date(b.validade).getTime()),
    }));
    setMeds(medsWithLotes);
    setHistory(histData || []);
    setPrescricoes((prescData as Prescricao[]) || []);
    setDevHistory(devHistData || []);

    const medId = searchParams.get("medicamento_id");
    if (medId && medsWithLotes.find((m: any) => m.id === medId)) {
      const med = medsWithLotes.find((m: any) => m.id === medId);
      const fefo = getValidFefoLote(med?.lotes || []);
      setForm(prev => ({ ...prev, medicamento_id: medId, lote_id: fefo?.id || "" }));
      setAutoFefoLoteId(fefo?.id || "");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [profile?.filial_id]);

  const now = new Date();

  // 1a: Get valid FEFO lote (not expired, qty > 0)
  const getValidFefoLote = (lotes: Lote[]) => {
    return lotes.find(l => new Date(l.validade) > now && l.quantidade_atual > 0);
  };

  const selectedMed = meds.find(m => m.id === form.medicamento_id);
  const selectedLote = selectedMed?.lotes.find(l => l.id === form.lote_id);

  const filteredMeds = useMemo(() => {
    const available = meds.filter(m => m.lotes.length > 0);
    if (!medSearch) return available;
    const s = medSearch.toLowerCase();
    return available.filter(m => m.nome.toLowerCase().includes(s) || m.generico.toLowerCase().includes(s) || m.principio_ativo.toLowerCase().includes(s));
  }, [meds, medSearch]);

  // 1a: Enhanced handleMedChange with proper FEFO
  const handleMedChange = (medId: string) => {
    const med = meds.find(m => m.id === medId);
    const fefoLote = getValidFefoLote(med?.lotes || []);
    const fefoId = fefoLote?.id || "";
    setAutoFefoLoteId(fefoId);
    setForm({ ...form, medicamento_id: medId, lote_id: fefoId });
  };

  const handlePrescricaoChange = (prescId: string) => {
    if (prescId === "none") { setForm({ ...form, prescricao_id: "" }); return; }
    const presc = prescricoes.find(p => p.id === prescId);
    if (presc) {
      setForm({ ...form, prescricao_id: prescId, paciente: presc.paciente, prontuario: presc.prontuario || "", setor: presc.setor || "" });
    }
  };

  // 1a: Check if user manually changed lote away from FEFO
  const isManualLoteChange = autoFefoLoteId && form.lote_id && form.lote_id !== autoFefoLoteId;
  const isAutoFefo = autoFefoLoteId && form.lote_id === autoFefoLoteId;

  // 1c: Intercept submit to check quantity
  const handleSubmitClick = () => {
    if (!form.medicamento_id || !form.lote_id || !form.quantidade) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (form.quantidade > 20) {
      setQtyAlertOpen(true);
    } else {
      setConfirmOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!form.medicamento_id || !form.lote_id || !form.quantidade) { toast.error("Preencha todos os campos obrigatórios"); return; }
    setConfirmOpen(false);
    setSubmitting(true);

    const { data: freshLote, error: loteErr } = await supabase.from("lotes").select("quantidade_atual").eq("id", form.lote_id).single();
    if (loteErr || !freshLote) { toast.error("Erro ao verificar estoque do lote"); setSubmitting(false); return; }
    if (freshLote.quantidade_atual < form.quantidade) { toast.error(`Estoque insuficiente! Disponível: ${freshLote.quantidade_atual} un.`); setSubmitting(false); return; }

    await supabase.from("lotes").update({ quantidade_atual: freshLote.quantidade_atual - form.quantidade }).eq("id", form.lote_id);
    await supabase.from("movimentacoes").insert({
      tipo: "dispensacao" as any, medicamento_id: form.medicamento_id, lote_id: form.lote_id,
      quantidade: form.quantidade, usuario_id: user?.id, paciente: form.paciente || null,
      prontuario: form.prontuario || null, setor: form.setor || null, observacao: form.observacao, prescricao_id: form.prescricao_id || null,
      filial_id: profile?.filial_id,
    });
    await log({ acao: "Dispensação", tabela: "movimentacoes", dados_novos: form });

    // 1b: Save paciente recorrente
    if (form.paciente.trim()) {
      savePacienteRecorrente({ nome: form.paciente, prontuario: form.prontuario, setor: form.setor });
    }

    toast.success("Dispensação registrada com sucesso!");

    // 1d: Smart reset — keep medicamento_id, paciente, setor
    setForm(prev => ({
      ...prev,
      quantidade: 0,
      observacao: "",
      prontuario: "",
      lote_id: prev.lote_id, // keep lote for same med
    }));
    setShowKeptMessage(true);
    setSubmitting(false);
    loadData();
  };

  // 1d: Clear all patient fields
  const clearPatientFields = () => {
    setForm(prev => ({ ...prev, paciente: "", prontuario: "", setor: "", medicamento_id: "", lote_id: "", prescricao_id: "" }));
    setAutoFefoLoteId("");
    setShowKeptMessage(false);
  };

  // Devolução helpers
  const devSelectedMed = meds.find(m => m.id === devForm.medicamento_id);
  const devSelectedLote = devSelectedMed?.lotes.find(l => l.id === devForm.lote_id);
  const devFilteredMeds = useMemo(() => {
    if (!devMedSearch) return meds;
    const s = devMedSearch.toLowerCase();
    return meds.filter(m => m.nome.toLowerCase().includes(s) || m.generico.toLowerCase().includes(s));
  }, [meds, devMedSearch]);

  const handleDevMedChange = (medId: string) => {
    setDevForm(prev => ({ ...prev, medicamento_id: medId, lote_id: "" }));
  };

  const handleDevolucao = async () => {
    if (!devForm.medicamento_id || !devForm.lote_id || !devForm.quantidade || !devForm.motivo) {
      toast.error("Preencha medicamento, lote, quantidade e motivo");
      return;
    }
    setDevSubmitting(true);

    // Update lote quantity (add back)
    const { data: freshLote, error: loteErr } = await supabase.from("lotes").select("quantidade_atual").eq("id", devForm.lote_id).single();
    if (loteErr || !freshLote) { toast.error("Erro ao verificar lote"); setDevSubmitting(false); return; }

    await supabase.from("lotes").update({ quantidade_atual: freshLote.quantidade_atual + devForm.quantidade }).eq("id", devForm.lote_id);

    // Insert movimentacao
    const obs = `Devolução: ${devForm.motivo}${devForm.observacao ? ` — ${devForm.observacao}` : ""}`;
    await supabase.from("movimentacoes").insert({
      tipo: "devolucao" as any,
      medicamento_id: devForm.medicamento_id,
      lote_id: devForm.lote_id,
      quantidade: devForm.quantidade,
      usuario_id: user?.id,
      paciente: devForm.paciente || null,
      prontuario: devForm.prontuario || null,
      observacao: obs,
      filial_id: profile?.filial_id,
    });

    await log({ acao: "Devolução de medicamento", tabela: "movimentacoes", dados_novos: { ...devForm, observacao: obs } });

    toast.success("Devolução registrada com sucesso!");
    setDevForm({ medicamento_id: "", lote_id: "", quantidade: 0, paciente: "", prontuario: "", motivo: "", observacao: "" });
    setDevSubmitting(false);
    loadData();
  };

  // Stats
  const todayStr = now.toISOString().slice(0, 10);
  const todayCount = history.filter(h => h.created_at?.slice(0, 10) === todayStr).length;
  const todayUnits = history.filter(h => h.created_at?.slice(0, 10) === todayStr).reduce((s: number, h: any) => s + h.quantidade, 0);
  const totalUnits = history.reduce((s: number, h: any) => s + h.quantidade, 0);
  const uniquePatients = new Set(history.filter(h => h.paciente).map(h => h.paciente)).size;

  const filteredHistory = history.filter(h => {
    const matchSearch = !histSearch || h.paciente?.toLowerCase().includes(histSearch.toLowerCase()) || h.prontuario?.toLowerCase().includes(histSearch.toLowerCase()) || h.medicamentos?.nome?.toLowerCase().includes(histSearch.toLowerCase());
    const d = h.created_at?.slice(0, 10);
    const matchFrom = !histDateFrom || d >= histDateFrom;
    const matchTo = !histDateTo || d <= histDateTo;
    return matchSearch && matchFrom && matchTo;
  });

  // Filter pacientes for combobox
  const filteredPacientes = useMemo(() => {
    if (!form.paciente) return pacientesRecorrentes;
    const s = form.paciente.toLowerCase();
    return pacientesRecorrentes.filter(p => p.nome.toLowerCase().includes(s));
  }, [form.paciente, pacientesRecorrentes]);

  if (loading) return (
    <AppLayout title="Dispensação">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Dispensação" subtitle="Registrar saída de medicamentos">
      <TooltipProvider>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Hoje", value: todayCount, sub: `${todayUnits} un.`, icon: ArrowUpCircle, color: "text-primary", bg: "bg-primary/10" },
            { label: "Total Registros", value: history.length, sub: `${totalUnits} un.`, icon: ClipboardList, color: "text-info", bg: "bg-info/10" },
            { label: "Pacientes", value: uniquePatients, sub: "atendidos", icon: User, color: "text-success", bg: "bg-success/10" },
            { label: "Prescrições Ativas", value: prescricoes.length, sub: "pendentes", icon: FileText, color: "text-warning", bg: "bg-warning/10" },
          ].map((kpi, i) => (
            <div key={kpi.label}
              className="rounded-xl border bg-card p-3.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", kpi.bg)}>
                  <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="dispensar" className="gap-1.5"><Syringe className="h-3.5 w-3.5" /> Nova Dispensação</TabsTrigger>
            <TabsTrigger value="devolucao" className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Devolução</TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5"><History className="h-3.5 w-3.5" /> Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="dispensar">
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <Card className="p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Syringe className="h-4 w-4 text-primary" />
                    Registrar Dispensação
                  </div>

                  {/* Prescrição */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      Prescrição
                      <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="text-xs max-w-[200px]">Vincular uma prescrição preenche automaticamente paciente, prontuário e setor.</TooltipContent></Tooltip>
                    </Label>
                    <Select value={form.prescricao_id || "none"} onValueChange={handlePrescricaoChange}>
                      <SelectTrigger className="bg-card"><SelectValue placeholder="Vincular prescrição" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem prescrição</SelectItem>
                        {prescricoes.map(p => <SelectItem key={p.id} value={p.id}>#{p.numero_receita} — {p.paciente}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Medicamento */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Medicamento *</Label>
                    <Select value={form.medicamento_id} onValueChange={handleMedChange}>
                      <SelectTrigger className="bg-card"><SelectValue placeholder="Selecionar medicamento" /></SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input placeholder="Buscar..." value={medSearch} onChange={e => setMedSearch(e.target.value)} className="h-8 text-xs" />
                        </div>
                        {filteredMeds.slice(0, 50).map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="flex items-center gap-2">
                              {m.nome} {m.concentracao}
                              {m.controlado && <ShieldAlert className="h-3 w-3 text-warning shrink-0" />}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Med info */}
                  {selectedMed && (
                    <div className="rounded-lg bg-muted/40 border border-border/50 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{selectedMed.nome}</span>
                        {selectedMed.controlado && <Badge variant="outline" className="text-[9px] border-warning/30 text-warning">Controlado</Badge>}
                      </div>
                      <p className="text-muted-foreground">{selectedMed.forma_farmaceutica} • {selectedMed.concentracao} • {selectedMed.lotes.length} lote(s)</p>
                    </div>
                  )}

                  {/* Lote */}
                  {selectedMed && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Lote * <span className="text-muted-foreground">(FEFO automático)</span></Label>
                      <Select value={form.lote_id} onValueChange={v => setForm({ ...form, lote_id: v })}>
                        <SelectTrigger className="bg-card"><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
                        <SelectContent>
                          {selectedMed.lotes.filter(l => new Date(l.validade) > now && l.quantidade_atual > 0).map((l, i) => {
                            const days = Math.ceil((new Date(l.validade).getTime() - now.getTime()) / 86400000);
                            return (
                              <SelectItem key={l.id} value={l.id}>
                                {i === 0 ? "⚡ " : ""}Lote {l.numero_lote} — {l.quantidade_atual} un. — Val: {new Date(l.validade).toLocaleDateString("pt-BR")}
                                {days <= 60 && days > 0 ? ` (${days}d)` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {/* 1a: FEFO auto chip */}
                      {isAutoFefo && selectedLote && (
                        <div className="flex items-center gap-1.5 text-success text-[11px] bg-success/10 rounded-md p-2">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Lote FEFO selecionado automaticamente — Val: {new Date(selectedLote.validade).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                      {/* 1a: Manual lote warning */}
                      {isManualLoteChange && (
                        <div className="flex items-center gap-1.5 text-warning text-[11px] bg-warning/10 rounded-md p-2">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Lote com validade posterior ao recomendado. Confirme se necessário.
                        </div>
                      )}
                      {selectedLote && (
                        <p className="text-[11px] text-muted-foreground">
                          Disponível: <span className="font-semibold">{selectedLote.quantidade_atual} un.</span> • Val: {new Date(selectedLote.validade).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantidade *</Label>
                      <Input type="number" min={1} max={selectedLote?.quantidade_atual} value={form.quantidade || ""} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} />
                      {form.quantidade > 0 && selectedLote && form.quantidade > selectedLote.quantidade_atual && (
                        <p className="text-[10px] text-destructive">Excede o estoque disponível!</p>
                      )}
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Setor</Label><Input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} placeholder="Ala A, B..." maxLength={100} /></div>

                    {/* 1b: Paciente Combobox */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Paciente</Label>
                        {form.paciente && (
                          <button onClick={clearPatientFields} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <Popover open={pacienteOpen} onOpenChange={setPacienteOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={pacienteOpen}
                            className="w-full justify-between h-10 text-xs font-normal bg-card"
                          >
                            {form.paciente || "Selecionar ou digitar..."}
                            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Buscar paciente..."
                              value={form.paciente}
                              onValueChange={v => setForm({ ...form, paciente: v })}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <span className="text-xs">Nenhum paciente recente. Digite o nome.</span>
                              </CommandEmpty>
                              {filteredPacientes.length > 0 && (
                                <CommandGroup heading="Pacientes recentes">
                                  {filteredPacientes.map((p, i) => (
                                    <CommandItem
                                      key={`${p.nome}-${i}`}
                                      value={p.nome}
                                      onSelect={() => {
                                        setForm({ ...form, paciente: p.nome, prontuario: p.prontuario, setor: p.setor });
                                        setPacienteOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-3 w-3", form.paciente === p.nome ? "opacity-100" : "opacity-0")} />
                                      <div>
                                        <p className="text-xs font-medium">{p.nome}</p>
                                        <p className="text-[10px] text-muted-foreground">Pront: {p.prontuario || "—"} • {p.setor || "—"}</p>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-1.5"><Label className="text-xs">Prontuário</Label><Input value={form.prontuario} onChange={e => setForm({ ...form, prontuario: e.target.value })} maxLength={50} /></div>
                  </div>

                  <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} maxLength={500} /></div>

                  <Button
                    className="w-full gradient-primary text-primary-foreground gap-2"
                    disabled={submitting || !form.medicamento_id || !form.lote_id || !form.quantidade}
                    onClick={handleSubmitClick}
                    size="lg"
                  >
                    {submitting ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :
                      <><Syringe className="h-4 w-4" /> Registrar Dispensação</>}
                  </Button>

                  {/* 1d: Kept message */}
                  {showKeptMessage && form.paciente && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2">
                      <span>Paciente e setor mantidos para próxima dispensação.</span>
                      <button onClick={clearPatientFields} className="text-xs text-primary hover:underline ml-2 shrink-0">Limpar</button>
                    </div>
                  )}
                </Card>
              </div>

              {/* Quick recent */}
              <div className="lg:col-span-3">
                <Card className="shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
                    <History className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Dispensações Recentes</h3>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{history.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3 border-b">
                    <div className="relative flex-1 min-w-[150px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Paciente, medicamento..." value={histSearch} onChange={e => setHistSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                    </div>
                    <Input type="date" value={histDateFrom} onChange={e => setHistDateFrom(e.target.value)} className="h-8 text-xs w-[130px]" />
                    <Input type="date" value={histDateTo} onChange={e => setHistDateTo(e.target.value)} className="h-8 text-xs w-[130px]" />
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs font-semibold">Data</TableHead>
                        <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
                        <TableHead className="text-xs font-semibold">Paciente</TableHead>
                        <TableHead className="text-xs font-semibold">Setor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          <ClipboardList className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                          <p className="text-sm">Nenhuma dispensação encontrada</p>
                        </TableCell></TableRow>
                      ) : filteredHistory.slice(0, 50).map(h => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(h.created_at).toLocaleDateString("pt-BR")} {new Date(h.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{h.medicamentos?.nome || "—"} <span className="text-xs text-muted-foreground">{h.medicamentos?.concentracao || ""}</span></TableCell>
                          <TableCell className="text-center font-semibold text-destructive">-{h.quantidade}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{h.paciente || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{h.setor || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Devolução Tab */}
          <TabsContent value="devolucao">
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <Card className="p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <RotateCcw className="h-4 w-4 text-accent-foreground" />
                    Registrar Devolução
                  </div>

                  {/* Paciente */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Paciente</Label>
                      <Input value={devForm.paciente} onChange={e => setDevForm({ ...devForm, paciente: e.target.value })} placeholder="Nome do paciente" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Prontuário</Label>
                      <Input value={devForm.prontuario} onChange={e => setDevForm({ ...devForm, prontuario: e.target.value })} />
                    </div>
                  </div>

                  {/* Medicamento */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Medicamento *</Label>
                    <Select value={devForm.medicamento_id} onValueChange={handleDevMedChange}>
                      <SelectTrigger className="bg-card"><SelectValue placeholder="Selecionar medicamento" /></SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input placeholder="Buscar..." value={devMedSearch} onChange={e => setDevMedSearch(e.target.value)} className="h-8 text-xs" />
                        </div>
                        {devFilteredMeds.slice(0, 50).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lote */}
                  {devSelectedMed && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Lote *</Label>
                      <Select value={devForm.lote_id} onValueChange={v => setDevForm({ ...devForm, lote_id: v })}>
                        <SelectTrigger className="bg-card"><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
                        <SelectContent>
                          {devSelectedMed.lotes.map(l => (
                            <SelectItem key={l.id} value={l.id}>
                              Lote {l.numero_lote} — {l.quantidade_atual} un. — Val: {new Date(l.validade).toLocaleDateString("pt-BR")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Quantidade */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantidade devolvida *</Label>
                    <Input type="number" min={1} value={devForm.quantidade || ""} onChange={e => setDevForm({ ...devForm, quantidade: Number(e.target.value) })} />
                  </div>

                  {/* Motivo */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Motivo da devolução *</Label>
                    <Select value={devForm.motivo} onValueChange={v => setDevForm({ ...devForm, motivo: v })}>
                      <SelectTrigger className="bg-card"><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
                      <SelectContent>
                        {MOTIVOS_DEVOLUCAO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Observação */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observação</Label>
                    <Textarea value={devForm.observacao} onChange={e => setDevForm({ ...devForm, observacao: e.target.value })} rows={2} maxLength={500} />
                  </div>

                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    disabled={devSubmitting || !devForm.medicamento_id || !devForm.lote_id || !devForm.quantidade || !devForm.motivo}
                    onClick={handleDevolucao}
                    size="lg"
                  >
                    {devSubmitting ? <div className="h-4 w-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> :
                      <><RotateCcw className="h-4 w-4" /> Registrar Devolução</>}
                  </Button>
                </Card>
              </div>

              {/* Devoluções recentes */}
              <div className="lg:col-span-3">
                <Card className="shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
                    <RotateCcw className="h-4 w-4 text-accent-foreground" />
                    <h3 className="text-sm font-semibold">Devoluções Recentes</h3>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{devHistory.length}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs font-semibold">Data</TableHead>
                        <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
                        <TableHead className="text-xs font-semibold">Paciente</TableHead>
                        <TableHead className="text-xs font-semibold">Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devHistory.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          <RotateCcw className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                          <p className="text-sm">Nenhuma devolução registrada</p>
                        </TableCell></TableRow>
                      ) : devHistory.slice(0, 50).map(h => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(h.created_at).toLocaleDateString("pt-BR")} {new Date(h.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{h.medicamentos?.nome || "—"}</TableCell>
                          <TableCell className="text-center font-semibold text-success">+{h.quantidade}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{h.paciente || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{h.observacao || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <Card className="shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Histórico Completo</h3>
              </div>
              <div className="flex flex-wrap gap-2 p-3 border-b">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar por paciente, prontuário ou medicamento..." value={histSearch} onChange={e => setHistSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="date" value={histDateFrom} onChange={e => setHistDateFrom(e.target.value)} className="h-8 text-xs w-[130px]" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="date" value={histDateTo} onChange={e => setHistDateTo(e.target.value)} className="h-8 text-xs w-[130px]" />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Data/Hora</TableHead>
                    <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Quantidade</TableHead>
                    <TableHead className="text-xs font-semibold">Paciente</TableHead>
                    <TableHead className="text-xs font-semibold">Prontuário</TableHead>
                    <TableHead className="text-xs font-semibold">Setor</TableHead>
                    <TableHead className="text-xs font-semibold">Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm font-medium">Nenhuma dispensação encontrada</p>
                    </TableCell></TableRow>
                  ) : filteredHistory.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(h.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{h.medicamentos?.nome || "—"} <span className="text-xs text-muted-foreground">{h.medicamentos?.concentracao || ""}</span></TableCell>
                      <TableCell className="text-center font-semibold text-destructive">-{h.quantidade}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{h.paciente || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{h.prontuario || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{h.setor || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{h.observacao || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirm Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Confirmar Dispensação</DialogTitle>
              <DialogDescription>Revise os dados antes de confirmar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Medicamento</span><span className="font-medium text-right max-w-[200px] truncate">{selectedMed?.nome} {selectedMed?.concentracao}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Lote</span><span className="font-mono">{selectedLote?.numero_lote}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Quantidade</span><span className="font-bold text-destructive">-{form.quantidade} un.</span></div>
                {form.paciente && <div className="flex justify-between"><span className="text-muted-foreground">Paciente</span><span className="font-medium">{form.paciente}</span></div>}
                {form.setor && <div className="flex justify-between"><span className="text-muted-foreground">Setor</span><span>{form.setor}</span></div>}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gradient-primary text-primary-foreground gap-2">
                  {submitting ? "Processando..." : <><CheckCircle2 className="h-4 w-4" /> Confirmar</>}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 1c: Quantity alert dialog */}
        <AlertDialog open={qtyAlertOpen} onOpenChange={setQtyAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Quantidade incomum
              </AlertDialogTitle>
              <AlertDialogDescription>
                Atenção: você está dispensando <strong>{form.quantidade}</strong> unidades de <strong>{selectedMed?.nome}</strong>. Confirmar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Corrigir</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setQtyAlertOpen(false); setConfirmOpen(true); }}>
                Confirmar mesmo assim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </AppLayout>
  );
};

export default Dispensacao;
