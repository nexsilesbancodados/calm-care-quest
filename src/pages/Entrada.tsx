import React, { useState, useEffect, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Upload, PackagePlus, FileText, Search, CheckCircle2,
  AlertTriangle, Package, DollarSign, Clock, Copy, ArrowRight, Info,
  History, ChevronRight, Calendar, ShieldAlert, X, Edit2
} from "lucide-react";
import type { Medicamento, Fornecedor, Lote, Movimentacao } from "@/types/database";

interface EntradaItem {
  medicamento_id: string;
  medicamento_nome: string;
  numero_lote: string;
  validade: string;
  quantidade: number;
  preco_unitario: number;
  isExistingLote?: boolean;
  lote_id?: string;
}

const Entrada = () => {
  const { log } = useAudit();
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [meds, setMeds] = useState<Medicamento[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [recentEntradas, setRecentEntradas] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  // NF
  const [fornecedorId, setFornecedorId] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Items
  const [items, setItems] = useState<EntradaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  // Add item form
  const [medSearch, setMedSearch] = useState("");
  const [curMedId, setCurMedId] = useState("");
  const [curLote, setCurLote] = useState("");
  const [curValidade, setCurValidade] = useState("");
  const [curQtd, setCurQtd] = useState(0);
  const [curPreco, setCurPreco] = useState(0);
  const [loteExistente, setLoteExistente] = useState<string>("new");

  // Confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Active tab
  const [tab, setTab] = useState("entrada");

  const qtdInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("fornecedores").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").eq("ativo", true),
      supabase.from("movimentacoes").select("*, medicamento:medicamentos(nome, concentracao)").eq("tipo", "entrada").order("created_at", { ascending: false }).limit(20),
    ]).then(([{ data: m }, { data: f }, { data: l }, { data: mov }]) => {
      setMeds((m as Medicamento[]) || []);
      setFornecedores((f as Fornecedor[]) || []);
      setLotes((l as Lote[]) || []);
      setRecentEntradas((mov as any[]) || []);

      const medId = searchParams.get("medicamento_id");
      if (medId && (m || []).find((med: any) => med.id === medId)) {
        setCurMedId(medId);
        // Focus quantity field when coming from reposition
        setTimeout(() => qtdInputRef.current?.focus(), 300);
      }
      setLoading(false);
    });
  }, []);

  // Lotes do medicamento selecionado
  const medLotes = useMemo(() =>
    lotes.filter(l => l.medicamento_id === curMedId && l.ativo),
    [lotes, curMedId]
  );

  const selectedMed = meds.find(m => m.id === curMedId);

  // Filtro de medicamentos na busca
  const filteredMeds = useMemo(() => {
    if (!medSearch) return meds;
    const s = medSearch.toLowerCase();
    return meds.filter(m =>
      m.nome.toLowerCase().includes(s) ||
      m.generico.toLowerCase().includes(s) ||
      m.principio_ativo.toLowerCase().includes(s) ||
      m.codigo_barras?.includes(medSearch)
    );
  }, [meds, medSearch]);

  const resetForm = () => {
    setCurMedId("");
    setCurLote("");
    setCurValidade("");
    setCurQtd(0);
    setCurPreco(0);
    setLoteExistente("new");
    setMedSearch("");
    setEditIdx(null);
  };

  const handleLoteExistenteChange = (loteId: string) => {
    setLoteExistente(loteId);
    if (loteId !== "new") {
      const lote = lotes.find(l => l.id === loteId);
      if (lote) {
        setCurLote(lote.numero_lote);
        setCurValidade(lote.validade);
        setCurPreco(Number(lote.preco_unitario));
      }
    } else {
      setCurLote("");
      setCurValidade("");
      setCurPreco(0);
    }
  };

  const addItem = () => {
    if (!curMedId) { toast.error("Selecione um medicamento"); return; }
    if (!curLote.trim()) { toast.error("Informe o número do lote"); return; }
    if (curQtd <= 0) { toast.error("Quantidade deve ser maior que zero"); return; }
    if (!curValidade) { toast.error("Informe a data de validade"); return; }

    const med = meds.find((m) => m.id === curMedId);
    const newItem: EntradaItem = {
      medicamento_id: curMedId,
      medicamento_nome: med ? `${med.nome} ${med.concentracao}` : "",
      numero_lote: curLote.trim().toUpperCase(),
      validade: curValidade,
      quantidade: curQtd,
      preco_unitario: curPreco,
      isExistingLote: loteExistente !== "new",
      lote_id: loteExistente !== "new" ? loteExistente : undefined,
    };

    if (editIdx !== null) {
      setItems(prev => prev.map((it, i) => i === editIdx ? newItem : it));
      toast.success("Item atualizado");
    } else {
      // Check duplicate lote
      const dup = items.find(i => i.medicamento_id === curMedId && i.numero_lote === curLote.trim().toUpperCase());
      if (dup) {
        toast.error("Este lote já foi adicionado para este medicamento");
        return;
      }
      setItems(prev => [...prev, newItem]);
      toast.success("Item adicionado à lista");
    }
    resetForm();
  };

  const editItem = (idx: number) => {
    const item = items[idx];
    setCurMedId(item.medicamento_id);
    setCurLote(item.numero_lote);
    setCurValidade(item.validade);
    setCurQtd(item.quantidade);
    setCurPreco(item.preco_unitario);
    setLoteExistente(item.lote_id || "new");
    setEditIdx(idx);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    if (editIdx === idx) resetForm();
  };

  const duplicateItem = (idx: number) => {
    const item = items[idx];
    setCurMedId(item.medicamento_id);
    setCurLote("");
    setCurValidade(item.validade);
    setCurQtd(item.quantidade);
    setCurPreco(item.preco_unitario);
    setLoteExistente("new");
    toast.info("Dados copiados — altere o lote e adicione");
  };

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error("Adicione pelo menos um item"); return; }
    setConfirmOpen(false);
    setSaving(true);

    let nfUrl: string | null = null;
    if (nfFile) {
      setUploading(true);
      const ext = nfFile.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("notas_fiscais").upload(path, nfFile);
      if (uploadErr) toast.error("Erro ao fazer upload da nota fiscal");
      else nfUrl = path;
      setUploading(false);
    }

    let successCount = 0;
    for (const item of items) {
      let loteId = item.lote_id;

      if (item.isExistingLote && item.lote_id) {
        // Add to existing lote
        const existingLote = lotes.find(l => l.id === item.lote_id);
        if (existingLote) {
          const novaQtd = existingLote.quantidade_atual + item.quantidade;
          const { error } = await supabase.from("lotes").update({ quantidade_atual: novaQtd }).eq("id", item.lote_id);
          if (error) { toast.error(`Erro ao atualizar lote ${item.numero_lote}`); continue; }
        }
      } else {
        // Create new lote
        const { data: lote, error } = await supabase
          .from("lotes")
          .insert({
            medicamento_id: item.medicamento_id,
            numero_lote: item.numero_lote,
            validade: item.validade,
            quantidade_atual: item.quantidade,
            preco_unitario: item.preco_unitario,
            filial_id: profile?.filial_id,
          })
          .select()
          .single();
        if (error) { toast.error(`Erro ao criar lote ${item.numero_lote}`); continue; }
        loteId = lote.id;
      }

      await supabase.from("movimentacoes").insert({
        tipo: "entrada" as any,
        medicamento_id: item.medicamento_id,
        lote_id: loteId,
        quantidade: item.quantidade,
        usuario_id: user?.id,
        nota_fiscal: notaFiscal || null,
        observacao: observacao || `NF: ${notaFiscal || "—"} | Fornecedor: ${fornecedores.find(f => f.id === fornecedorId)?.nome || "—"}`,
        filial_id: profile?.filial_id,
      });

      await log({
        acao: "Entrada de Medicamento",
        tabela: "lotes",
        registro_id: loteId || "",
        dados_novos: { ...item, nota_fiscal: notaFiscal, fornecedor_id: fornecedorId },
      });
      successCount++;
    }

    toast.success(`${successCount} item(ns) registrado(s) com sucesso!`);
    setItems([]);
    setFornecedorId("");
    setNotaFiscal("");
    setObservacao("");
    setNfFile(null);
    setSaving(false);

    // Refresh data
    const [{ data: l }, { data: mov }] = await Promise.all([
      supabase.from("lotes").select("*").eq("ativo", true),
      supabase.from("movimentacoes").select("*, medicamento:medicamentos(nome, concentracao)").eq("tipo", "entrada").order("created_at", { ascending: false }).limit(20),
    ]);
    setLotes((l as Lote[]) || []);
    setRecentEntradas((mov as any[]) || []);
  };

  const totalUnits = items.reduce((s, i) => s + i.quantidade, 0);
  const totalValue = items.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);

  const now = new Date();

  if (loading) return (
    <AppLayout title="Entrada de Medicamentos">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Entrada de Medicamentos" subtitle="Registrar recebimento de itens">
      <TooltipProvider>
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
          {[
            { label: "Itens na Lista", value: items.length, icon: Package, color: "text-primary", bg: "bg-primary/10" },
            { label: "Total Unidades", value: totalUnits.toLocaleString("pt-BR"), icon: PackagePlus, color: "text-success", bg: "bg-success/10" },
            { label: "Valor Total", value: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-info", bg: "bg-info/10" },
            { label: "Medicamentos Cad.", value: meds.length, icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn("flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl shrink-0", kpi.bg)}>
                  <kpi.icon className={cn("h-4 w-4 sm:h-[18px] sm:w-[18px]", kpi.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{kpi.label}</p>
                  <p className="text-base sm:text-lg font-bold leading-tight truncate">{kpi.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 sm:mb-5">
            <TabsTrigger value="entrada" className="gap-1.5 text-xs sm:text-sm">
              <PackagePlus className="h-3.5 w-3.5" /> Nova Entrada
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5 text-xs sm:text-sm">
              <History className="h-3.5 w-3.5" /> Últimas Entradas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entrada">
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
              {/* Left - Forms */}
              <div className="lg:col-span-2 space-y-4">
                {/* NF Card */}
                <Card className="p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Dados da Nota Fiscal
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Fornecedor</Label>
                      <Select value={fornecedorId} onValueChange={setFornecedorId}>
                        <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Número da NF</Label>
                      <Input value={notaFiscal} onChange={e => setNotaFiscal(e.target.value)} placeholder="Ex: 001234" className="font-mono h-10" maxLength={50} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                      <Label className="text-xs font-medium">Anexar NF (PDF/imagem)</Label>
                      <div className="flex items-center gap-2">
                        <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setNfFile(e.target.files?.[0] || null)} className="text-xs h-10" />
                        {nfFile && (
                          <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                            <Upload className="h-3 w-3" />
                            {nfFile.name.length > 12 ? nfFile.name.slice(0, 12) + "…" : nfFile.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Add Item Card */}
                <Card className="p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                        <PackagePlus className="h-3.5 w-3.5 text-accent" />
                      </div>
                      {editIdx !== null ? "Editar Item" : "Adicionar Item"}
                    </div>
                    {editIdx !== null && (
                      <Button variant="ghost" size="sm" onClick={resetForm} className="text-xs gap-1 text-muted-foreground">
                        <X className="h-3 w-3" /> Cancelar
                      </Button>
                    )}
                  </div>

                  {/* Medicamento select with search */}
                  <div className="space-y-1.5 mb-4">
                    <Label className="text-xs font-medium">Medicamento *</Label>
                    <Select value={curMedId} onValueChange={v => { setCurMedId(v); setLoteExistente("new"); setCurLote(""); setCurValidade(""); setCurPreco(0); }}>
                      <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Selecionar medicamento" /></SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input
                            placeholder="Buscar medicamento..."
                            value={medSearch}
                            onChange={e => setMedSearch(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        {filteredMeds.slice(0, 50).map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="flex items-center gap-2">
                              {m.nome} {m.concentracao}
                              {m.controlado && <ShieldAlert className="h-3 w-3 text-warning shrink-0" />}
                            </span>
                          </SelectItem>
                        ))}
                        {filteredMeds.length > 50 && (
                          <p className="text-[10px] text-muted-foreground px-2 py-1">+{filteredMeds.length - 50} resultados. Refine a busca.</p>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected med info */}
                  {selectedMed && (
                    <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-xs space-y-1 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{selectedMed.nome} {selectedMed.concentracao}</span>
                        {selectedMed.controlado && <Badge variant="outline" className="text-[9px] border-warning/30 text-warning bg-warning/5">Controlado</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                        <span>{selectedMed.forma_farmaceutica}</span>
                        <span>Mín: {selectedMed.estoque_minimo}</span>
                        <span>Local: {selectedMed.localizacao || "—"}</span>
                      </div>
                    </div>
                  )}

                  {/* Lote existente ou novo */}
                  {curMedId && medLotes.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        Lote
                        <Tooltip>
                          <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent className="text-xs max-w-[200px]">Selecione um lote existente para somar a quantidade, ou crie um novo.</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select value={loteExistente} onValueChange={handleLoteExistenteChange}>
                        <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Novo lote ou existente" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">🆕 Criar novo lote</SelectItem>
                          {medLotes.map(l => (
                            <SelectItem key={l.id} value={l.id}>
                              Lote {l.numero_lote} — {l.quantidade_atual} un — Val: {new Date(l.validade).toLocaleDateString("pt-BR")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Nº Lote *</Label>
                      <Input
                        value={curLote}
                        onChange={e => setCurLote(e.target.value)}
                        className="font-mono h-10"
                        placeholder="ABC123"
                        maxLength={50}
                        disabled={loteExistente !== "new"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Validade *</Label>
                      <Input
                        type="date"
                        value={curValidade}
                        onChange={e => setCurValidade(e.target.value)}
                        disabled={loteExistente !== "new"}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quantidade *</Label>
                      <Input
                        ref={qtdInputRef}
                        type="number"
                        min={1}
                        value={curQtd || ""}
                        onChange={e => setCurQtd(Number(e.target.value))}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Preço Unit. (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={curPreco || ""}
                        onChange={e => setCurPreco(Number(e.target.value))}
                        placeholder="0.00"
                        disabled={loteExistente !== "new"}
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Validade warning */}
                  {curValidade && (() => {
                    const diffDays = Math.ceil((new Date(curValidade).getTime() - now.getTime()) / 86400000);
                    if (diffDays <= 0) return (
                      <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-xl p-3 mb-4">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Este lote já está vencido!
                      </div>
                    );
                    if (diffDays <= 90) return (
                      <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-xl p-3 mb-4">
                        <Clock className="h-3.5 w-3.5 shrink-0" /> Vence em {diffDays} dias — atenção ao prazo
                      </div>
                    );
                    return null;
                  })()}

                  <div className="flex justify-end">
                    <Button onClick={addItem} className="gap-2 gradient-primary text-primary-foreground">
                      {editIdx !== null ? <><Edit2 className="h-4 w-4" /> Atualizar Item</> : <><Plus className="h-4 w-4" /> Adicionar à Lista</>}
                    </Button>
                  </div>
                </Card>

                {/* Items Table */}
                <AnimatePresence>
                  {items.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <Card className="shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            Itens da Entrada ({items.length})
                          </h3>
                          <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setItems([])}>
                            <Trash2 className="h-3 w-3 mr-1" /> Limpar tudo
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-muted/30">
                              <TableHead>Medicamento</TableHead>
                              <TableHead>Lote</TableHead>
                              <TableHead>Validade</TableHead>
                              <TableHead className="text-center">Qtd</TableHead>
                              <TableHead className="text-right">Preço Unit.</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                              <TableHead className="w-24"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item, idx) => {
                              const valDays = Math.ceil((new Date(item.validade).getTime() - now.getTime()) / 86400000);
                              return (
                                <TableRow key={idx} className={cn(editIdx === idx && "bg-primary/5")}>
                                  <TableCell>
                                    <p className="text-sm font-medium">{item.medicamento_nome}</p>
                                    {item.isExistingLote && (
                                      <Badge variant="outline" className="text-[9px] mt-0.5 bg-info/10 text-info border-info/20">Lote existente</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm font-mono">{item.numero_lote}</TableCell>
                                  <TableCell>
                                    <span className={cn("text-sm", valDays <= 0 && "text-destructive font-semibold", valDays > 0 && valDays <= 90 && "text-warning font-medium")}>
                                      {new Date(item.validade).toLocaleDateString("pt-BR")}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center font-semibold">{item.quantidade}</TableCell>
                                  <TableCell className="text-right text-sm">R$ {item.preco_unitario.toFixed(2)}</TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    R$ {(item.quantidade * item.preco_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-0.5">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editItem(idx)}>
                                            <Edit2 className="h-3 w-3 text-muted-foreground" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">Editar</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => duplicateItem(idx)}>
                                            <Copy className="h-3 w-3 text-muted-foreground" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">Duplicar</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeItem(idx)}>
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">Remover</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right - Summary */}
              <div>
                <Card className="p-4 sm:p-5 shadow-sm sticky top-[72px]">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Resumo da Entrada
                  </h3>
                  <Separator className="mb-4" />
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Itens</span>
                      <span className="font-bold text-base tabular-nums">{items.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total unidades</span>
                      <span className="font-bold text-base tabular-nums">{totalUnits.toLocaleString("pt-BR")}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Valor total</span>
                      <span className="font-bold text-lg text-success tabular-nums">R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {fornecedorId && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-xs">Fornecedor</span>
                        <span className="font-medium text-xs text-right max-w-[140px] truncate">{fornecedores.find(f => f.id === fornecedorId)?.nome}</span>
                      </div>
                    )}
                    {notaFiscal && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-xs">Nota Fiscal</span>
                        <span className="font-mono text-xs">{notaFiscal}</span>
                      </div>
                    )}
                  </div>

                  {items.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Observação geral</Label>
                        <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} placeholder="Opcional..." maxLength={500} className="rounded-xl" />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={() => items.length > 0 ? setConfirmOpen(true) : toast.error("Adicione itens primeiro")}
                    disabled={saving || items.length === 0}
                    className="w-full gradient-primary text-primary-foreground gap-2 mt-4"
                    size="lg"
                  >
                    {saving ? (
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmar Entrada
                      </>
                    )}
                  </Button>

                  {items.length === 0 && (
                    <div className="text-center py-6 mt-2">
                      <Package className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground">Adicione itens à lista para<br/>confirmar a entrada</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <Card className="shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Últimas 20 Entradas
                </h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Data/Hora</TableHead>
                    <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Quantidade</TableHead>
                    <TableHead className="text-xs font-semibold">Nota Fiscal</TableHead>
                    <TableHead className="text-xs font-semibold">Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEntradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm">Nenhuma entrada registrada</p>
                      </TableCell>
                    </TableRow>
                  ) : recentEntradas.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(mov.created_at).toLocaleDateString("pt-BR")} {new Date(mov.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {(mov as any).medicamento?.nome || "—"} {(mov as any).medicamento?.concentracao || ""}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-success">+{mov.quantidade}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{mov.nota_fiscal || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{mov.observacao || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Confirmar Entrada
              </DialogTitle>
              <DialogDescription>
                Revise os dados antes de confirmar o registro.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Itens</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total unidades</span>
                  <span className="font-semibold">{totalUnits.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor total</span>
                  <span className="font-bold text-success">R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                {fornecedorId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fornecedor</span>
                    <span className="font-medium">{fornecedores.find(f => f.id === fornecedorId)?.nome}</span>
                  </div>
                )}
                {notaFiscal && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NF</span>
                    <span className="font-mono">{notaFiscal}</span>
                  </div>
                )}
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-card border rounded-lg p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.medicamento_nome}</p>
                      <p className="text-muted-foreground">Lote {item.numero_lote} • Val: {new Date(item.validade).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-semibold">{item.quantidade} un</p>
                      <p className="text-muted-foreground">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={saving} className="gradient-primary text-primary-foreground gap-2">
                  {saving ? "Processando..." : <><CheckCircle2 className="h-4 w-4" /> Confirmar</>}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AppLayout>
  );
};

export default Entrada;
