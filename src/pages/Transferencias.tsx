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
import { Search, Plus, Clock, Truck, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Transferencia, Medicamento, ClinicaParceira, Lote, StatusTransferencia } from "@/types/database";

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
  const [meds, setMeds] = useState<Medicamento[]>([]);
  const [clinicas, setClinicas] = useState<ClinicaParceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ medicamento_id: "", quantidade: 0, clinica_destino_id: "", urgencia: false, observacao: "" });

  useEffect(() => {
    const fetch = async () => {
      const [{ data: tData }, { data: mData }, { data: cData }] = await Promise.all([
        supabase.from("transferencias").select("*, medicamentos(nome, concentracao), clinica_origem:clinicas_parceiras!transferencias_clinica_origem_id_fkey(nome), clinica_destino:clinicas_parceiras!transferencias_clinica_destino_id_fkey(nome)").order("created_at", { ascending: false }),
        supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
        supabase.from("clinicas_parceiras").select("*").eq("ativo", true).order("nome"),
      ]);
      setTransfers(tData || []);
      setMeds(mData as Medicamento[] || []);
      setClinicas(cData as ClinicaParceira[] || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleCreate = async () => {
    if (!form.medicamento_id || !form.clinica_destino_id || !form.quantidade) { toast.error("Preencha todos os campos"); return; }
    const { data, error } = await supabase.from("transferencias").insert({
      medicamento_id: form.medicamento_id,
      quantidade: form.quantidade,
      clinica_destino_id: form.clinica_destino_id,
      urgencia: form.urgencia,
      observacao: form.observacao,
      solicitante_id: user?.id,
      status: "pendente" as any,
    }).select("*, medicamentos(nome, concentracao), clinica_destino:clinicas_parceiras!transferencias_clinica_destino_id_fkey(nome)").single();
    if (error) { toast.error("Erro ao criar transferência"); return; }
    setTransfers(prev => [data, ...prev]);
    await log({ acao: "Nova Transferência", tabela: "transferencias", registro_id: data.id });
    toast.success("Transferência criada!");
    setDialogOpen(false);
    setForm({ medicamento_id: "", quantidade: 0, clinica_destino_id: "", urgencia: false, observacao: "" });
  };

  const updateStatus = async (id: string, status: StatusTransferencia) => {
    await supabase.from("transferencias").update({ status, aprovador_id: user?.id }).eq("id", id);
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    await log({ acao: `Transferência ${status}`, tabela: "transferencias", registro_id: id });
    toast.success(`Status atualizado: ${statusCfg[status].label}`);
  };

  const filtered = transfers.filter(t => !search || t.medicamentos?.nome?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <AppLayout title="Transferências"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout title="Transferências" subtitle={`${transfers.length} transferências`}>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Nova</Button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">Data</TableHead>
            <TableHead className="text-xs font-semibold">Medicamento</TableHead>
            <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
            <TableHead className="text-xs font-semibold">Destino</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma transferência</TableCell></TableRow> : filtered.map(t => {
              const cfg = statusCfg[t.status] || statusCfg.pendente;
              return (
                <TableRow key={t.id}>
                  <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium text-sm">{t.medicamentos?.nome || "—"}</TableCell>
                  <TableCell className="text-center font-semibold">{t.quantidade}</TableCell>
                  <TableCell className="text-sm">{t.clinica_destino?.nome || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[11px] gap-1", cfg.className)}><cfg.icon className="h-3 w-3" />{cfg.label}</Badge></TableCell>
                  <TableCell>
                    {t.status === "pendente" && <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(t.id, "aprovado")}>Aprovar</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => updateStatus(t.id, "cancelado")}>Cancelar</Button>
                    </div>}
                    {t.status === "aprovado" && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(t.id, "enviado")}>Marcar Enviado</Button>}
                    {t.status === "enviado" && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(t.id, "recebido")}>Confirmar Recebimento</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Nova Transferência</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label className="text-xs">Medicamento</Label>
              <Select value={form.medicamento_id} onValueChange={v => setForm({ ...form, medicamento_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{meds.map(m => <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Clínica Destino</Label>
              <Select value={form.clinica_destino_id} onValueChange={v => setForm({ ...form, clinica_destino_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{clinicas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Quantidade</Label><Input type="number" min={1} value={form.quantidade || ""} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.urgencia} onChange={e => setForm({ ...form, urgencia: e.target.checked })} id="urg" />
              <label htmlFor="urg" className="text-xs">Urgente</label>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreate} className="gradient-primary text-primary-foreground">Criar</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Transferencias;
