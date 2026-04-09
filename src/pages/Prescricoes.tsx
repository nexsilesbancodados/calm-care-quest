import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAutomations } from "@/hooks/useAutomations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Search, Plus, FileText, Pill, ChevronDown, ChevronRight, Syringe, Zap, User } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Prescricao, ItemPrescricao, Medicamento, Lote, StatusPrescricao } from "@/types/database";
import { PRESCRICAO_STATUS_CONFIG } from "@/types/database";

const Prescricoes = () => {
  const { log } = useAudit();
  const { user, profile } = useAuth();
  const { dispensarPrescricao } = useAutomations();
  const [prescricoes, setPrescricoes] = useState<(Prescricao & { itens?: (ItemPrescricao & { medicamento?: Medicamento })[] })[]>([]);
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Pacientes cadastrados
  const [pacientesCadastrados, setPacientesCadastrados] = useState<{ id: string; nome: string; prontuario: string; setor: string | null }[]>([]);
  const [pacienteSearchOpen, setPacienteSearchOpen] = useState(false);
  const [pacienteSearchTerm, setPacienteSearchTerm] = useState("");

  // Dialog states
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [dispensarDialogOpen, setDispensarDialogOpen] = useState(false);
  const [selectedPrescricao, setSelectedPrescricao] = useState<Prescricao | null>(null);

  // New prescription form
  const [form, setForm] = useState({ numero_receita: "", paciente: "", prontuario: "", medico: "", crm: "", setor: "", data_prescricao: new Date().toISOString().slice(0, 10), validade_dias: 30, observacao: "" });

  // Add item form
  const [itemForm, setItemForm] = useState({ medicamento_id: "", quantidade_prescrita: 0, posologia: "" });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: prescData }, { data: itensData }, { data: medsData }, { data: lotesData }] = await Promise.all([
      supabase.from("prescricoes").select("*").order("created_at", { ascending: false }),
      supabase.from("itens_prescricao").select("*, medicamentos(nome, concentracao, forma_farmaceutica)").order("created_at"),
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").eq("ativo", true).gt("quantidade_atual", 0),
    ]);

    const medsWithLotes = (medsData || []).map((m: any) => ({
      ...m,
      lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id).sort((a: any, b: any) => new Date(a.validade).getTime() - new Date(b.validade).getTime()),
    }));
    setMeds(medsWithLotes);

    const prescs = (prescData || []).map((p: any) => ({
      ...p,
      itens: (itensData || []).filter((i: any) => i.prescricao_id === p.id).map((i: any) => ({
        ...i,
        medicamento: i.medicamentos,
      })),
    }));
    setPrescricoes(prescs);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.filial_id]);

  const toggleExpand = (id: string) => setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = prescricoes.filter(p => {
    const matchSearch = !search || p.paciente.toLowerCase().includes(search.toLowerCase()) || p.numero_receita.toLowerCase().includes(search.toLowerCase()) || p.medico.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Create prescription
  const handleCreate = async () => {
    if (!form.numero_receita || !form.paciente || !form.medico) { toast.error("Preencha número, paciente e médico"); return; }
    const { data, error } = await supabase.from("prescricoes").insert({
      ...form,
      validade_dias: form.validade_dias,
      usuario_id: user?.id,
      filial_id: profile?.filial_id,
    }).select().single();
    if (error) { toast.error("Erro ao criar prescrição"); return; }
    await log({ acao: "Nova Prescrição", tabela: "prescricoes", registro_id: data.id });
    toast.success("Prescrição criada!");
    setNewDialogOpen(false);
    setForm({ numero_receita: "", paciente: "", prontuario: "", medico: "", crm: "", setor: "", data_prescricao: new Date().toISOString().slice(0, 10), validade_dias: 30, observacao: "" });
    fetchData();
  };

  // Add item
  const handleAddItem = async () => {
    if (!selectedPrescricao || !itemForm.medicamento_id || !itemForm.quantidade_prescrita) { toast.error("Selecione medicamento e quantidade"); return; }
    const { error } = await supabase.from("itens_prescricao").insert({
      prescricao_id: selectedPrescricao.id,
      medicamento_id: itemForm.medicamento_id,
      quantidade_prescrita: itemForm.quantidade_prescrita,
      posologia: itemForm.posologia,
    });
    if (error) { toast.error("Erro ao adicionar item"); return; }
    toast.success("Item adicionado!");
    setItemDialogOpen(false);
    setItemForm({ medicamento_id: "", quantidade_prescrita: 0, posologia: "" });
    fetchData();
  };

  // Dispensar prescription
  const [dispensing, setDispensing] = useState(false);

  const handleDispensar = async () => {
    if (!selectedPrescricao) return;
    const itens = prescricoes.find(p => p.id === selectedPrescricao.id)?.itens || [];
    const pendingItens = itens.filter(i => i.quantidade_dispensada < i.quantidade_prescrita);

    if (pendingItens.length === 0) { toast.error("Todos os itens já foram dispensados"); return; }

    setDispensing(true);
    let dispensedCount = 0;
    let skippedCount = 0;

    for (const item of pendingItens) {
      const qtdRestante = item.quantidade_prescrita - item.quantidade_dispensada;
      const med = meds.find(m => m.id === item.medicamento_id);
      if (!med || !med.lotes.length) { skippedCount++; continue; }

      // FEFO: use first lote (already sorted by validade)
      const lote = med.lotes[0];

      // Server-side stock validation
      const { data: freshLote, error: loteErr } = await supabase
        .from("lotes")
        .select("quantidade_atual")
        .eq("id", lote.id)
        .single();

      if (loteErr || !freshLote) { skippedCount++; continue; }

      const qtdDispensar = Math.min(qtdRestante, freshLote.quantidade_atual);
      if (qtdDispensar <= 0) { skippedCount++; continue; }

      // Update lote with fresh value
      await supabase.from("lotes").update({ quantidade_atual: freshLote.quantidade_atual - qtdDispensar }).eq("id", lote.id);

      // Create movimentacao
      await supabase.from("movimentacoes").insert({
        tipo: "dispensacao" as any,
        medicamento_id: item.medicamento_id,
        lote_id: lote.id,
        quantidade: qtdDispensar,
        usuario_id: user?.id,
        paciente: selectedPrescricao.paciente,
        prontuario: selectedPrescricao.prontuario,
        filial_id: profile?.filial_id,
        setor: selectedPrescricao.setor,
        observacao: `Dispensação via prescrição #${selectedPrescricao.numero_receita}`,
        prescricao_id: selectedPrescricao.id,
      });

      // Update item dispensada
      await supabase.from("itens_prescricao").update({
        quantidade_dispensada: item.quantidade_dispensada + qtdDispensar,
      }).eq("id", item.id);

      dispensedCount++;
    }

    // Update prescription status
    const updatedItens = await supabase.from("itens_prescricao").select("*").eq("prescricao_id", selectedPrescricao.id);
    const allItens = updatedItens.data || [];
    const allDispensed = allItens.every((i: any) => i.quantidade_dispensada >= i.quantidade_prescrita);
    const someDispensed = allItens.some((i: any) => i.quantidade_dispensada > 0);

    const newStatus = allDispensed ? "totalmente_dispensada" : someDispensed ? "parcialmente_dispensada" : "ativa";
    await supabase.from("prescricoes").update({ status: newStatus }).eq("id", selectedPrescricao.id);

    await log({ acao: "Dispensação de Prescrição", tabela: "prescricoes", registro_id: selectedPrescricao.id });

    if (skippedCount > 0) {
      toast.warning(`${dispensedCount} dispensado(s), ${skippedCount} sem estoque disponível`);
    } else {
      toast.success(`${dispensedCount} item(ns) dispensado(s) com sucesso!`);
    }
    setDispensing(false);
    setDispensarDialogOpen(false);
    fetchData();
  };

  if (loading) return <AppLayout title="Prescrições"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout title="Prescrições" subtitle={`${prescricoes.length} prescrições • ${prescricoes.filter(p => p.status === "ativa").length} ativas`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por paciente, número ou médico..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(PRESCRICAO_STATUS_CONFIG) as StatusPrescricao[]).map(s => (
              <SelectItem key={s} value={s}>{PRESCRICAO_STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setNewDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Nova Prescrição
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold w-8"></TableHead>
              <TableHead className="text-xs font-semibold">Nº Receita</TableHead>
              <TableHead className="text-xs font-semibold">Paciente</TableHead>
              <TableHead className="text-xs font-semibold">Médico</TableHead>
              <TableHead className="text-xs font-semibold">Data</TableHead>
              <TableHead className="text-xs font-semibold">Progresso</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma prescrição encontrada</p>
                </div>
              </TableCell></TableRow>
            ) : filtered.map(p => {
              const itens = p.itens || [];
              const totalItens = itens.length;
              const dispensados = itens.filter(i => i.quantidade_dispensada >= i.quantidade_prescrita).length;
              const progressPct = totalItens > 0 ? (dispensados / totalItens) * 100 : 0;
              const expanded = expandedIds.has(p.id);
              const cfg = PRESCRICAO_STATUS_CONFIG[p.status as StatusPrescricao] || PRESCRICAO_STATUS_CONFIG.ativa;

              return (
                <React.Fragment key={p.id}>
                  <TableRow className="hover:bg-accent/30 cursor-pointer" onClick={() => totalItens > 0 && toggleExpand(p.id)}>
                    <TableCell className="w-8">
                      {totalItens > 0 && (expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">#{p.numero_receita}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{p.paciente}</p>
                      {p.prontuario && <p className="text-[11px] text-muted-foreground">Pront: {p.prontuario}</p>}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{p.medico}</p>
                      {p.crm && <p className="text-[11px] text-muted-foreground">CRM: {p.crm}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(p.data_prescricao).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progressPct} className="h-1.5 w-16" />
                        <span className="text-[11px] text-muted-foreground">{dispensados}/{totalItens}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", cfg.className)}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setSelectedPrescricao(p); setItemDialogOpen(true); }}>
                          <Plus className="h-3 w-3 mr-1" /> Item
                        </Button>
                        {(p.status === "ativa" || p.status === "parcialmente_dispensada") && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => { setSelectedPrescricao(p); setDispensarDialogOpen(true); }}>
                              <Syringe className="h-3 w-3" /> Dispensar
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-primary/30 text-primary hover:bg-primary/10" onClick={async () => {
                              const result = await dispensarPrescricao(p.id);
                              if (result?.success) fetchData();
                            }}>
                              <Zap className="h-3 w-3" /> Auto
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded && itens.map(item => (
                    <TableRow key={item.id} className="bg-muted/20 hover:bg-muted/30">
                      <TableCell></TableCell>
                      <TableCell colSpan={2} className="pl-8">
                        <div className="flex items-center gap-2">
                          <Pill className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-medium">{item.medicamento?.nome || "—"}</span>
                          <span className="text-xs text-muted-foreground">{item.medicamento?.concentracao}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.posologia || "—"}</TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">{item.quantidade_dispensada}</span>
                        <span className="text-muted-foreground">/{item.quantidade_prescrita}</span>
                      </TableCell>
                      <TableCell colSpan={3}>
                        <Badge variant="outline" className={cn("text-[9px]",
                          item.quantidade_dispensada >= item.quantidade_prescrita ? "bg-success/10 text-success" :
                          item.quantidade_dispensada > 0 ? "bg-warning/10 text-warning" : "bg-muted"
                        )}>
                          {item.quantidade_dispensada >= item.quantidade_prescrita ? "Completo" : item.quantidade_dispensada > 0 ? "Parcial" : "Pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* New Prescription Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Prescrição</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Nº Receita *</Label><Input value={form.numero_receita} onChange={e => setForm({ ...form, numero_receita: e.target.value })} className="font-mono" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Data *</Label><Input type="date" value={form.data_prescricao} onChange={e => setForm({ ...form, data_prescricao: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Paciente *</Label><Input value={form.paciente} onChange={e => setForm({ ...form, paciente: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Prontuário</Label><Input value={form.prontuario} onChange={e => setForm({ ...form, prontuario: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Médico *</Label><Input value={form.medico} onChange={e => setForm({ ...form, medico: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">CRM</Label><Input value={form.crm} onChange={e => setForm({ ...form, crm: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Setor</Label><Input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Validade (dias)</Label><Input type="number" value={form.validade_dias} onChange={e => setForm({ ...form, validade_dias: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setNewDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">Criar Prescrição</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Adicionar Item — #{selectedPrescricao?.numero_receita}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Medicamento *</Label>
              <Select value={itemForm.medicamento_id} onValueChange={v => setItemForm({ ...itemForm, medicamento_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{meds.map(m => <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Quantidade *</Label><Input type="number" min={1} value={itemForm.quantidade_prescrita || ""} onChange={e => setItemForm({ ...itemForm, quantidade_prescrita: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Posologia</Label><Input value={itemForm.posologia} onChange={e => setItemForm({ ...itemForm, posologia: e.target.value })} placeholder="1x/dia" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddItem} className="gradient-primary text-primary-foreground">Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispensar Dialog */}
      <Dialog open={dispensarDialogOpen} onOpenChange={setDispensarDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Dispensar Prescrição — #{selectedPrescricao?.numero_receita}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg border p-3 bg-muted/30 text-sm">
              <p><strong>Paciente:</strong> {selectedPrescricao?.paciente}</p>
              <p><strong>Médico:</strong> {selectedPrescricao?.medico}</p>
            </div>
            <p className="text-xs text-muted-foreground">Itens pendentes serão dispensados automaticamente usando FEFO (lote com validade mais próxima):</p>
            <div className="space-y-2">
              {(prescricoes.find(p => p.id === selectedPrescricao?.id)?.itens || [])
                .filter(i => i.quantidade_dispensada < i.quantidade_prescrita)
                .map(item => {
                  const med = meds.find(m => m.id === item.medicamento_id);
                  const fefoLote = med?.lotes?.[0];
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <span className="font-medium">{item.medicamento?.nome}</span>
                        <span className="text-muted-foreground ml-1">{item.medicamento?.concentracao}</span>
                      </div>
                      <div className="text-right text-xs">
                        <p>Falta: {item.quantidade_prescrita - item.quantidade_dispensada} un.</p>
                        {fefoLote ? (
                          <p className="text-muted-foreground">Lote {fefoLote.numero_lote} ({fefoLote.quantidade_atual} disp.)</p>
                        ) : (
                          <p className="text-destructive">Sem estoque</p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDispensarDialogOpen(false)} disabled={dispensing}>Cancelar</Button>
              <Button onClick={handleDispensar} className="gradient-primary text-primary-foreground gap-2" disabled={dispensing}>
                {dispensing ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Syringe className="h-4 w-4" />}
                {dispensing ? "Processando..." : "Confirmar Dispensação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Prescricoes;
