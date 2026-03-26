import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ClipboardList, AlertTriangle, Search } from "lucide-react";
import type { Medicamento, Lote, Prescricao } from "@/types/database";

const Dispensacao = () => {
  const { log } = useAudit();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [form, setForm] = useState({ medicamento_id: "", lote_id: "", quantidade: 0, paciente: "", prontuario: "", setor: "", observacao: "", prescricao_id: "" });
  const [histSearch, setHistSearch] = useState("");
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const [{ data: medsData }, { data: lotesData }, { data: histData }, { data: prescData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").eq("ativo", true).gt("quantidade_atual", 0),
      supabase.from("movimentacoes").select("*, medicamentos(nome, concentracao)").eq("tipo", "dispensacao").order("created_at", { ascending: false }).limit(50),
      supabase.from("prescricoes").select("*").in("status", ["ativa", "parcialmente_dispensada"]).order("created_at", { ascending: false }),
    ]);
    const medsWithLotes = (medsData || []).map((m: any) => ({
      ...m,
      // Sort lotes by validade ascending (FEFO)
      lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id).sort((a: any, b: any) => new Date(a.validade).getTime() - new Date(b.validade).getTime()),
    }));
    setMeds(medsWithLotes);
    setHistory(histData || []);
    setPrescricoes((prescData as Prescricao[]) || []);

    // Pre-select from query param
    const medId = searchParams.get("medicamento_id");
    if (medId && medsWithLotes.find((m: any) => m.id === medId)) {
      const med = medsWithLotes.find((m: any) => m.id === medId);
      setForm(prev => ({
        ...prev,
        medicamento_id: medId,
        lote_id: med?.lotes?.[0]?.id || "",
      }));
    }
  };

  useEffect(() => { loadData(); }, []);

  const selectedMed = meds.find(m => m.id === form.medicamento_id);
  const selectedLote = selectedMed?.lotes.find(l => l.id === form.lote_id);

  // Auto-select FEFO lote when med changes
  const handleMedChange = (medId: string) => {
    const med = meds.find(m => m.id === medId);
    const fefoLote = med?.lotes?.[0]; // Already sorted by validade
    setForm({ ...form, medicamento_id: medId, lote_id: fefoLote?.id || "" });
  };

  // Handle prescricao selection
  const handlePrescricaoChange = (prescId: string) => {
    if (prescId === "none") {
      setForm({ ...form, prescricao_id: "" });
      return;
    }
    const presc = prescricoes.find(p => p.id === prescId);
    if (presc) {
      setForm({
        ...form,
        prescricao_id: prescId,
        paciente: presc.paciente,
        prontuario: presc.prontuario || "",
        setor: presc.setor || "",
      });
    }
  };

  // Check if user selected a non-FEFO lote
  const isNonFefoLote = selectedMed && selectedMed.lotes.length > 0 && form.lote_id && form.lote_id !== selectedMed.lotes[0]?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicamento_id || !form.lote_id || !form.quantidade) { toast.error("Preencha todos os campos obrigatórios"); return; }

    setSubmitting(true);

    // Server-side stock validation
    const { data: freshLote, error: loteErr } = await supabase
      .from("lotes")
      .select("quantidade_atual")
      .eq("id", form.lote_id)
      .single();

    if (loteErr || !freshLote) {
      toast.error("Erro ao verificar estoque do lote");
      setSubmitting(false);
      return;
    }

    if (freshLote.quantidade_atual < form.quantidade) {
      toast.error(`Estoque insuficiente! Disponível no servidor: ${freshLote.quantidade_atual} unidades`);
      setSubmitting(false);
      return;
    }

    await supabase.from("lotes").update({ quantidade_atual: freshLote.quantidade_atual - form.quantidade }).eq("id", form.lote_id);

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
      prescricao_id: form.prescricao_id || null,
    });

    await log({ acao: "Dispensação", tabela: "movimentacoes", dados_novos: form });
    toast.success("Dispensação registrada!");
    setForm({ medicamento_id: "", lote_id: "", quantidade: 0, paciente: "", prontuario: "", setor: "", observacao: "", prescricao_id: "" });
    setSubmitting(false);
    loadData();
  };

  // Filter history
  const filteredHistory = history.filter(h => {
    const matchSearch = !histSearch || h.paciente?.toLowerCase().includes(histSearch.toLowerCase()) || h.prontuario?.toLowerCase().includes(histSearch.toLowerCase()) || h.medicamentos?.nome?.toLowerCase().includes(histSearch.toLowerCase());
    const d = h.created_at?.slice(0, 10);
    const matchFrom = !histDateFrom || d >= histDateFrom;
    const matchTo = !histDateTo || d <= histDateTo;
    return matchSearch && matchFrom && matchTo;
  });

  return (
    <AppLayout title="Dispensação" subtitle="Registrar saída de medicamentos">
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
            {/* Prescrição opcional */}
            <div className="space-y-1.5">
              <Label className="text-xs">Prescrição (opcional)</Label>
              <Select value={form.prescricao_id || "none"} onValueChange={handlePrescricaoChange}>
                <SelectTrigger><SelectValue placeholder="Vincular prescrição" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem prescrição</SelectItem>
                  {prescricoes.map(p => <SelectItem key={p.id} value={p.id}>#{p.numero_receita} — {p.paciente}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Medicamento *</Label>
              <Select value={form.medicamento_id} onValueChange={handleMedChange}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{meds.filter(m => m.lotes.length > 0).map(m => <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedMed && (
              <div className="space-y-1.5">
                <Label className="text-xs">Lote * <span className="text-muted-foreground">(FEFO automático)</span></Label>
                <Select value={form.lote_id} onValueChange={v => setForm({ ...form, lote_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar lote" /></SelectTrigger>
                  <SelectContent>{selectedMed.lotes.map((l, i) => (
                    <SelectItem key={l.id} value={l.id}>
                      {i === 0 ? "⚡ " : ""}Lote {l.numero_lote} — {l.quantidade_atual} un. — Val: {new Date(l.validade).toLocaleDateString("pt-BR")}
                    </SelectItem>
                  ))}</SelectContent>
                </Select>
                {isNonFefoLote && (
                  <div className="flex items-center gap-1.5 text-warning text-[11px] mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    Você está selecionando um lote com validade mais distante. O FEFO recomenda o primeiro lote da lista.
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Quantidade *</Label><Input type="number" min={1} value={form.quantidade || ""} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Setor</Label><Input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} placeholder="Ala A, B..." /></div>
              <div className="space-y-1.5"><Label className="text-xs">Paciente</Label><Input value={form.paciente} onChange={e => setForm({ ...form, paciente: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Prontuário</Label><Input value={form.prontuario} onChange={e => setForm({ ...form, prontuario: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} /></div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={submitting}>
              {submitting ? "Processando..." : "Registrar Dispensação"}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-xl border bg-card shadow-card overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Últimas Dispensações</h3>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 p-3 border-b bg-muted/30">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Paciente/prontuário..." value={histSearch} onChange={e => setHistSearch(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
              <Input type="date" value={histDateFrom} onChange={e => setHistDateFrom(e.target.value)} className="h-8 text-xs w-[130px]" />
              <Input type="date" value={histDateTo} onChange={e => setHistDateTo(e.target.value)} className="h-8 text-xs w-[130px]" />
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
                {filteredHistory.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Nenhuma dispensação registrada</TableCell></TableRow>
                ) : filteredHistory.map(h => (
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
