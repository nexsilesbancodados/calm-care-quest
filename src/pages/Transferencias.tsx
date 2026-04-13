import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search, Plus, Clock, Truck, CheckCircle2, XCircle, Zap, RefreshCw,
  ArrowRight, Package, X, Calendar, ArrowLeftRight, Info, ChevronLeft, ChevronRight, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Medicamento, ClinicaParceira, Lote, StatusTransferencia } from "@/types/database";

const statusCfg: Record<string, { label: string; icon: any; className: string }> = {
  pendente: { label: "Pendente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  aprovado: { label: "Aprovado", icon: CheckCircle2, className: "bg-info/10 text-info border-info/20" },
  enviado: { label: "Enviado", icon: Truck, className: "bg-primary/10 text-primary border-primary/20" },
  recebido: { label: "Recebido", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  cancelado: { label: "Cancelado", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const Transferencias = () => {
  const { user, profile } = useAuth();
  const { log } = useAudit();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [clinicas, setClinicas] = useState<ClinicaParceira[]>([]);
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ medicamento_id: "", lote_id: "", quantidade: 0, clinica_destino_id: "", urgencia: false, observacao: "" });
  const [medSearch, setMedSearch] = useState("");

  // 3b: Recebimento dialog
  const [recebimentoOpen, setRecebimentoOpen] = useState(false);
  const [recebimentoTarget, setRecebimentoTarget] = useState<any>(null);
  const [recebimentoQtd, setRecebimentoQtd] = useState(0);
  const [recebimentoObs, setRecebimentoObs] = useState("");

  // 3c: Timer tick
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: tData }, { data: mData }, { data: cData }, { data: lotesData }] = await Promise.all([
      supabase.from("transferencias").select("*, medicamentos(nome, concentracao), clinica_origem:clinicas_parceiras!transferencias_clinica_origem_id_fkey(nome), clinica_destino:clinicas_parceiras!transferencias_clinica_destino_id_fkey(nome), lotes(numero_lote, validade)").order("created_at", { ascending: false }),
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("clinicas_parceiras").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").eq("ativo", true).gt("quantidade_atual", 0),
    ]);
    setTransfers(tData || []);
    setMeds((mData || []).map((m: any) => ({
      ...m,
      lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id).sort((a: any, b: any) => new Date(a.validade).getTime() - new Date(b.validade).getTime()),
    })));
    setClinicas(cData as ClinicaParceira[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.filial_id]);

  const selectedMed = meds.find(m => m.id === form.medicamento_id);
  const selectedLote = selectedMed?.lotes.find(l => l.id === form.lote_id);

  const filteredMeds = useMemo(() => {
    const available = meds.filter(m => m.lotes && m.lotes.length > 0);
    if (!medSearch) return available;
    const s = medSearch.toLowerCase();
    return available.filter(m => m.nome.toLowerCase().includes(s) || m.generico.toLowerCase().includes(s));
  }, [meds, medSearch]);

  // 3a: Auto-select FEFO lote when med changes
  const handleMedChange = (medId: string) => {
    const med = meds.find(m => m.id === medId);
    const fefoLote = med?.lotes?.[0];
    setForm({ ...form, medicamento_id: medId, lote_id: fefoLote?.id || "" });
  };

  const handleCreate = async () => {
    if (!form.medicamento_id || !form.clinica_destino_id || !form.quantidade || !form.lote_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (selectedLote && form.quantidade > selectedLote.quantidade_atual) {
      toast.error(`Quantidade excede o disponível no lote (${selectedLote.quantidade_atual} un.)`);
      return;
    }
    const { data, error } = await supabase.from("transferencias").insert({
      medicamento_id: form.medicamento_id, lote_id: form.lote_id, quantidade: form.quantidade,
      clinica_destino_id: form.clinica_destino_id, urgencia: form.urgencia, observacao: form.observacao,
      solicitante_id: user?.id, status: "pendente" as any, filial_id: profile?.filial_id,
    }).select("*, medicamentos(nome, concentracao), clinica_destino:clinicas_parceiras!transferencias_clinica_destino_id_fkey(nome), lotes(numero_lote, validade)").single();
    if (error) { toast.error("Erro ao criar transferência"); return; }
    setTransfers(prev => [data, ...prev]);
    await log({ acao: "Nova Transferência", tabela: "transferencias", registro_id: data.id });
    toast.success("Transferência criada!");
    setDialogOpen(false);
    setForm({ medicamento_id: "", lote_id: "", quantidade: 0, clinica_destino_id: "", urgencia: false, observacao: "" });
  };

  const updateStatus = async (id: string, status: StatusTransferencia) => {
    await supabase.from("transferencias").update({ status, aprovador_id: user?.id }).eq("id", id);
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    await log({ acao: `Transferência ${status}`, tabela: "transferencias", registro_id: id });
    toast.success(`Status: ${statusCfg[status].label}`);
  };

  // 3b: Recebimento handler
  const handleRecebimento = async () => {
    if (!recebimentoTarget) return;
    const t = recebimentoTarget;
    const isDivergent = recebimentoQtd !== t.quantidade;

    await updateStatus(t.id, "recebido");

    // Register entrada
    await supabase.from("movimentacoes").insert({
      tipo: "entrada" as any,
      medicamento_id: t.medicamento_id,
      lote_id: t.lote_id,
      quantidade: recebimentoQtd,
      usuario_id: user?.id,
      observacao: `Recebimento de transferência${isDivergent ? " (com divergência)" : ""}: ${recebimentoObs || "—"}`,
      filial_id: profile?.filial_id,
    });

    if (isDivergent) {
      await log({
        acao: "Divergência na transferência",
        tabela: "transferencias",
        registro_id: t.id,
        dados_novos: { solicitado: t.quantidade, recebido: recebimentoQtd, diferenca: recebimentoQtd - t.quantidade },
      });
      toast.warning(`Recebido com divergência: solicitado ${t.quantidade}, recebido ${recebimentoQtd}`);
    } else {
      toast.success("Recebimento confirmado");
    }
    setRecebimentoOpen(false);
    setRecebimentoTarget(null);
    fetchData();
  };

  const filtered = transfers.filter(t => {
    const matchSearch = !search || t.medicamentos?.nome?.toLowerCase().includes(search.toLowerCase()) || t.clinica_destino?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: transfers.length };
    Object.keys(statusCfg).forEach(k => { counts[k] = transfers.filter(t => t.status === k).length; });
    return counts;
  }, [transfers]);

  const urgentCount = transfers.filter(t => t.urgencia && t.status === "pendente").length;
  const hasFilters = search || statusFilter !== "all";

  // 3c: Format urgency wait time
  const formatWait = (createdAt: string) => {
    const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
    if (hours < 1) return "< 1h";
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  };

  if (loading) return (
    <AppLayout title="Transferências">
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}</div>
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout
      title="Transferências"
      subtitle={`${transfers.length} transferências • ${statusCounts.pendente || 0} pendentes`}
      actions={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>}
    >
      <TooltipProvider>
        {/* Status KPIs */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {(["pendente", "aprovado", "enviado", "recebido", "cancelado"] as const).map((s, i) => {
            const cfg = statusCfg[s];
            return (
              <div key={s}
                className={cn("rounded-xl border bg-card p-3 shadow-sm cursor-pointer transition-all hover:shadow-md text-center",
                  statusFilter === s && "ring-2 ring-primary")}
                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}>
                <div className={cn("flex h-8 w-8 mx-auto items-center justify-center rounded-lg mb-1.5", cfg.className)}>
                  <cfg.icon className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold">{statusCounts[s] || 0}</p>
                <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
              </div>
            );
          })}
        </div>

        {/* Urgent alert */}
        {urgentCount > 0 && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-3">
            <Zap className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{urgentCount} transferência(s) urgente(s) pendente(s)</p>
              <p className="text-xs text-muted-foreground">Requerem ação imediata</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar medicamento ou clínica..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Nova Transferência
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mb-2">{filtered.length} resultado(s)</p>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs font-semibold">Data</TableHead>
                <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                <TableHead className="text-xs font-semibold">Lote</TableHead>
                <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
                <TableHead className="text-xs font-semibold">Rota</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhuma transferência encontrada</p>
                  </TableCell>
                </TableRow>
              ) : filtered.map(t => {
                const cfg = statusCfg[t.status] || statusCfg.pendente;
                return (
                  <TableRow key={t.id} className="hover:bg-accent/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      <br />
                      <span className="text-[10px]">{new Date(t.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{t.medicamentos?.nome || "—"}</span>
                        {t.urgencia && (
                          <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 gap-0.5">
                            <Zap className="h-2.5 w-2.5" /> Urgente
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{t.medicamentos?.concentracao}</span>
                      {/* 3c: Timer for urgent pending */}
                      {t.urgencia && t.status === "pendente" && (
                        <p className="text-[10px] text-destructive font-semibold mt-0.5">há {formatWait(t.created_at)} aguardando</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{t.lotes?.numero_lote || "—"}</TableCell>
                    <TableCell className="text-center font-semibold">{t.quantidade}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">{t.clinica_origem?.nome || "Sede"}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="font-medium">{t.clinica_destino?.nome || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[11px] gap-1", cfg.className)}>
                        <cfg.icon className="h-3 w-3" />{cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {t.status === "pendente" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(t.id, "aprovado")}>Aprovar</Button>
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => updateStatus(t.id, "cancelado")}>Cancelar</Button>
                          </>
                        )}
                        {t.status === "aprovado" && <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => updateStatus(t.id, "enviado")}><Truck className="h-3 w-3" /> Enviar</Button>}
                        {/* 3b: Recebimento com divergência */}
                        {t.status === "enviado" && (
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => {
                            setRecebimentoTarget(t);
                            setRecebimentoQtd(t.quantidade);
                            setRecebimentoObs("");
                            setRecebimentoOpen(true);
                          }}>
                            <CheckCircle2 className="h-3 w-3" /> Confirmar Recebimento
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Dialog Nova Transferência */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-primary" /> Nova Transferência</DialogTitle>
              <DialogDescription>Solicitar transferência de medicamento entre unidades.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Medicamento *</Label>
                <Select value={form.medicamento_id} onValueChange={handleMedChange}>
                  <SelectTrigger className="bg-card"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2"><Input placeholder="Buscar..." value={medSearch} onChange={e => setMedSearch(e.target.value)} className="h-8 text-xs" /></div>
                    {filteredMeds.slice(0, 50).map(m => <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* 3a: Lote select with FEFO */}
              {selectedMed && selectedMed.lotes.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Lote * <span className="text-muted-foreground">(FEFO automático)</span></Label>
                  <Select value={form.lote_id} onValueChange={v => setForm({ ...form, lote_id: v })}>
                    <SelectTrigger className="bg-card"><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
                    <SelectContent>
                      {selectedMed.lotes.map((l, i) => (
                        <SelectItem key={l.id} value={l.id}>
                          {i === 0 ? "⚡ " : ""}Lote {l.numero_lote} — {l.quantidade_atual} un. — Val: {new Date(l.validade).toLocaleDateString("pt-BR")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedLote && <p className="text-[11px] text-muted-foreground">Disponível: {selectedLote.quantidade_atual} un.</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Clínica Destino *</Label>
                <Select value={form.clinica_destino_id} onValueChange={v => setForm({ ...form, clinica_destino_id: v })}>
                  <SelectTrigger className="bg-card"><SelectValue placeholder="Selecionar destino" /></SelectTrigger>
                  <SelectContent>{clinicas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantidade *</Label>
                  <Input type="number" min={1} max={selectedLote?.quantidade_atual} value={form.quantidade || ""} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} />
                  {form.quantidade > 0 && selectedLote && form.quantidade > selectedLote.quantidade_atual && (
                    <p className="text-[10px] text-destructive">Excede o disponível!</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Urgência</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch checked={form.urgencia} onCheckedChange={v => setForm({ ...form, urgencia: v })} />
                    <span className="text-xs text-muted-foreground">{form.urgencia ? "Urgente" : "Normal"}</span>
                    {form.urgencia && <Zap className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observação</Label>
                <Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} placeholder="Motivo ou detalhes..." maxLength={500} />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} className="gradient-primary text-primary-foreground gap-2">
                  <Plus className="h-4 w-4" /> Criar Transferência
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 3b: Recebimento Dialog */}
        <Dialog open={recebimentoOpen} onOpenChange={setRecebimentoOpen}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Confirmar Recebimento — {recebimentoTarget?.medicamentos?.nome}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="rounded-lg bg-muted/40 border p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Medicamento</span><span className="font-medium">{recebimentoTarget?.medicamentos?.nome}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Lote</span><span className="font-mono">{recebimentoTarget?.lotes?.numero_lote || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Solicitado</span><span className="font-bold">{recebimentoTarget?.quantidade} un.</span></div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantidade recebida *</Label>
                <Input type="number" min={0} value={recebimentoQtd} onChange={e => setRecebimentoQtd(Number(e.target.value))} />
              </div>
              {recebimentoTarget && recebimentoQtd !== recebimentoTarget.quantidade && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Divergência: solicitado {recebimentoTarget.quantidade}, recebido {recebimentoQtd}. Isso gerará uma ocorrência.</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Observação</Label>
                <Textarea value={recebimentoObs} onChange={e => setRecebimentoObs(e.target.value)} rows={2} placeholder="Detalhes do recebimento..." maxLength={500} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setRecebimentoOpen(false)}>Cancelar</Button>
                <Button onClick={handleRecebimento} className="gradient-primary text-primary-foreground gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {recebimentoTarget && recebimentoQtd !== recebimentoTarget.quantidade ? "Confirmar com divergência" : "Confirmar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AppLayout>
  );
};

export default Transferencias;
