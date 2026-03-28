import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, User, FileText, Calendar, Pill, Clock, Download, ClipboardList,
  Plus, Edit2, BedDouble, Activity
} from "lucide-react";

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
  prontuario: string;
  data_nascimento: string | null;
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
  nome: "", cpf: null, prontuario: "", data_nascimento: null, sexo: null,
  leito: null, setor: null, diagnostico_cid: null, responsavel_nome: null, responsavel_telefone: null,
};

const Pacientes = () => {
  const { profile } = useAuth();
  const { log } = useAudit();
  const [tab, setTab] = useState("cadastro");
  const [search, setSearch] = useState("");

  // Cadastro state
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loadingCadastro, setLoadingCadastro] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Histórico state
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [timeline, setTimeline] = useState<PatientMovement[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

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

    data.forEach((m: any) => {
      const key = m.paciente?.trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { paciente: key, prontuario: m.prontuario, total_dispensacoes: 0, ultima_dispensacao: m.created_at, medicamentos_distintos: 0 });
        medSets.set(key, new Set());
      }
      const p = map.get(key)!;
      p.total_dispensacoes++;
      if (m.medicamento_id) medSets.get(key)!.add(m.medicamento_id);
      if (m.created_at > p.ultima_dispensacao) p.ultima_dispensacao = m.created_at;
    });

    medSets.forEach((set, key) => { const p = map.get(key); if (p) p.medicamentos_distintos = set.size; });
    setPatients(Array.from(map.values()).sort((a, b) => b.ultima_dispensacao.localeCompare(a.ultima_dispensacao)));
    setLoadingHist(false);
  };

  useEffect(() => { loadCadastro(); loadHistorico(); }, [profile?.filial_id]);

  const handleSave = async () => {
    if (!form.nome.trim() || !form.prontuario.trim()) { toast.error("Nome e prontuário são obrigatórios"); return; }
    setSaving(true);
    if (editId) {
      const { error } = await supabase.from("pacientes").update({ ...form } as any).eq("id", editId);
      if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
      await log({ acao: "Edição de paciente", tabela: "pacientes", registro_id: editId, dados_novos: form });
      toast.success("Paciente atualizado!");
    } else {
      const { error } = await supabase.from("pacientes").insert({ ...form, filial_id: profile?.filial_id } as any);
      if (error) {
        if (error.code === "23505") toast.error("Prontuário já cadastrado nesta filial");
        else toast.error("Erro ao cadastrar");
        setSaving(false); return;
      }
      await log({ acao: "Cadastro de paciente", tabela: "pacientes", dados_novos: form });
      toast.success("Paciente cadastrado!");
    }
    setSaving(false);
    setDialogOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    loadCadastro();
  };

  const openEdit = (p: Paciente) => {
    setEditId(p.id);
    setForm({
      nome: p.nome, cpf: p.cpf, prontuario: p.prontuario, data_nascimento: p.data_nascimento,
      sexo: p.sexo, leito: p.leito, setor: p.setor, diagnostico_cid: p.diagnostico_cid,
      responsavel_nome: p.responsavel_nome, responsavel_telefone: p.responsavel_telefone,
    });
    setDialogOpen(true);
  };

  const openTimeline = async (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setTimelineLoading(true);
    const { data } = await supabase
      .from("movimentacoes")
      .select("id, tipo, quantidade, created_at, setor, observacao, prescricao_id, medicamentos(nome, concentracao)")
      .eq("paciente", patient.paciente)
      .order("created_at", { ascending: false }).limit(200);

    setTimeline((data || []).map((m: any) => ({
      id: m.id, tipo: m.tipo, quantidade: m.quantidade, created_at: m.created_at,
      setor: m.setor, observacao: m.observacao, prescricao_id: m.prescricao_id,
      medicamento_nome: m.medicamentos?.nome || "—", medicamento_concentracao: m.medicamentos?.concentracao || "",
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

  const filteredCadastro = pacientes.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.nome.toLowerCase().includes(s) || p.prontuario.toLowerCase().includes(s) || p.cpf?.includes(s);
  });

  const filteredHist = patients.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.paciente.toLowerCase().includes(s) || p.prontuario?.toLowerCase().includes(s);
  });

  return (
    <AppLayout title="Pacientes" subtitle="Cadastro e histórico de pacientes">
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, prontuário ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="cadastro" className="gap-1.5"><User className="h-3.5 w-3.5" /> Cadastro</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Histórico de Dispensações</TabsTrigger>
        </TabsList>

        {/* Cadastro Tab */}
        <TabsContent value="cadastro">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{filteredCadastro.length} paciente(s)</p>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditId(null); setForm(EMPTY_FORM); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> Novo Paciente
            </Button>
          </div>

          {loadingCadastro ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : filteredCadastro.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <User className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum paciente cadastrado</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Nome</TableHead>
                    <TableHead className="text-xs font-semibold">Prontuário</TableHead>
                    <TableHead className="text-xs font-semibold">CPF</TableHead>
                    <TableHead className="text-xs font-semibold">Leito</TableHead>
                    <TableHead className="text-xs font-semibold">Setor</TableHead>
                    <TableHead className="text-xs font-semibold">CID</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCadastro.map(p => (
                    <TableRow key={p.id} className="hover:bg-accent/30">
                      <TableCell className="font-medium text-sm">{p.nome}</TableCell>
                      <TableCell className="text-xs font-mono">{p.prontuario}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.cpf || "—"}</TableCell>
                      <TableCell>
                        {p.leito ? <Badge variant="outline" className="text-[10px] gap-0.5"><BedDouble className="h-2.5 w-2.5" />{p.leito}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.setor || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.diagnostico_cid || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHist.map(p => (
                <Card key={p.paciente} className="p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => openTimeline(p)}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.paciente}</p>
                      {p.prontuario && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> {p.prontuario}</p>}
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-lg font-bold text-primary">{p.total_dispensacoes}</p><p className="text-[10px] text-muted-foreground">Dispensações</p></div>
                    <div><p className="text-lg font-bold">{p.medicamentos_distintos}</p><p className="text-[10px] text-muted-foreground">Medicamentos</p></div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">{new Date(p.ultima_dispensacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                      <p className="text-[10px] text-muted-foreground">Última</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Paciente" : "Novo Paciente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prontuário *</Label>
                <Input value={form.prontuario} onChange={e => setForm({ ...form, prontuario: e.target.value })} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CPF</Label>
                <Input value={form.cpf || ""} onChange={e => setForm({ ...form, cpf: e.target.value || null })} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Nascimento</Label>
                <Input type="date" value={form.data_nascimento || ""} onChange={e => setForm({ ...form, data_nascimento: e.target.value || null })} />
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
              <div className="space-y-1.5">
                <Label className="text-xs">Leito</Label>
                <Input value={form.leito || ""} onChange={e => setForm({ ...form, leito: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Setor</Label>
                <Input value={form.setor || ""} onChange={e => setForm({ ...form, setor: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CID (diagnóstico)</Label>
                <Input value={form.diagnostico_cid || ""} onChange={e => setForm({ ...form, diagnostico_cid: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Responsável</Label>
                <Input value={form.responsavel_nome || ""} onChange={e => setForm({ ...form, responsavel_nome: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tel. Responsável</Label>
                <Input value={form.responsavel_telefone || ""} onChange={e => setForm({ ...form, responsavel_telefone: e.target.value || null })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : editId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </AppLayout>
  );
};

export default Pacientes;
