import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ClipboardList } from "lucide-react";
import type { Medicamento, Lote } from "@/types/database";

const Dispensacao = () => {
  const { log } = useAudit();
  const { user } = useAuth();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({ medicamento_id: "", lote_id: "", quantidade: 0, paciente: "", prontuario: "", setor: "", observacao: "" });

  const loadData = async () => {
    const [{ data: medsData }, { data: lotesData }, { data: histData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").eq("ativo", true).gt("quantidade_atual", 0),
      supabase.from("movimentacoes").select("*, medicamentos(nome, concentracao)").eq("tipo", "dispensacao").order("created_at", { ascending: false }).limit(20),
    ]);
    setMeds((medsData || []).map((m: any) => ({ ...m, lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id) })));
    setHistory(histData || []);
  };

  useEffect(() => { loadData(); }, []);

  const selectedMed = meds.find(m => m.id === form.medicamento_id);
  const selectedLote = selectedMed?.lotes.find(l => l.id === form.lote_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicamento_id || !form.lote_id || !form.quantidade) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (selectedLote && form.quantidade > selectedLote.quantidade_atual) { toast.error(`Estoque insuficiente! Disponível: ${selectedLote.quantidade_atual}`); return; }

    await supabase.from("lotes").update({ quantidade_atual: (selectedLote?.quantidade_atual || 0) - form.quantidade }).eq("id", form.lote_id);

    await supabase.from("movimentacoes").insert({
      tipo: "dispensacao" as any,
      medicamento_id: form.medicamento_id,
      lote_id: form.lote_id,
      quantidade: form.quantidade,
      usuario_id: user?.id,
      paciente: form.paciente || null,
      prontuario: form.prontuario || null,
      setor: form.setor || null,
      observacao: form.observacao,
    });

    await log({ acao: "Dispensação", tabela: "movimentacoes", dados_novos: form });
    toast.success("Dispensação registrada!");
    setForm({ medicamento_id: "", lote_id: "", quantidade: 0, paciente: "", prontuario: "", setor: "", observacao: "" });
    loadData();
  };

  return (
    <AppLayout title="Dispensação" subtitle="Registrar saída de medicamentos">
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
            <div className="space-y-1.5">
              <Label className="text-xs">Medicamento *</Label>
              <Select value={form.medicamento_id} onValueChange={v => setForm({ ...form, medicamento_id: v, lote_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{meds.filter(m => m.lotes.length > 0).map(m => <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedMed && (
              <div className="space-y-1.5">
                <Label className="text-xs">Lote *</Label>
                <Select value={form.lote_id} onValueChange={v => setForm({ ...form, lote_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
                  <SelectContent>{selectedMed.lotes.map(l => <SelectItem key={l.id} value={l.id}>Lote {l.numero_lote} — {l.quantidade_atual} un. — Val: {new Date(l.validade).toLocaleDateString("pt-BR")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Quantidade *</Label><Input type="number" min={1} value={form.quantidade || ""} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Setor</Label><Input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} placeholder="Ala A, B..." /></div>
              <div className="space-y-1.5"><Label className="text-xs">Paciente</Label><Input value={form.paciente} onChange={e => setForm({ ...form, paciente: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Prontuário</Label><Input value={form.prontuario} onChange={e => setForm({ ...form, prontuario: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} /></div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">Registrar Dispensação</Button>
          </form>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-xl border bg-card shadow-card overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Últimas Dispensações</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Medicamento</TableHead>
                  <TableHead className="text-xs text-center">Qtd</TableHead>
                  <TableHead className="text-xs">Paciente</TableHead>
                  <TableHead className="text-xs">Setor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Nenhuma dispensação registrada</TableCell></TableRow>
                ) : history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                    <TableCell className="text-sm font-medium">{h.medicamentos?.nome || "—"}</TableCell>
                    <TableCell className="text-center font-semibold text-sm">{h.quantidade}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.paciente || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.setor || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dispensacao;
