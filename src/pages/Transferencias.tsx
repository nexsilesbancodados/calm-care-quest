import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Clock, Truck, CheckCircle2, XCircle, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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
  const { user } = useAuth();
  const { log } = useAudit();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [clinicas, setClinicas] = useState<ClinicaParceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ medicamento_id: "", lote_id: "", quantidade: 0, clinica_destino_id: "", urgencia: false, observacao: "" });

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
      lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
    })));
    setClinicas(cData as ClinicaParceira[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const selectedMed = meds.find(m => m.id === form.medicamento_id);

  const handleCreate = async () => {
    if (!form.medicamento_id || !form.clinica_destino_id || !form.quantidade || !form.lote_id) {
      toast.error("Preencha todos os campos obrigatórios (incluindo lote)");
      return;
    }
    const { data, error } = await supabase.from("transferencias").insert({
      medicamento_id: form.medicamento_id,
      lote_id: form.lote_id,
      quantidade: form.quantidade,
      clinica_destino_id: form.clinica_destino_id,
      urgencia: form.urgencia,
      observacao: form.observacao,
      solicitante_id: user?.id,
      status: "pendente" as any,
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
    toast.success(`Status atualizado: ${statusCfg[status].label}`);
  };

  const filtered = transfers.filter(t => {
    const matchSearch = !search || t.medicamentos?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    all: transfers.length,
    pendente: transfers.filter(t => t.status === "pendente").length,
    aprovado: transfers.filter(t => t.status === "aprovado").length,
    enviado: transfers.filter(t => t.status === "enviado").length,
    recebido: transfers.filter(t => t.status === "recebido").length,
    cancelado: transfers.filter(t => t.status === "cancelado").length,
  };

  if (loading) return <AppLayout title="Transferências"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout
      title="Transferências"
      subtitle={`${transfers.length} transferências • ${statusCounts.pendente} pendentes`}
      actions={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      }
    >
      {/* Status Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
        {(["pendente", "aprovado", "enviado", "recebido", "cancelado"] as const).map((s, i) => {
          const cfg = statusCfg[s];
          return (
            <motion.div
              key={s}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-xl border bg-card p-3 shadow-card cursor-pointer transition-all hover:shadow-card-hover text-center",
                statusFilter === s && "ring-2 ring-primary"
              )}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <div className={cn("flex h-8 w-8 mx-auto items-center justify-center rounded-lg mb-1.5", cfg.className)}>
                <cfg.icon className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold">{statusCounts[s]}</p>
              <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar medicamento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Nova Transferência
        </Button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Data</TableHead>
              <TableHead className="text-xs font-semibold">Medicamento</TableHead>
              <TableHead className="text-xs font-semibold">Lote</TableHead>
              <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
              <TableHead className="text-xs font-semibold">Origem</TableHead>
              <TableHead className="text-xs font-semibold">Destino</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                      <Truck className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhuma transferência encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map(t => {
              const cfg = statusCfg[t.status] || statusCfg.pendente;
              return (
                <TableRow key={t.id} className="hover:bg-accent/30">
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.medicamentos?.nome || "—"}</span>
                      {t.urgencia && (
                        <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 gap-0.5">
                          <Zap className="h-2.5 w-2.5" /> Urgente
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {t.lotes?.numero_lote || "—"}
                  </TableCell>
                  <TableCell className="text-center font-semibold">{t.quantidade}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.clinica_origem?.nome || "Sede"}</TableCell>
                  <TableCell className="text-sm">{t.clinica_destino?.nome || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[11px] gap-1", cfg.className)}>
                      <cfg.icon className="h-3 w-3" />{cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t.status === "pendente" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(t.id, "aprovado")}>Aprovar</Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => updateStatus(t.id, "cancelado")}>Cancelar</Button>
                      </div>
                    )}
                    {t.status === "aprovado" && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(t.id, "enviado")}>Enviar</Button>}
                    {t.status === "enviado" && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(t.id, "recebido")}>Recebido</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Nova Transferência</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Medicamento *</Label>
              <Select value={form.medicamento_id} onValueChange={v => setForm({ ...form, medicamento_id: v, lote_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{meds.filter(m => m.lotes && m.lotes.length > 0).map(m => <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedMed && selectedMed.lotes && selectedMed.lotes.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Lote *</Label>
                <Select value={form.lote_id} onValueChange={v => setForm({ ...form, lote_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
                  <SelectContent>
                    {selectedMed.lotes.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        Lote {l.numero_lote} — {l.quantidade_atual} un. — Val: {new Date(l.validade).toLocaleDateString("pt-BR")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Clínica Destino *</Label>
              <Select value={form.clinica_destino_id} onValueChange={v => setForm({ ...form, clinica_destino_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{clinicas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Quantidade *</Label>
                <Input type="number" min={1} value={form.quantidade || ""} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} />
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
              <Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} placeholder="Motivo ou detalhes adicionais..." />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="gradient-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Criar Transferência
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Transferencias;
