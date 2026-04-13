import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { format, parse, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateMaskInput } from "@/components/DateMaskInput";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { supabase } from "@/integrations/supabase/client";
import { maskCpf } from "@/lib/security/pii";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, User, FileText, Calendar, Pill, Clock, Download, ClipboardList,
  Plus, Edit2, BedDouble, Activity, X, Users, Heart, Phone,
  Eye, ArrowLeft, Hash, MapPin, Stethoscope, ShieldCheck, TrendingUp, Package
} from "lucide-react";

/* ─── Types ─── */
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

interface PatientPrescription {
  id: string;
  numero_receita: string;
  medico: string;
  crm: string | null;
  data_prescricao: string;
  status: string | null;
  observacao: string | null;
}

interface PatientSummary {
  paciente: string;
  prontuario: string | null;
  total_dispensacoes: number;
  ultima_dispensacao: string;
  medicamentos_distintos: number;
}

type FormData = Omit<Paciente, "id" | "created_at" | "filial_id" | "ativo">;

const EMPTY_FORM: FormData = {
  nome: "", cpf: null, prontuario: "", data_nascimento: null, data_entrada: null, sexo: null,
  leito: null, setor: null, diagnostico_cid: null, responsavel_nome: null, responsavel_telefone: null,
};

/* ─── Helpers ─── */
function formatCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function calcAge(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const b = new Date(dateStr), now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return `${age} anos`;
}

function calcDaysAdmitted(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return differenceInCalendarDays(new Date(), new Date(dateStr));
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "—";
  try { return format(parse(dateStr, "yyyy-MM-dd", new Date()), "dd/MM/yyyy"); } catch { return "—"; }
}

function mapMovement(m: Record<string, unknown>): PatientMovement {
  return {
    id: m.id as string, tipo: m.tipo as string, quantidade: m.quantidade as number,
    created_at: m.created_at as string, setor: m.setor as string | null,
    observacao: m.observacao as string, prescricao_id: m.prescricao_id as string | null,
    medicamento_nome: (m.medicamentos as Record<string, string>)?.nome || "—",
    medicamento_concentracao: (m.medicamentos as Record<string, string>)?.concentracao || "",
  };
}

const statusColors: Record<string, string> = {
  ativa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  parcialmente_dispensada: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  totalmente_dispensada: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  vencida: "bg-red-500/15 text-red-700 dark:text-red-400",
  cancelada: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  ativa: "Ativa", parcialmente_dispensada: "Parcial",
  totalmente_dispensada: "Dispensada", vencida: "Vencida", cancelada: "Cancelada",
};

/* ─── Memoized sub-components ─── */
const InfoField = memo(({ label, value, icon: Icon, mono }: { label: string; value: string; icon?: React.ElementType; mono?: boolean }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      <p className={cn("text-sm font-medium", mono && "font-mono")}>{value || "—"}</p>
    </div>
  </div>
));
InfoField.displayName = "InfoField";

const KpiCard = memo(({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: React.ElementType; color: string; bg: string }) => (
  <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={cn("flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl shrink-0", bg)}>
        <Icon className={cn("h-4 w-4 sm:h-[18px] sm:w-[18px]", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  </div>
));
KpiCard.displayName = "KpiCard";

const MedItem = memo(({ t }: { t: PatientMovement }) => (
  <div className="rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn("h-2 w-2 rounded-full shrink-0",
          t.tipo === "dispensacao" ? "bg-info" : t.tipo === "devolucao" ? "bg-amber-500" : "bg-muted-foreground"
        )} />
        <Pill className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-sm font-medium truncate">{t.medicamento_nome}</span>
        {t.medicamento_concentracao && <span className="text-xs text-muted-foreground shrink-0">{t.medicamento_concentracao}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="text-[9px] h-4 capitalize">{t.tipo}</Badge>
        <Badge variant="outline" className="text-[10px]">{t.quantidade} un.</Badge>
      </div>
    </div>
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pl-5">
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {new Date(t.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </span>
      {t.setor && <span>• {t.setor}</span>}
      {t.prescricao_id && <span className="flex items-center gap-1">• <ClipboardList className="h-3 w-3" /> Rx {t.prescricao_id.substring(0, 8)}</span>}
    </div>
    {t.observacao && <p className="text-[11px] text-muted-foreground mt-1 italic pl-5">{t.observacao}</p>}
  </div>
));
MedItem.displayName = "MedItem";

/* ════════════════════════════════════════════════════════════════════ */
const Pacientes = () => {
  const { profile } = useAuth();
  const { log } = useAudit();
  const [search, setSearch] = useState("");

  /* ─ List state ─ */
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loadingCadastro, setLoadingCadastro] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  /* ─ Prontuário (detail) state ─ */
  const [detailPatient, setDetailPatient] = useState<Paciente | null>(null);
  const [detailMeds, setDetailMeds] = useState<PatientMovement[]>([]);
  const [detailPrescriptions, setDetailPrescriptions] = useState<PatientPrescription[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"resumo" | "medicacoes" | "prescricoes">("resumo");

  /* ─ Histórico state ─ */
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [histLoaded, setHistLoaded] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [timeline, setTimeline] = useState<PatientMovement[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [tab, setTab] = useState("cadastro");

  /* ─ Load pacientes (lightweight) ─ */
  const loadCadastro = useCallback(async () => {
    setLoadingCadastro(true);
    const { data } = await supabase
      .from("pacientes")
      .select("id,nome,cpf,prontuario,data_nascimento,data_entrada,sexo,leito,setor,diagnostico_cid,responsavel_nome,responsavel_telefone,ativo,filial_id,created_at")
      .order("nome");
    setPacientes((data as Paciente[]) || []);
    setLoadingCadastro(false);
  }, []);

  /* ─ Load histórico ONLY when tab activated ─ */
  const loadHistorico = useCallback(async () => {
    if (histLoaded) return;
    setLoadingHist(true);
    const { data } = await supabase
      .from("movimentacoes")
      .select("paciente, prontuario, quantidade, created_at, medicamento_id")
      .in("tipo", ["dispensacao", "saida"])
      .not("paciente", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!data) { setLoadingHist(false); setHistLoaded(true); return; }
    const map = new Map<string, PatientSummary>();
    const medSets = new Map<string, Set<string>>();
    for (const m of data) {
      const key = (m.paciente as string)?.trim();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, { paciente: key, prontuario: m.prontuario as string | null, total_dispensacoes: 0, ultima_dispensacao: m.created_at as string, medicamentos_distintos: 0 });
        medSets.set(key, new Set());
      }
      const p = map.get(key)!;
      p.total_dispensacoes++;
      if (m.medicamento_id) medSets.get(key)!.add(m.medicamento_id as string);
      if ((m.created_at as string) > p.ultima_dispensacao) p.ultima_dispensacao = m.created_at as string;
    }
    medSets.forEach((set, key) => { const p = map.get(key); if (p) p.medicamentos_distintos = set.size; });
    setPatients(Array.from(map.values()).sort((a, b) => b.ultima_dispensacao.localeCompare(a.ultima_dispensacao)));
    setLoadingHist(false);
    setHistLoaded(true);
  }, [histLoaded]);

  useEffect(() => { loadCadastro(); }, [loadCadastro, profile?.filial_id]);

  /* Lazy-load histórico when tab switches */
  useEffect(() => {
    if (tab === "historico") loadHistorico();
  }, [tab, loadHistorico]);

  /* ─ CRUD ─ */
  const handleSave = useCallback(async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.prontuario.trim()) { toast.error("Prontuário é obrigatório"); return; }
    setSaving(true);
    const payload = {
      nome: form.nome, cpf: form.cpf, prontuario: form.prontuario, data_nascimento: form.data_nascimento,
      data_entrada: form.data_entrada, sexo: form.sexo, leito: form.leito, setor: form.setor,
      diagnostico_cid: form.diagnostico_cid, responsavel_nome: form.responsavel_nome,
      responsavel_telefone: form.responsavel_telefone,
    };
    if (editId) {
      const { error } = await supabase.from("pacientes").update(payload).eq("id", editId);
      if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
      await log({ acao: "Edição de paciente", tabela: "pacientes", registro_id: editId, dados_novos: form });
      toast.success("Paciente atualizado!");
    } else {
      const { error } = await supabase.from("pacientes").insert({ ...payload, filial_id: profile?.filial_id });
      if (error) {
        toast.error(error.code === "23505" ? "Prontuário já cadastrado nesta filial" : "Erro ao cadastrar");
        setSaving(false); return;
      }
      await log({ acao: "Cadastro de paciente", tabela: "pacientes", dados_novos: form });
      toast.success("Paciente cadastrado!");
    }
    setSaving(false); setShowForm(false); setEditId(null); setForm(EMPTY_FORM);
    loadCadastro();
  }, [form, editId, profile?.filial_id, log, loadCadastro]);

  const openEdit = useCallback((p: Paciente) => {
    setEditId(p.id);
    setForm({
      nome: p.nome, cpf: p.cpf, prontuario: p.prontuario, data_nascimento: p.data_nascimento,
      data_entrada: p.data_entrada, sexo: p.sexo, leito: p.leito, setor: p.setor,
      diagnostico_cid: p.diagnostico_cid, responsavel_nome: p.responsavel_nome,
      responsavel_telefone: p.responsavel_telefone,
    });
    setShowForm(true); setDetailPatient(null);
  }, []);

  const cancelForm = useCallback(() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }, []);

  /* ─ Prontuário detail ─ */
  const openDetail = useCallback(async (p: Paciente) => {
    setDetailPatient(p); setDetailTab("resumo"); setDetailLoading(true); setShowForm(false);
    const [medsResult, prescResult] = await Promise.all([
      supabase.from("movimentacoes")
        .select("id, tipo, quantidade, created_at, setor, observacao, prescricao_id, medicamentos(nome, concentracao)")
        .or(`paciente.eq.${p.nome},prontuario.eq.${p.prontuario}`)
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("prescricoes")
        .select("id, numero_receita, medico, crm, data_prescricao, status, observacao")
        .or(`paciente.eq.${p.nome},prontuario.eq.${p.prontuario}`)
        .order("data_prescricao", { ascending: false }).limit(50),
    ]);
    setDetailMeds((medsResult.data || []).map(mapMovement));
    setDetailPrescriptions((prescResult.data || []).map((r: Record<string, unknown>) => ({
      id: r.id as string, numero_receita: r.numero_receita as string,
      medico: r.medico as string, crm: r.crm as string | null,
      data_prescricao: r.data_prescricao as string, status: r.status as string | null,
      observacao: r.observacao as string | null,
    })));
    setDetailLoading(false);
  }, []);

  const closeDetail = useCallback(() => setDetailPatient(null), []);

  /* ─ Histórico timeline ─ */
  const openTimeline = useCallback(async (patient: PatientSummary) => {
    setSelectedPatient(patient); setTimelineLoading(true);
    const { data } = await supabase.from("movimentacoes")
      .select("id, tipo, quantidade, created_at, setor, observacao, prescricao_id, medicamentos(nome, concentracao)")
      .eq("paciente", patient.paciente)
      .order("created_at", { ascending: false }).limit(100);
    setTimeline((data || []).map(mapMovement));
    setTimelineLoading(false);
  }, []);

  /* ─ CSV Export ─ */
  const exportDetailCSV = useCallback(() => {
    if (!detailPatient || !detailMeds.length) return;
    const rows = detailMeds.map(t => [
      new Date(t.created_at).toLocaleString("pt-BR"), t.tipo, t.medicamento_nome,
      t.medicamento_concentracao, t.quantidade, t.setor || "—", t.observacao || "",
    ]);
    const csv = ["Data;Tipo;Medicamento;Concentração;Quantidade;Setor;Observação", ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `prontuario-${detailPatient.prontuario}.csv`; a.click();
  }, [detailPatient, detailMeds]);

  const exportTimelineCSV = useCallback(() => {
    if (!selectedPatient || !timeline.length) return;
    const rows = timeline.map(t => [
      new Date(t.created_at).toLocaleString("pt-BR"), t.medicamento_nome, t.medicamento_concentracao,
      t.quantidade, t.setor || "—", t.observacao || "",
    ]);
    const csv = ["Data;Medicamento;Concentração;Quantidade;Setor;Observação", ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `paciente-${selectedPatient.paciente.replace(/\s+/g, "_")}.csv`; a.click();
  }, [selectedPatient, timeline]);

  /* ─ Derived data (memoized) ─ */
  const filteredCadastro = useMemo(() => {
    if (!search) return pacientes;
    const s = search.toLowerCase();
    return pacientes.filter(p => p.nome.toLowerCase().includes(s) || p.prontuario.toLowerCase().includes(s) || p.cpf?.includes(s));
  }, [pacientes, search]);

  const filteredHist = useMemo(() => {
    if (!search) return patients;
    const s = search.toLowerCase();
    return patients.filter(p => p.paciente.toLowerCase().includes(s) || p.prontuario?.toLowerCase().includes(s));
  }, [patients, search]);

  const { totalAtivos, totalInternados, setoresCount } = useMemo(() => ({
    totalAtivos: pacientes.filter(p => p.ativo).length,
    totalInternados: pacientes.filter(p => p.ativo && p.leito).length,
    setoresCount: new Set(pacientes.filter(p => p.setor).map(p => p.setor)).size,
  }), [pacientes]);

  const uniqueMeds = useMemo(() => {
    if (!detailMeds.length) return [];
    const map = new Map<string, { nome: string; concentracao: string; totalQty: number; count: number }>();
    for (const m of detailMeds) {
      const key = `${m.medicamento_nome}|${m.medicamento_concentracao}`;
      const e = map.get(key) || { nome: m.medicamento_nome, concentracao: m.medicamento_concentracao, totalQty: 0, count: 0 };
      e.totalQty += m.quantidade; e.count++;
      map.set(key, e);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [detailMeds]);

  const medsGroupedByDate = useMemo(() => {
    if (!detailMeds.length) return [];
    const map = new Map<string, PatientMovement[]>();
    for (const m of detailMeds) {
      const dateKey = new Date(m.created_at).toLocaleDateString("pt-BR");
      const arr = map.get(dateKey) || [];
      arr.push(m); map.set(dateKey, arr);
    }
    return Array.from(map.entries());
  }, [detailMeds]);

  const totalUnitsDispensed = useMemo(() => detailMeds.reduce((s, m) => s + m.quantidade, 0), [detailMeds]);
  const daysAdmitted = detailPatient ? calcDaysAdmitted(detailPatient.data_entrada) : null;

  /* ═══════════════════════════════════════════════════════════════ */
  /*  PRONTUÁRIO FULL-PAGE VIEW                                     */
  /* ═══════════════════════════════════════════════════════════════ */
  if (detailPatient) {
    return (
      <AppLayout title="Prontuário" subtitle={detailPatient.nome}>
        <div className="flex items-center justify-between mb-5">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={closeDetail}>
            <ArrowLeft className="h-4 w-4" /> Voltar à lista
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openEdit(detailPatient)}>
              <Edit2 className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportDetailCSV} disabled={!detailMeds.length}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* Patient Header */}
        <Card className="p-5 sm:p-6 mb-5 border-primary/10 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold truncate">{detailPatient.nome}</h2>
                <Badge className={detailPatient.ativo ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px]" : "text-[10px]"} variant={detailPatient.ativo ? "default" : "secondary"}>
                  {detailPatient.ativo ? "Ativo" : "Inativo"}
                </Badge>
                {detailPatient.sexo && <Badge variant="outline" className="text-[10px]">{detailPatient.sexo === "M" ? "Masculino" : detailPatient.sexo === "F" ? "Feminino" : detailPatient.sexo}</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Pront. <span className="font-mono font-semibold text-foreground">{detailPatient.prontuario}</span></span>
                {detailPatient.cpf && <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {detailPatient.cpf}</span>}
                {detailPatient.data_nascimento && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDateBR(detailPatient.data_nascimento)} ({calcAge(detailPatient.data_nascimento)})</span>}
                {detailPatient.diagnostico_cid && <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> CID: <span className="font-semibold text-foreground">{detailPatient.diagnostico_cid}</span></span>}
              </div>
            </div>
          </div>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mb-5">
          <KpiCard label="Dias Internado" value={daysAdmitted ?? "—"} icon={Clock} color="text-info" bg="bg-info/10" />
          <KpiCard label="Total Dispensações" value={detailMeds.length} icon={Pill} color="text-primary" bg="bg-primary/10" />
          <KpiCard label="Unidades Dispensadas" value={totalUnitsDispensed} icon={Package} color="text-amber-600 dark:text-amber-400" bg="bg-amber-500/10" />
          <KpiCard label="Medicamentos Únicos" value={uniqueMeds.length} icon={TrendingUp} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
          <KpiCard label="Prescrições" value={detailPrescriptions.length} icon={ClipboardList} color="text-violet-600 dark:text-violet-400" bg="bg-violet-500/10" />
        </div>

        {/* Detail Tabs */}
        <Tabs value={detailTab} onValueChange={v => setDetailTab(v as typeof detailTab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="resumo" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Resumo</TabsTrigger>
            <TabsTrigger value="medicacoes" className="gap-1.5 text-xs"><Pill className="h-3.5 w-3.5" /> Medicações ({detailMeds.length})</TabsTrigger>
            <TabsTrigger value="prescricoes" className="gap-1.5 text-xs"><ClipboardList className="h-3.5 w-3.5" /> Prescrições ({detailPrescriptions.length})</TabsTrigger>
          </TabsList>

          {/* Resumo */}
          <TabsContent value="resumo">
            {detailLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-5">
                <Card className="p-5 shadow-sm">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Dados Pessoais</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <InfoField label="Nome Completo" value={detailPatient.nome} icon={User} />
                    <InfoField label="Prontuário" value={detailPatient.prontuario} icon={Hash} mono />
                    <InfoField label="CPF" value={detailPatient.cpf || "—"} icon={ShieldCheck} />
                    <InfoField label="Data de Nascimento" value={detailPatient.data_nascimento ? `${formatDateBR(detailPatient.data_nascimento)} (${calcAge(detailPatient.data_nascimento)})` : "—"} icon={Calendar} />
                    <InfoField label="Sexo" value={detailPatient.sexo === "M" ? "Masculino" : detailPatient.sexo === "F" ? "Feminino" : detailPatient.sexo || "—"} />
                  </div>
                </Card>
                <Card className="p-5 shadow-sm">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" /> Internação</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <InfoField label="Data de Entrada" value={formatDateBR(detailPatient.data_entrada)} icon={Calendar} />
                    <InfoField label="Dias Internado" value={daysAdmitted !== null ? `${daysAdmitted} dias` : "—"} icon={Clock} />
                    <InfoField label="Leito" value={detailPatient.leito || "—"} icon={BedDouble} />
                    <InfoField label="Setor" value={detailPatient.setor || "—"} icon={MapPin} />
                    <InfoField label="Diagnóstico (CID)" value={detailPatient.diagnostico_cid || "—"} icon={Stethoscope} />
                  </div>
                </Card>
                <Card className="p-5 shadow-sm">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Responsável Legal</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoField label="Nome" value={detailPatient.responsavel_nome || "—"} icon={User} />
                    <InfoField label="Telefone" value={detailPatient.responsavel_telefone || "—"} icon={Phone} />
                  </div>
                </Card>
                {uniqueMeds.length > 0 && (
                  <Card className="p-5 shadow-sm">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5"><Pill className="h-3.5 w-3.5" /> Medicamentos em Uso (Top {Math.min(uniqueMeds.length, 10)})</p>
                    <div className="space-y-3">
                      {uniqueMeds.slice(0, 10).map((med, i) => {
                        const pct = Math.round((med.count / (uniqueMeds[0]?.count || 1)) * 100);
                        return (
                          <div key={`${med.nome}-${med.concentracao}`} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono text-muted-foreground w-4 text-right">{i + 1}.</span>
                                <span className="font-medium truncate">{med.nome}</span>
                                {med.concentracao && <span className="text-muted-foreground shrink-0">{med.concentracao}</span>}
                              </div>
                              <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                                <span>{med.count}× disp.</span>
                                <span className="font-semibold text-foreground">{med.totalQty} un.</span>
                              </div>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Medicações */}
          <TabsContent value="medicacoes">
            {detailLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : !detailMeds.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Pill className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma medicação dispensada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {medsGroupedByDate.map(([dateLabel, items]) => (
                  <div key={dateLabel}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 items-center justify-center rounded-md bg-muted px-2">
                        <p className="text-[11px] font-semibold text-muted-foreground">{dateLabel}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px]">{items.length}</Badge>
                      <Separator className="flex-1" />
                    </div>
                    <div className="space-y-2 ml-1">
                      {items.map(t => <MedItem key={t.id} t={t} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Prescrições */}
          <TabsContent value="prescricoes">
            {detailLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : !detailPrescriptions.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma prescrição vinculada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {detailPrescriptions.map(rx => (
                  <Card key={rx.id} className="p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                        <ClipboardList className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">Receita {rx.numero_receita}</p>
                          <Badge className={cn("text-[10px]", statusColors[rx.status || ""] || "bg-muted text-muted-foreground")}>
                            {statusLabels[rx.status || ""] || rx.status || "—"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> Dr(a). {rx.medico}</span>
                          {rx.crm && <span>CRM {rx.crm}</span>}
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDateBR(rx.data_prescricao)}</span>
                        </div>
                        {rx.observacao && <p className="text-[11px] text-muted-foreground mt-1.5 italic">{rx.observacao}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </AppLayout>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /*  MAIN LIST VIEW                                                */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <AppLayout title="Pacientes" subtitle="Cadastro e histórico clínico">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <KpiCard label="Total Pacientes" value={pacientes.length} icon={Users} color="text-primary" bg="bg-primary/10" />
        <KpiCard label="Ativos" value={totalAtivos} icon={Heart} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
        <KpiCard label="Internados (c/ Leito)" value={totalInternados} icon={BedDouble} color="text-info" bg="bg-info/10" />
        <KpiCard label="Setores" value={setoresCount} icon={Activity} color="text-muted-foreground" bg="bg-muted" />
      </div>

      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, prontuário ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="cadastro" className="gap-1.5"><User className="h-3.5 w-3.5" /> Cadastro</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro">
          <div className="space-y-5">
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
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><User className="h-3.5 w-3.5 text-primary" /></div>
                    {editId ? "Editar Paciente" : "Novo Paciente"}
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelForm} className="text-xs gap-1 text-muted-foreground"><X className="h-3 w-3" /> Cancelar</Button>
                </div>
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
                        <Input value={form.cpf || ""} onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) || null })} placeholder="000.000.000-00" maxLength={14} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Data de Nascimento</Label>
                        <DateMaskInput value={form.data_nascimento} onChange={v => setForm({ ...form, data_nascimento: v })} showAge />
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
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Internação</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Data de Entrada</Label>
                        <DateMaskInput value={form.data_entrada} onChange={v => setForm({ ...form, data_entrada: v })} />
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs">Leito</Label><Input value={form.leito || ""} onChange={e => setForm({ ...form, leito: e.target.value || null })} placeholder="Ex: 12-A" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Setor</Label><Input value={form.setor || ""} onChange={e => setForm({ ...form, setor: e.target.value || null })} placeholder="Ala A, UTI..." /></div>
                      <div className="space-y-1.5"><Label className="text-xs">CID (Diagnóstico)</Label><Input value={form.diagnostico_cid || ""} onChange={e => setForm({ ...form, diagnostico_cid: e.target.value || null })} placeholder="F20.0" /></div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Responsável Legal</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">Nome do Responsável</Label><Input value={form.responsavel_nome || ""} onChange={e => setForm({ ...form, responsavel_nome: e.target.value || null })} placeholder="Nome completo" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Telefone do Responsável</Label><Input value={form.responsavel_telefone || ""} onChange={e => setForm({ ...form, responsavel_telefone: formatPhone(e.target.value) || null })} placeholder="(00) 00000-0000" maxLength={15} /></div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button variant="outline" onClick={cancelForm}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                      {saving ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : editId ? "Salvar Alterações" : <><Plus className="h-3.5 w-3.5" /> Cadastrar</>}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {loadingCadastro ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : !filteredCadastro.length ? (
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
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Entrada</TableHead>
                      <TableHead className="text-xs font-semibold">Leito</TableHead>
                      <TableHead className="text-xs font-semibold">Setor</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">CID</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCadastro.map(p => (
                      <TableRow key={p.id} className="hover:bg-accent/30 cursor-pointer" onClick={() => openDetail(p)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10"><User className="h-3.5 w-3.5 text-primary" /></div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.nome}</p>
                              {p.sexo && <p className="text-[10px] text-muted-foreground">{p.sexo === "M" ? "Masculino" : p.sexo === "F" ? "Feminino" : p.sexo}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{p.prontuario}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell font-mono">{p.cpf ? maskCpf(p.cpf) : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{calcAge(p.data_nascimento) || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDateBR(p.data_entrada)}</TableCell>
                        <TableCell>{p.leito ? <Badge variant="outline" className="text-[10px] gap-0.5"><BedDouble className="h-2.5 w-2.5" />{p.leito}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.setor || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{p.diagnostico_cid || "—"}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(p)} title="Ver prontuário"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)} title="Editar"><Edit2 className="h-3.5 w-3.5" /></Button>
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

        <TabsContent value="historico">
          {loadingHist ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : !filteredHist.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <User className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum paciente encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHist.map(p => (
                <Card key={p.paciente} className="p-4 shadow-sm cursor-pointer group hover:shadow-md transition-shadow" onClick={() => openTimeline(p)}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors"><User className="h-5 w-5 text-primary" /></div>
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
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportTimelineCSV}><Download className="h-3.5 w-3.5" /> CSV</Button>
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
                    <div className="rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Pill className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-medium">{t.medicamento_nome}</span>
                          <span className="text-xs text-muted-foreground">{t.medicamento_concentracao}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{t.quantidade} un.</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(t.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
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
    </AppLayout>
  );
};

export default Pacientes;
