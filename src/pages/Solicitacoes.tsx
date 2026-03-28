import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ClipboardList, AlertTriangle, CheckCircle2, XCircle, Clock,
  Send, Search, Package, Zap, MessageSquare, User
} from "lucide-react";
import type { Medicamento } from "@/types/database";

interface Solicitacao {
  id: string;
  solicitante_id: string;
  medicamento_id: string;
  quantidade: number;
  setor: string;
  urgencia: boolean;
  status: string;
  observacao: string;
  resposta_farmaceutico: string;
  atendida_em: string | null;
  created_at: string;
  filial_id: string | null;
  medicamento?: { nome: string; concentracao: string };
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  pendente: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  aprovada: { label: "Aprovada", className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  recusada: { label: "Recusada", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  atendida: { label: "Atendida", className: "bg-info/10 text-info border-info/20", icon: CheckCircle2 },
};

const Solicitacoes = () => {
  const { user, profile, can } = useAuth();
  const { log } = useAudit();
  const [meds, setMeds] = useState<Medicamento[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [medSearch, setMedSearch] = useState("");

  // Form
  const [form, setForm] = useState({ medicamento_id: "", quantidade: 0, setor: "", urgencia: false, observacao: "" });

  // Response dialog
  const [respondDialog, setRespondDialog] = useState<Solicitacao | null>(null);
  const [resposta, setResposta] = useState("");
  const [respondAction, setRespondAction] = useState<"aprovada" | "recusada" | "atendida">("aprovada");

  const isFarmAdmin = profile?.role === "admin" || profile?.role === "farmaceutico";

  const loadData = async () => {
    const [{ data: medsData }, { data: solData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("solicitacoes_medicamentos").select("*, medicamentos(nome, concentracao)").order("created_at", { ascending: false }),
    ]);
    setMeds((medsData as Medicamento[]) || []);
    setSolicitacoes((solData as any[])?.map((s: any) => ({
      ...s,
      medicamento: s.medicamentos,
    })) || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [profile?.filial_id]);

  const filteredMeds = useMemo(() => {
    if (!medSearch) return meds;
    const s = medSearch.toLowerCase();
    return meds.filter(m => m.nome.toLowerCase().includes(s) || m.generico.toLowerCase().includes(s));
  }, [meds, medSearch]);

  const handleSubmit = async () => {
    if (!form.medicamento_id || !form.quantidade || !form.setor.trim()) {
      toast.error("Preencha medicamento, quantidade e setor");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("solicitacoes_medicamentos").insert({
      solicitante_id: user!.id,
      medicamento_id: form.medicamento_id,
      quantidade: form.quantidade,
      setor: form.setor.trim(),
      urgencia: form.urgencia,
      observacao: form.observacao,
      filial_id: profile?.filial_id,
    } as any);
    if (error) { toast.error("Erro ao enviar solicitação"); setSubmitting(false); return; }
    await log({ acao: "Nova solicitação de medicamento", tabela: "solicitacoes_medicamentos", dados_novos: form });
    toast.success("Solicitação enviada!");
    setForm({ medicamento_id: "", quantidade: 0, setor: "", urgencia: false, observacao: "" });
    setSubmitting(false);
    loadData();
  };

  const handleRespond = async () => {
    if (!respondDialog) return;
    if (respondAction === "recusada" && !resposta.trim()) {
      toast.error("Informe o motivo da recusa");
      return;
    }
    const update: any = {
      status: respondAction,
      resposta_farmaceutico: resposta,
    };
    if (respondAction === "atendida") update.atendida_em = new Date().toISOString();

    const { error } = await supabase.from("solicitacoes_medicamentos").update(update).eq("id", respondDialog.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    await log({ acao: `Solicitação ${respondAction}`, tabela: "solicitacoes_medicamentos", registro_id: respondDialog.id, dados_novos: update });
    toast.success(`Solicitação ${STATUS_CONFIG[respondAction]?.label || respondAction}`);
    setRespondDialog(null);
    setResposta("");
    loadData();
  };

  const filtered = solicitacoes.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.medicamento?.nome?.toLowerCase().includes(q) || s.setor?.toLowerCase().includes(q);
  });

  const pendentes = solicitacoes.filter(s => s.status === "pendente").length;

  if (loading) return (
    <AppLayout title="Solicitações">
      <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
    </AppLayout>
  );

  return (
    <AppLayout title="Solicitações de Medicamentos" subtitle={isFarmAdmin ? "Gerencie solicitações recebidas" : "Solicite medicamentos à farmácia"}>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: solicitacoes.length, icon: ClipboardList, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pendentes", value: pendentes, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "Aprovadas", value: solicitacoes.filter(s => s.status === "aprovada").length, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
          { label: "Atendidas", value: solicitacoes.filter(s => s.status === "atendida").length, icon: Package, color: "text-info", bg: "bg-info/10" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border bg-card p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", kpi.bg)}>
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold leading-tight">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form - only for enfermeiro/auxiliar or all */}
        {!isFarmAdmin && (
          <div>
            <Card className="p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Send className="h-4 w-4 text-primary" />
                Nova Solicitação
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Medicamento *</Label>
                <Select value={form.medicamento_id} onValueChange={v => setForm({ ...form, medicamento_id: v })}>
                  <SelectTrigger className="bg-card"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2">
                      <Input placeholder="Buscar..." value={medSearch} onChange={e => setMedSearch(e.target.value)} className="h-8 text-xs" />
                    </div>
                    {filteredMeds.slice(0, 50).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantidade *</Label>
                  <Input type="number" min={1} value={form.quantidade || ""} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Setor *</Label>
                  <Input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} placeholder="Ala A, B..." />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-destructive" /> Urgente
                </Label>
                <Switch checked={form.urgencia} onCheckedChange={v => setForm({ ...form, urgencia: v })} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observação</Label>
                <Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} maxLength={500} />
              </div>

              <Button className="w-full gap-2" disabled={submitting || !form.medicamento_id || !form.quantidade || !form.setor.trim()} onClick={handleSubmit}>
                {submitting ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> :
                  <><Send className="h-4 w-4" /> Enviar Solicitação</>}
              </Button>
            </Card>
          </div>
        )}

        {/* List */}
        <div className={isFarmAdmin ? "lg:col-span-3" : "lg:col-span-2"}>
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por medicamento ou setor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma solicitação</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(s => {
                const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pendente;
                const StatusIcon = cfg.icon;
                return (
                  <Card key={s.id} className={cn("p-4 shadow-sm", s.urgencia && s.status === "pendente" && "border-destructive/30")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold">{s.medicamento?.nome || "—"}</span>
                          <span className="text-xs text-muted-foreground">{s.medicamento?.concentracao}</span>
                          {s.urgencia && (
                            <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive gap-0.5">
                              <Zap className="h-2.5 w-2.5" /> URGENTE
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="font-semibold text-foreground">{s.quantidade} un.</span>
                          <span>Setor: {s.setor}</span>
                          <span>{new Date(s.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        {s.observacao && <p className="text-[11px] text-muted-foreground mt-1 italic">{s.observacao}</p>}
                        {s.resposta_farmaceutico && (
                          <div className="mt-2 rounded-md bg-muted/40 p-2 text-[11px] flex items-start gap-1.5">
                            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                            <span>{s.resposta_farmaceutico}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={cn("text-[10px] gap-1", cfg.className)}>
                          <StatusIcon className="h-3 w-3" /> {cfg.label}
                        </Badge>
                        {isFarmAdmin && s.status === "pendente" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-success border-success/30 hover:bg-success/10"
                              onClick={() => { setRespondDialog(s); setRespondAction("aprovada"); setResposta(""); }}>
                              <CheckCircle2 className="h-3 w-3" /> Aprovar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => { setRespondDialog(s); setRespondAction("recusada"); setResposta(""); }}>
                              <XCircle className="h-3 w-3" /> Recusar
                            </Button>
                          </div>
                        )}
                        {isFarmAdmin && s.status === "aprovada" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-info border-info/30 hover:bg-info/10"
                            onClick={() => { setRespondDialog(s); setRespondAction("atendida"); setResposta(""); }}>
                            <Package className="h-3 w-3" /> Atendida
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Respond Dialog */}
      <Dialog open={!!respondDialog} onOpenChange={open => !open && setRespondDialog(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {respondAction === "aprovada" && <><CheckCircle2 className="h-5 w-5 text-success" /> Aprovar Solicitação</>}
              {respondAction === "recusada" && <><XCircle className="h-5 w-5 text-destructive" /> Recusar Solicitação</>}
              {respondAction === "atendida" && <><Package className="h-5 w-5 text-info" /> Marcar como Atendida</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium">{respondDialog?.medicamento?.nome} — {respondDialog?.quantidade} un.</p>
              <p className="text-xs text-muted-foreground">Setor: {respondDialog?.setor}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{respondAction === "recusada" ? "Motivo da recusa *" : "Observação"}</Label>
              <Textarea value={resposta} onChange={e => setResposta(e.target.value)} rows={3} placeholder={respondAction === "recusada" ? "Informe o motivo..." : "Opcional..."} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRespondDialog(null)}>Cancelar</Button>
              <Button onClick={handleRespond} className={cn(
                respondAction === "recusada" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                respondAction === "aprovada" && "bg-success text-success-foreground hover:bg-success/90",
              )}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Solicitacoes;
