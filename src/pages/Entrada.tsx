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
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Trash2, Upload, PackagePlus, FileText } from "lucide-react";
import type { Medicamento, Fornecedor } from "@/types/database";

interface EntradaItem {
  medicamento_id: string;
  medicamento_nome: string;
  numero_lote: string;
  validade: string;
  quantidade: number;
  preco_unitario: number;
}

const Entrada = () => {
  const { log } = useAudit();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [meds, setMeds] = useState<Medicamento[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorId, setFornecedorId] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<EntradaItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [curMedId, setCurMedId] = useState("");
  const [curLote, setCurLote] = useState("");
  const [curValidade, setCurValidade] = useState("");
  const [curQtd, setCurQtd] = useState(0);
  const [curPreco, setCurPreco] = useState(0);

  useEffect(() => {
    Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("fornecedores").select("*").eq("ativo", true).order("nome"),
    ]).then(([{ data: m }, { data: f }]) => {
      setMeds((m as Medicamento[]) || []);
      setFornecedores((f as Fornecedor[]) || []);

      // Pre-select from query param
      const medId = searchParams.get("medicamento_id");
      if (medId && (m || []).find((med: any) => med.id === medId)) {
        setCurMedId(medId);
      }
    });
  }, []);

  const addItem = () => {
    if (!curMedId || !curLote || !curQtd) {
      toast.error("Preencha medicamento, lote e quantidade");
      return;
    }
    const med = meds.find((m) => m.id === curMedId);
    setItems((prev) => [
      ...prev,
      {
        medicamento_id: curMedId,
        medicamento_nome: med ? `${med.nome} ${med.concentracao}` : "",
        numero_lote: curLote,
        validade: curValidade || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        quantidade: curQtd,
        preco_unitario: curPreco,
      },
    ]);
    setCurMedId("");
    setCurLote("");
    setCurValidade("");
    setCurQtd(0);
    setCurPreco(0);
    toast.success("Item adicionado");
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }
    setSaving(true);

    let nfUrl: string | null = null;

    if (nfFile) {
      setUploading(true);
      const ext = nfFile.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("notas_fiscais").upload(path, nfFile);
      if (uploadErr) {
        toast.error("Erro ao fazer upload da nota fiscal");
      } else {
        nfUrl = path;
      }
      setUploading(false);
    }

    for (const item of items) {
      const { data: lote, error } = await supabase
        .from("lotes")
        .insert({
          medicamento_id: item.medicamento_id,
          numero_lote: item.numero_lote,
          validade: item.validade,
          quantidade_atual: item.quantidade,
          preco_unitario: item.preco_unitario,
        })
        .select()
        .single();

      if (error) {
        toast.error(`Erro ao criar lote ${item.numero_lote}`);
        continue;
      }

      await supabase.from("movimentacoes").insert({
        tipo: "entrada" as any,
        medicamento_id: item.medicamento_id,
        lote_id: lote.id,
        quantidade: item.quantidade,
        usuario_id: user?.id,
        nota_fiscal: notaFiscal || null,
        observacao: observacao || `NF: ${notaFiscal || "—"} | Fornecedor: ${fornecedores.find((f) => f.id === fornecedorId)?.nome || "—"}`,
      });

      await log({
        acao: "Entrada de Medicamento",
        tabela: "lotes",
        registro_id: lote.id,
        dados_novos: { ...item, nota_fiscal: notaFiscal, fornecedor_id: fornecedorId },
      });
    }

    toast.success(`${items.length} item(ns) registrado(s) com sucesso!`);
    setItems([]);
    setFornecedorId("");
    setNotaFiscal("");
    setObservacao("");
    setNfFile(null);
    setSaving(false);
  };

  const totalUnits = items.reduce((s, i) => s + i.quantidade, 0);
  const totalValue = items.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);

  return (
    <AppLayout title="Entrada de Medicamentos" subtitle="Registrar recebimento">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 shadow-card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              Dados da Nota Fiscal
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor</Label>
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Número da NF</Label>
                <Input value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} placeholder="Ex: 001234" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Anexar NF (PDF/imagem)</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setNfFile(e.target.files?.[0] || null)} className="text-xs" />
                  {nfFile && <Badge variant="outline" className="text-[10px] shrink-0"><Upload className="h-3 w-3 mr-1" />{nfFile.name.slice(0, 20)}</Badge>}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 shadow-card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <PackagePlus className="h-4 w-4 text-primary" />
              Adicionar Itens
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label className="text-xs">Medicamento</Label>
                <Select value={curMedId} onValueChange={setCurMedId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{meds.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Lote</Label><Input value={curLote} onChange={(e) => setCurLote(e.target.value)} className="font-mono" placeholder="ABC123" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Validade</Label><Input type="date" value={curValidade} onChange={(e) => setCurValidade(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Qtd</Label><Input type="number" min={1} value={curQtd || ""} onChange={(e) => setCurQtd(Number(e.target.value))} /></div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Preço Unit. (R$)</Label><Input type="number" step="0.01" value={curPreco || ""} onChange={(e) => setCurPreco(Number(e.target.value))} /></div>
              <div className="flex items-end"><Button onClick={addItem} variant="outline" className="gap-2 w-full"><Plus className="h-4 w-4" /> Adicionar</Button></div>
            </div>
          </Card>

          {items.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                      <TableHead className="text-xs font-semibold">Lote</TableHead>
                      <TableHead className="text-xs font-semibold">Validade</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Preço</TableHead>
                      <TableHead className="text-xs font-semibold w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm font-medium">{item.medicamento_nome}</TableCell>
                        <TableCell className="text-sm font-mono">{item.numero_lote}</TableCell>
                        <TableCell className="text-sm">{new Date(item.validade).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-center font-semibold">{item.quantidade}</TableCell>
                        <TableCell className="text-right text-sm">R$ {item.preco_unitario.toFixed(2)}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 shadow-card space-y-4">
            <h3 className="text-sm font-semibold">Resumo da Entrada</h3>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Itens</span><span className="font-semibold">{items.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total unidades</span><span className="font-semibold">{totalUnits}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor total</span><span className="font-semibold">R$ {totalValue.toFixed(2)}</span></div>
              {fornecedorId && <div className="flex justify-between"><span className="text-muted-foreground">Fornecedor</span><span className="font-medium text-xs">{fornecedores.find((f) => f.id === fornecedorId)?.nome}</span></div>}
            </div>
            <Separator />
            <div className="space-y-1.5"><Label className="text-xs">Observação geral</Label><Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} placeholder="Opcional..." /></div>
            <Button onClick={handleSubmit} disabled={saving || items.length === 0} className="w-full gradient-primary text-primary-foreground gap-2">
              {saving ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><PackagePlus className="h-4 w-4" />Confirmar Entrada</>}
            </Button>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Entrada;
