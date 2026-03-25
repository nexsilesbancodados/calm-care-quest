import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Medicamento } from "@/types/database";

const Entrada = () => {
  const { log } = useAudit();
  const { user } = useAuth();
  const [meds, setMeds] = useState<Medicamento[]>([]);
  const [form, setForm] = useState({ medicamento_id: "", numero_lote: "", validade: "", quantidade: 0, preco_unitario: 0, nota_fiscal: "", observacao: "" });

  useEffect(() => {
    supabase.from("medicamentos").select("*").eq("ativo", true).order("nome").then(({ data }) => setMeds(data as Medicamento[] || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicamento_id || !form.numero_lote || !form.quantidade) { toast.error("Preencha medicamento, lote e quantidade"); return; }

    const { data: lote, error } = await supabase.from("lotes").insert({
      medicamento_id: form.medicamento_id,
      numero_lote: form.numero_lote,
      validade: form.validade || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      quantidade_atual: form.quantidade,
      preco_unitario: form.preco_unitario,
    }).select().single();
    if (error) { toast.error("Erro ao criar lote"); return; }

    await supabase.from("movimentacoes").insert({
      tipo: "entrada" as any,
      medicamento_id: form.medicamento_id,
      lote_id: lote.id,
      quantidade: form.quantidade,
      usuario_id: user?.id,
      nota_fiscal: form.nota_fiscal || null,
      observacao: form.observacao,
    });

    await log({ acao: "Entrada de Medicamento", tabela: "lotes", registro_id: lote.id, dados_novos: form });
    toast.success("Entrada registrada com sucesso!");
    setForm({ medicamento_id: "", numero_lote: "", validade: "", quantidade: 0, preco_unitario: 0, nota_fiscal: "", observacao: "" });
  };

  return (
    <AppLayout title="Entrada de Medicamentos" subtitle="Registrar recebimento de medicamentos">
      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
          <div className="space-y-1.5">
            <Label className="text-xs">Medicamento</Label>
            <Select value={form.medicamento_id} onValueChange={v => setForm({ ...form, medicamento_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar medicamento" /></SelectTrigger>
              <SelectContent>{meds.map(m => <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Número do Lote</Label><Input value={form.numero_lote} onChange={e => setForm({ ...form, numero_lote: e.target.value })} className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Validade</Label><Input type="date" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Quantidade</Label><Input type="number" min={1} value={form.quantidade || ""} onChange={e => setForm({ ...form, quantidade: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Preço Unitário (R$)</Label><Input type="number" step="0.01" value={form.preco_unitario || ""} onChange={e => setForm({ ...form, preco_unitario: Number(e.target.value) })} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Nota Fiscal</Label><Input value={form.nota_fiscal} onChange={e => setForm({ ...form, nota_fiscal: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} /></div>
          <Button type="submit" className="w-full gradient-primary text-primary-foreground">Registrar Entrada</Button>
        </form>
      </div>
    </AppLayout>
  );
};

export default Entrada;
