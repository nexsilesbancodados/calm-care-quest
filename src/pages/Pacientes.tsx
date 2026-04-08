import { useState, useEffect, useMemo } from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, User, FileText, Calendar, Pill, Clock, Download, ClipboardList,
  Plus, Edit2, BedDouble, Activity, X, Users, Heart, AlertTriangle, Phone, Eye
} from "lucide-react";

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
  prontuario: string;
  data_nascimento: string | null;
  data_entrada: string | null;
  sexo: string | null;
  leito: string | null;
  setor: string | null;
  diagnostico_cid: string | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
  ativo: boolean;
  filial_id: string | null;
  created_at: string;
}

interface PatientSummary {
  paciente: string;
  prontuario: string | null;
  total_dispensacoes: number;
  ultima_dispensacao: string;
  medicamentos_distintos: number;
}

interface PatientMovement {
  id: string;
  tipo: string;
  quantidade: number;
  created_at: string;
  setor: string | null;
  observacao: string;
  prescricao_id: string | null;
  medicamento_nome: string;
  medicamento_concentracao: string;
}

const EMPTY_FORM: Omit<Paciente, "id" | "created_at" | "filial_id" | "ativo"> = {
  nome: "", cpf: null, prontuario: "", data_nascimento: null, data_entrada: null, sexo: null,
  leito: null, setor: null, diagnostico_cid: null, responsavel_nome: null, responsavel_telefone: null,
};

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function calcAge(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return `${age} anos`;
}

const Pacientes = () => {
  const { profile } = useAuth();
  const { log } = useAudit();
  const [tab, setTab] = useState("cadastro");
  const [search, setSearch] = useState("");

  // Cadastro state
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loadingCadastro, setLoadingCadastro] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Histórico state
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [timeline, setTimeline] = useState<PatientMovement[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [detailPatient, setDetailPatient] = useState<Paciente | null>(null);
  const [detailMeds, setDetailMeds] = useState<PatientMovement[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCadastro = async () => {
    const { data } = await supabase.from("pacientes").select("*").order("nome");
    setPacientes((data as Paciente[]) || []);
    setLoadingCadastro(false);
  };

  const loadHistorico = async () => {
    const { data } = await supabase
      .from("movimentacoes")
      .select("paciente, prontuario, quantidade, created_at, medicamento_id")
      .in("tipo", ["dispensacao", "saida"])
      .not("paciente", "is", null)
      .order("created_at", { ascending: false });

    if (!data) { setLoadingHist(false); return; }

    const map = new Map<string, PatientSummary>();
    const medSets = new Map<string, Set<string>>();

    data.forEach((m: Record<string, unknown>) => {
      const key = (m.paciente as string)?.trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { paciente: key, prontuario: m.prontuario as string | null, total_dispensacoes: 0, ultima_dispensacao: m.created_at as string, medicamentos_distintos: 0 });
        medSets.set(key, new Set());
      }
      const p = map.get(key)!;
      p.total_dispensacoes++;
      if (m.medicamento_id) medSets.get(key)!.add(m.medicamento_id as string);
      if ((m.created_at as string) > p.ultima_dispensacao) p.ultima_dispensacao = m.created_at as string;
    });

    medSets.forEach((set, key) => { const p = map.get(key); if (p) p.medicamentos_distintos = set.size; });
    setPatients(Array.from(map.values()).sort((a, b) => b.ultima_dispensacao.localeCompare(a.ultima_dispensacao)));
    setLoadingHist(false);
  };

  useEffect(() => { loadCadastro(); loadHistorico(); }, [profile?.filial_id]);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.prontuario.trim()) { toast.error("Prontuário é obrigatório"); return; }
    setSaving(true);
    if (editId) {
      const { error } = await supabase.from("pacientes").update({
        nome: form.nome, cpf: form.cpf, prontuario: form.prontuario, data_nascimento: form.data_nascimento,
        data_entrada: form.data_entrada, sexo: form.sexo, leito: form.leito, setor: form.setor,
        diagnostico_cid: form.diagnostico_cid, responsavel_nome: form.responsavel_nome,
        responsavel_telefone: form.responsavel_telefone,
      }).eq("id", editId);
      if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
      await log({ acao: "Edição de paciente", tabela: "pacientes", registro_id: editId, dados_novos: form });
      toast.success("Paciente atualizado!");
    } else {
      const { error } = await supabase.from("pacientes").insert({
        nome: form.nome, cpf: form.cpf, prontuario: form.prontuario, data_nascimento: form.data_nascimento,
        data_entrada: form.data_entrada, sexo: form.sexo, leito: form.leito, setor: form.setor,
        diagnostico_cid: form.diagnostico_cid, responsavel_nome: form.responsavel_nome,
        responsavel_telefone: form.responsavel_telefone, filial_id: profile?.filial_id,
      });
      if (error) {
        if (error.code === "23505") toast.error("Prontuário já cadastrado nesta filial");
        else toast.error("Erro ao cadastrar");
        setSaving(false); return;
      }
      await log({ acao: "Cadastro de paciente", tabela: "pacientes", dados_novos: form });
      toast.success("Paciente cadastrado!");
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    loadCadastro();
  };

  const openEdit = (p: Paciente) => {
    setEditId(p.id);
    setForm({
      nome: p.nome, cpf: p.cpf, prontuario: p.prontuario, data_nascimento: p.data_nascimento,
      data_entrada: p.data_entrada, sexo: p.sexo, leito: p.leito, setor: p.setor,
      diagnostico_cid: p.diagnostico_cid, responsavel_nome: p.responsavel_nome,
      responsavel_telefone: p.responsavel_telefone,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const openDetail = async (p: Paciente) => {
    setDetailPatient(p);
    setDetailLoading(true);
    const { data } = await supabase
      .from("movimentacoes")
      .select("id, tipo, quantidade, created_at, setor, observacao, prescricao_id, medicamentos(nome, concentracao)")
      .or(`paciente.eq.${p.nome},prontuario.eq.${p.prontuario}`)
      .order("created_at", { ascending: false })
      .limit(200);

    setDetailMeds((data || []).map((m: Record<string, unknown>) => ({
      id: m.id as string, tipo: m.tipo as string, quantidade: m.quantidade as number,
      created_at: m.created_at as string, setor: m.setor as string | null,
      observacao: m.observacao as string, prescricao_id: m.prescricao_id as string | null,
      medicamento_nome: (m.medicamentos as Record<string, string>)?.nome || "—",
      medicamento_concentracao: (m.medicamentos as Record<string, string>)?.concentracao || "",
    })));
    setDetailLoading(false);
  };

  const openTimeline = async (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setTimelineLoading(true);
    const { data } = await supabase
      .from("movimentacoes")
      .select("id, tipo, quantidade, created_at, setor, observacao, prescricao_id, medicamentos(nome, concentracao)")
      .eq("paciente", patient.paciente)
      .order("created_at", { ascending: false }).limit(200);

    setTimeline((data || []).map((m: Record<string, unknown>) => ({
      id: m.id as string, tipo: m.tipo as string, quantidade: m.quantidade as number, created_at: m.created_at as string,
      setor: m.setor as string | null, observacao: m.observacao as string, prescricao_id: m.prescricao_id as string | null,
      medicamento_nome: (m.medicamentos as Record<string, string>)?.nome || "—",
      medicamento_concentracao: (m.medicamentos as Record<string, string>)?.concentracao || "",
    })));
    setTimelineLoading(false);
  };

  const exportCSV = () => {
    if (!selectedPatient || timeline.length === 0) return;
    const headers = ["Data", "Medicamento", "Concentração", "Quantidade", "Setor", "Observação"];
    const rows = timeline.map(t => [
      new Date(t.created_at).toLocaleString("pt-BR"), t.medicamento_nome, t.medicamento_concentracao,
      t.quantidade, t.setor || "—", t.observacao || "",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `paciente-${selectedPatient.paciente.replace(/\s+/g, "_")}.csv`;
    a.click();
  };

  const filteredCadastro = useMemo(() => pacientes.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.nome.toLowerCase().includes(s) || p.prontuario.toLowerCase().includes(s) || p.cpf?.includes(s);
  }), [pacientes, search]);

  const filteredHist = useMemo(() => patients.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.paciente.toLowerCase().includes(s) || p.prontuario?.toLowerCase().includes(s);
  }), [patients, search]);

  // KPIs
  const totalAtivos = pacientes.filter(p => p.ativo).length;
  const totalInternados = pacientes.filter(p => p.ativo && p.leito).length;
  const setores = new Set(pacientes.filter(p => p.setor).map(p => p.setor));

  return (
    <AppLayout title="Pacientes" subtitle="Cadastro e histórico clínico">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        {[
          { label: "Total Pacientes", value: pacientes.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Ativos", value: totalAtivos, icon: Heart, color: "text-success", bg: "bg-success/10" },
          { label: "Internados (c/ Leito)", value: totalInternados, icon: BedDouble, color: "text-info", bg: "bg-info/10" },
          { label: "Setores", value: setores.size, icon: Activity, color: "text-muted-foreground", bg: "bg-muted" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn("flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl shrink-0", kpi.bg)}>
                <kpi.icon className={cn("h-4 w-4 sm:h-[18px] sm:w-[18px]", kpi.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-base sm:text-lg font-bold leading-tight">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, prontuário ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="cadastro" className="gap-1.5"><User className="h-3.5 w-3.5" /> Cadastro</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Histórico</TabsTrigger>
        </TabsList>

        {/* Cadastro Tab */}
        <TabsContent value="cadastro">
          <div className="space-y-5">
            {/* Botão novo / formulário inline */}
            {!showForm ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{filteredCadastro.length} paciente(s)</p>
                <Button size="sm" className="gap-1.5" onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }}>
                  <Plus className="h-3.5 w-3.5" /> Novo Paciente
                </Button>
              </div>
            ) : (
              <Card className="p-5 shadow-sm border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    {editId ? "Editar Paciente" : "Novo Paciente"}
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelForm} className="text-xs gap-1 text-muted-foreground">
                    <X className="h-3 w-3" /> Cancelar
                  </Button>
                </div>

                {/* Dados pessoais */}
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dados Pessoais</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                        <Label className="text-xs">Nome Completo *</Label>
                        <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do paciente" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Prontuário *</Label>
                        <Input value={form.prontuario} onChange={e => setForm({ ...form, prontuario: e.target.value })} className="font-mono" placeholder="0000000" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">CPF</Label>
                        <Input
                          value={form.cpf || ""}
                          onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) || null })}
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Data de Nascimento</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-10",
                                !form.data_nascimento && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4 shrink-0" />
                              {form.data_nascimento
                                ? format(parse(form.data_nascimento, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                                : "dd/mm/aaaa"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarWidget
                              mode="single"
                              selected={form.data_nascimento ? parse(form.data_nascimento, "yyyy-MM-dd", new Date()) : undefined}
                              onSelect={(date) => setForm({ ...form, data_nascimento: date ? format(date, "yyyy-MM-dd") : null })}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                              locale={ptBR}
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        {form.data_nascimento && (
                          <p className="text-[10px] text-muted-foreground">{calcAge(form.data_nascimento)}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Sexo</Label>
                        <Select value={form.sexo || "none"} onValueChange={v => setForm({ ...form, sexo: v === "none" ? null : v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Feminino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Internação */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Internação</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Data de Entrada</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-10",
                                !form.data_entrada && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4 shrink-0" />
                              {form.data_entrada
                                ? format(parse(form.data_entrada, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                                : "dd/mm/aaaa"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarWidget
                              mode="single"
                              selected={form.data_entrada ? parse(form.data_entrada, "yyyy-MM-dd", new Date()) : undefined}
                              onSelect={(date) => setForm({ ...form, data_entrada: date ? format(date, "yyyy-MM-dd") : null })}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                              locale={ptBR}
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Leito</Label>
                        <Input value={form.leito || ""} onChange={e => setForm({ ...form, leito: e.target.value || null })} placeholder="Ex: 12-A" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Setor</Label>
                        <Input value={form.setor || ""} onChange={e => setForm({ ...form, setor: e.target.value || null })} placeholder="Ala A, UTI..." />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">CID (Diagnóstico)</Label>
                        <Input value={form.diagnostico_cid || ""} onChange={e => setForm({ ...form, diagnostico_cid: e.target.value || null })} placeholder="F20.0" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Responsável */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Responsável Legal</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome do Responsável</Label>
                        <Input value={form.responsavel_nome || ""} onChange={e => setForm({ ...form, responsavel_nome: e.target.value || null })} placeholder="Nome completo" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Telefone do Responsável</Label>
                        <Input
                          value={form.responsavel_telefone || ""}
                          onChange={e => setForm({ ...form, responsavel_telefone: formatPhone(e.target.value) || null })}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button variant="outline" onClick={cancelForm}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                      {saving ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :
                        editId ? "Salvar Alterações" : <><Plus className="h-3.5 w-3.5" /> Cadastrar</>}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Tabela de pacientes */}
            {loadingCadastro ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filteredCadastro.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <User className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum paciente cadastrado</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Paciente" para começar</p>
              </div>
            ) : (
              <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold">Nome</TableHead>
                      <TableHead className="text-xs font-semibold">Prontuário</TableHead>
                      <TableHead className="text-xs font-semibold hidden sm:table-cell">CPF</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Idade</TableHead>
                      <TableHead className="text-xs font-semibold">Leito</TableHead>
                      <TableHead className="text-xs font-semibold">Setor</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">CID</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">Responsável</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCadastro.map(p => (
                      <TableRow key={p.id} className="hover:bg-accent/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.nome}</p>
                              {p.sexo && <p className="text-[10px] text-muted-foreground">{p.sexo === "M" ? "Masculino" : p.sexo === "F" ? "Feminino" : p.sexo}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{p.prontuario}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{p.cpf || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{calcAge(p.data_nascimento) || "—"}</TableCell>
                        <TableCell>
                          {p.leito ? <Badge variant="outline" className="text-[10px] gap-0.5"><BedDouble className="h-2.5 w-2.5" />{p.leito}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.setor || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{p.diagnostico_cid || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {p.responsavel_nome ? (
                            <div className="text-xs text-muted-foreground">
                              <p>{p.responsavel_nome}</p>
                              {p.responsavel_telefone && (
                                <p className="flex items-center gap-1 text-[10px]"><Phone className="h-2.5 w-2.5" />{p.responsavel_telefone}</p>
                              )}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(p)} title="Ver prontuário">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)} title="Editar">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Histórico Tab */}
        <TabsContent value="historico">
          {loadingHist ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : filteredHist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <User className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum paciente encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHist.map(p => (
                <Card key={p.paciente} className="p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => openTimeline(p)}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.paciente}</p>
                      {p.prontuario && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> {p.prontuario}</p>}
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 text-center shrink-0">
                      <div><p className="text-lg font-bold text-primary">{p.total_dispensacoes}</p><p className="text-[10px] text-muted-foreground">Dispensações</p></div>
                      <div><p className="text-lg font-bold">{p.medicamentos_distintos}</p><p className="text-[10px] text-muted-foreground">Medicamentos</p></div>
                      <div className="hidden sm:block">
                        <p className="text-[11px] font-medium text-muted-foreground">{new Date(p.ultima_dispensacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                        <p className="text-[10px] text-muted-foreground">Última</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Timeline Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={open => !open && setSelectedPatient(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {selectedPatient?.paciente}
              {selectedPatient?.prontuario && <Badge variant="outline" className="text-[10px] ml-2">Pront. {selectedPatient.prontuario}</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">{timeline.length} registros</p>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
          {timelineLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : (
            <ScrollArea className="max-h-[55vh] pr-2">
              <div className="relative pl-6 space-y-0">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                {timeline.map(t => (
                  <div key={t.id} className="relative pb-4">
                    <div className={cn("absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-background", t.tipo === "dispensacao" ? "bg-info" : "bg-warning")} />
                    <div className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Pill className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-medium">{t.medicamento_nome}</span>
                          <span className="text-xs text-muted-foreground">{t.medicamento_concentracao}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{t.quantidade} un.</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {t.setor && <span>• {t.setor}</span>}
                        {t.prescricao_id && <span>• <ClipboardList className="h-3 w-3 inline" /> Rx {t.prescricao_id.substring(0, 8)}</span>}
                      </div>
                      {t.observacao && <p className="text-[11px] text-muted-foreground mt-1 italic">{t.observacao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Patient Detail / Prontuário Dialog */}
      <Dialog open={!!detailPatient} onOpenChange={open => !open && setDetailPatient(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Prontuário — {detailPatient?.nome}
            </DialogTitle>
          </DialogHeader>

          {detailPatient && (
            <div className="space-y-4">
              {/* Patient Info Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Prontuário</p>
                  <p className="font-mono font-semibold">{detailPatient.prontuario}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">CPF</p>
                  <p className="font-medium">{detailPatient.cpf || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Sexo</p>
                  <p className="font-medium">{detailPatient.sexo === "M" ? "Masculino" : detailPatient.sexo === "F" ? "Feminino" : detailPatient.sexo || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Data de Nascimento</p>
                  <p className="font-medium">
                    {detailPatient.data_nascimento
                      ? `${format(parse(detailPatient.data_nascimento, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")} (${calcAge(detailPatient.data_nascimento)})`
                      : "—"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Data de Entrada</p>
                  <p className="font-medium">
                    {detailPatient.data_entrada
                      ? format(parse(detailPatient.data_entrada, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                      : "—"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Diagnóstico (CID)</p>
                  <p className="font-medium">{detailPatient.diagnostico_cid || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Leito</p>
                  <p className="font-medium">{detailPatient.leito || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Setor</p>
                  <p className="font-medium">{detailPatient.setor || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Responsável</p>
                  <p className="font-medium">
                    {detailPatient.responsavel_nome || "—"}
                    {detailPatient.responsavel_telefone && (
                      <span className="text-muted-foreground ml-1">({detailPatient.responsavel_telefone})</span>
                    )}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Medications dispensed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5" /> Medicações Dispensadas
                  </p>
                  <Badge variant="outline" className="text-[10px]">{detailMeds.length} registros</Badge>
                </div>

                {detailLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                ) : detailMeds.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma medicação dispensada</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[40vh] pr-2">
                    <div className="space-y-2">
                      {detailMeds.map(t => (
                        <div key={t.id} className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Pill className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-sm font-medium">{t.medicamento_nome}</span>
                              {t.medicamento_concentracao && <span className="text-xs text-muted-foreground">{t.medicamento_concentracao}</span>}
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">{t.quantidade} un.</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(t.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {t.setor && <span>• {t.setor}</span>}
                            <Badge variant="secondary" className="text-[9px] h-4">{t.tipo}</Badge>
                          </div>
                          {t.observacao && <p className="text-[11px] text-muted-foreground mt-1 italic">{t.observacao}</p>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Pacientes;