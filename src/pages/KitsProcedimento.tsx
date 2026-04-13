import { useState, useEffect, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Package, Pill, Trash2, Play, Zap,
  AlertTriangle, CheckCircle, Edit2,
} from "lucide-react";

interface Kit {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  filial_id: string | null;
  created_at: string;
}

interface KitItem {
  id: string;
  kit_id: string;
  medicamento_id: string;
  quantidade: number;
  medicamento?: { nome: string; concentracao: string; forma_farmaceutica: string };
}

interface Med {
  id: string;
  nome: string;
  concentracao: string;
  forma_farmaceutica: string;
}

const KitsProcedimento = () => {
  const { log } = useAudit();
  const { user, profile } = useAuth();
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitItens, setKitItens] = useState<KitItem[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialogs
  const [kitDialogOpen, setKitDialogOpen] = useState(false);
  const [editKit, setEditKit] = useState<Kit | null>(null);
  const [kitForm, setKitForm] = useState({ nome: "", descricao: "" });
  const [saving, setSaving] = useState(false);

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ medicamento_id: "", quantidade: 1 });

  // Baixa dialog
  const [baixaConfirm, setBaixaConfirm] = useState<Kit | null>(null);
  const [executando, setExecutando] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: kitsData }, { data: itensData }, { data: medsData }] = await Promise.all([
      supabase.from("kits_procedimento").select("*").eq("ativo", true).order("nome"),
      supabase.from("kits_procedimento_itens").select("*, medicamentos(nome, concentracao, forma_farmaceutica)").order("created_at"),
      supabase.from("medicamentos").select("id, nome, concentracao, forma_farmaceutica").eq("ativo", true).order("nome"),
    ]);
    setKits((kitsData || []) as Kit[]);
    setKitItens((itensData || []).map((i: any) => ({ ...i, medicamento: i.medicamentos })) as KitItem[]);
    setMeds((medsData || []) as Med[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.filial_id]);

  const filtered = useMemo(() => {
    if (!search) return kits;
    const s = search.toLowerCase();
    return kits.filter(k => k.nome.toLowerCase().includes(s) || k.descricao?.toLowerCase().includes(s));
  }, [kits, search]);

  const handleSaveKit = async () => {
    if (!kitForm.nome.trim()) { toast.error("Nome do kit é obrigatório"); return; }
    setSaving(true);
    if (editKit) {
      const { error } = await supabase.from("kits_procedimento").update({ nome: kitForm.nome, descricao: kitForm.descricao }).eq("id", editKit.id);
      if (error) { toast.error("Erro ao atualizar kit"); setSaving(false); return; }
      await log({ acao: "Atualização Kit", tabela: "kits_procedimento", registro_id: editKit.id });
      toast.success("Kit atualizado!");
    } else {
      const { data, error } = await supabase.from("kits_procedimento").insert({ nome: kitForm.nome, descricao: kitForm.descricao, filial_id: profile?.filial_id }).select().single();
      if (error) { toast.error("Erro ao criar kit"); setSaving(false); return; }
      await log({ acao: "Criação Kit", tabela: "kits_procedimento", registro_id: (data as any).id });
      toast.success("Kit criado!");
    }
    setSaving(false);
    setKitDialogOpen(false);
    setKitForm({ nome: "", descricao: "" });
    setEditKit(null);
    fetchData();
  };

  const handleAddItem = async () => {
    if (!selectedKitId || !itemForm.medicamento_id || itemForm.quantidade < 1) {
      toast.error("Selecione medicamento e quantidade");
      return;
    }
    const { error } = await supabase.from("kits_procedimento_itens").insert({
      kit_id: selectedKitId,
      medicamento_id: itemForm.medicamento_id,
      quantidade: itemForm.quantidade,
    });
    if (error) { toast.error("Erro ao adicionar item"); return; }
    toast.success("Item adicionado ao kit!");
    setItemDialogOpen(false);
    setItemForm({ medicamento_id: "", quantidade: 1 });
    fetchData();
  };

  const handleRemoveItem = async (itemId: string) => {
    await supabase.from("kits_procedimento_itens").delete().eq("id", itemId);
    toast.success("Item removido");
    fetchData();
  };

  const handleBaixaKit = async () => {
    if (!baixaConfirm) return;
    setExecutando(true);
    const { data, error } = await supabase.rpc("baixa_kit_procedimento", {
      _kit_id: baixaConfirm.id,
      _usuario_id: user?.id!,
    });
    if (error) { toast.error("Erro ao executar baixa do kit"); setExecutando(false); return; }
    const result = data as any;
    if (!result.success) { toast.error(result.error); setExecutando(false); return; }

    await log({ acao: "Baixa Kit", tabela: "kits_procedimento", registro_id: baixaConfirm.id, dados_novos: result });

    if (result.itens_completos < result.total_itens) {
      const faltaram = (result.detalhes as any[]).filter((d: any) => d.faltou > 0).map((d: any) => `${d.medicamento}: faltou ${d.faltou}`).join(", ");
      toast.warning(`Kit parcial: ${result.itens_completos}/${result.total_itens} completos. ${faltaram}`, { duration: 8000 });
    } else {
      toast.success(`Kit "${result.kit}" executado! ${result.total_itens} item(ns) debitados.`);
    }
    setExecutando(false);
    setBaixaConfirm(null);
    fetchData();
  };

  if (loading) return <AppLayout title="Kits de Procedimento"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout title="Kits de Procedimento" subtitle={`${kits.length} kit(s) cadastrado(s)`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar kits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Button onClick={() => { setEditKit(null); setKitForm({ nome: "", descricao: "" }); setKitDialogOpen(true); }} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Novo Kit
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Package className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm">Nenhum kit cadastrado</p>
          <Button variant="outline" size="sm" onClick={() => { setKitForm({ nome: "", descricao: "" }); setKitDialogOpen(true); }}>
            <Plus className="h-3 w-3 mr-1" /> Criar primeiro kit
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(kit => {
            const itens = kitItens.filter(i => i.kit_id === kit.id);
            return (
              <Card key={kit.id} className="p-4 space-y-3 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{kit.nome}</h3>
                    {kit.descricao && <p className="text-xs text-muted-foreground mt-0.5">{kit.descricao}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{itens.length} item(ns)</Badge>
                </div>

                {itens.length > 0 && (
                  <div className="space-y-1">
                    {itens.map(item => (
                      <div key={item.id} className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Pill className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{item.medicamento?.nome}</span>
                          <span className="text-muted-foreground">{item.medicamento?.concentracao}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono font-medium">×{item.quantidade}</span>
                          <button onClick={() => handleRemoveItem(item.id)} className="text-destructive/60 hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5 pt-1 border-t">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1 flex-1" onClick={() => { setSelectedKitId(kit.id); setItemForm({ medicamento_id: "", quantidade: 1 }); setItemDialogOpen(true); }}>
                    <Plus className="h-3 w-3" /> Item
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => { setEditKit(kit); setKitForm({ nome: kit.nome, descricao: kit.descricao }); setKitDialogOpen(true); }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {itens.length > 0 && (
                    <Button size="sm" className="text-xs h-7 gap-1 gradient-primary text-primary-foreground flex-1" onClick={() => setBaixaConfirm(kit)}>
                      <Zap className="h-3 w-3" /> Executar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Kit Dialog */}
      <Dialog open={kitDialogOpen} onOpenChange={setKitDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{editKit ? "Editar Kit" : "Novo Kit de Procedimento"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Kit *</Label>
              <Input value={kitForm.nome} onChange={e => setKitForm({ ...kitForm, nome: e.target.value })} placeholder="Ex: Kit Intubação" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={kitForm.descricao} onChange={e => setKitForm({ ...kitForm, descricao: e.target.value })} rows={2} placeholder="Descrição do procedimento..." />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setKitDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveKit} disabled={saving} className="gradient-primary text-primary-foreground">
                {saving ? "Salvando..." : editKit ? "Salvar" : "Criar Kit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Adicionar Item ao Kit</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Medicamento / Insumo *</Label>
              <Select value={itemForm.medicamento_id} onValueChange={v => setItemForm({ ...itemForm, medicamento_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {meds.map(m => <SelectItem key={m.id} value={m.id}>{m.nome} {m.concentracao} — {m.forma_farmaceutica}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade *</Label>
              <Input type="number" min={1} value={itemForm.quantidade} onChange={e => setItemForm({ ...itemForm, quantidade: Number(e.target.value) })} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddItem} className="gradient-primary text-primary-foreground">Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Baixa Confirm Dialog */}
      <AlertDialog open={!!baixaConfirm} onOpenChange={() => !executando && setBaixaConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Executar Kit "{baixaConfirm?.nome}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens do kit serão debitados do estoque usando FEFO (lote com vencimento mais próximo primeiro). Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {baixaConfirm && (
            <div className="space-y-1 my-2">
              {kitItens.filter(i => i.kit_id === baixaConfirm.id).map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs rounded-md bg-muted/30 px-3 py-1.5">
                  <span>{item.medicamento?.nome} {item.medicamento?.concentracao}</span>
                  <span className="font-mono font-medium">×{item.quantidade}</span>
                </div>
              ))}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={executando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBaixaKit} disabled={executando} className="gradient-primary text-primary-foreground gap-1">
              {executando ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Zap className="h-4 w-4" />}
              {executando ? "Processando..." : "Confirmar Baixa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default KitsProcedimento;
