import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Pill, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Medicamento, Lote, Categoria, Fornecedor } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG } from "@/types/database";

const PAGE_SIZE = 50;

const Medicamentos = () => {
  const { log } = useAudit();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[]; categoria?: Categoria })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medicamento | null>(null);
  const [form, setForm] = useState({ nome: "", generico: "", principio_ativo: "", concentracao: "", forma_farmaceutica: "Comprimido", codigo_barras: "", categoria_id: "", controlado: false, fornecedor_id: "", estoque_minimo: 0, estoque_maximo: 0, localizacao: "", preco_unitario: 0 });

  // Pagination
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Deactivation confirm
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ id: string; nome: string; lotesAtivos: number; unidades: number } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Get count
    const { count } = await supabase.from("medicamentos").select("id", { count: "exact", head: true }).eq("ativo", true);
    setTotalCount(count || 0);

    const [{ data: medsData }, { data: lotesData }, { data: catsData }, { data: fornData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true).order("nome").range(from, to),
      supabase.from("lotes").select("*").eq("ativo", true),
      supabase.from("categorias_medicamento").select("*").eq("ativo", true),
      supabase.from("fornecedores").select("*").eq("ativo", true).order("nome"),
    ]);
    setCategorias(catsData as Categoria[] || []);
    setFornecedores(fornData as Fornecedor[] || []);
    setMeds((medsData || []).map((m: any) => ({
      ...m,
      lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
      categoria: (catsData || []).find((c: any) => c.id === m.categoria_id),
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page]);

  const filtered = meds.filter(m => {
    const matchSearch = !search || m.nome.toLowerCase().includes(search.toLowerCase()) || m.generico.toLowerCase().includes(search.toLowerCase()) || m.codigo_barras?.includes(search);
    const matchCat = catFilter === "all" || m.categoria_id === catFilter;
    return matchSearch && matchCat;
  });

  const openNew = () => {
    setEditMed(null);
    setForm({ nome: "", generico: "", principio_ativo: "", concentracao: "", forma_farmaceutica: "Comprimido", codigo_barras: "", categoria_id: "", controlado: false, fornecedor_id: "", estoque_minimo: 0, estoque_maximo: 0, localizacao: "", preco_unitario: 0 });
    setDialogOpen(true);
  };

  const openEdit = (m: Medicamento) => {
    setEditMed(m);
    setForm({ nome: m.nome, generico: m.generico, principio_ativo: m.principio_ativo, concentracao: m.concentracao, forma_farmaceutica: m.forma_farmaceutica, codigo_barras: m.codigo_barras || "", categoria_id: m.categoria_id || "", controlado: m.controlado, fornecedor_id: m.fornecedor_id || "", estoque_minimo: m.estoque_minimo, estoque_maximo: m.estoque_maximo, localizacao: m.localizacao, preco_unitario: m.preco_unitario });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório"); return; }
    const row = { nome: form.nome, generico: form.generico, principio_ativo: form.principio_ativo, concentracao: form.concentracao, forma_farmaceutica: form.forma_farmaceutica, codigo_barras: form.codigo_barras || null, categoria_id: form.categoria_id || null, controlado: form.controlado, fornecedor_id: form.fornecedor_id || null, estoque_minimo: form.estoque_minimo, estoque_maximo: form.estoque_maximo, localizacao: form.localizacao, preco_unitario: form.preco_unitario };

    if (editMed) {
      const { error } = await supabase.from("medicamentos").update(row).eq("id", editMed.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      setMeds(prev => prev.map(m => m.id === editMed.id ? { ...m, ...row } as any : m));
      await log({ acao: "Atualização", tabela: "medicamentos", registro_id: editMed.id });
      toast.success("Medicamento atualizado!");
    } else {
      const { data, error } = await supabase.from("medicamentos").insert(row).select().single();
      if (error) { toast.error("Erro ao cadastrar"); return; }
      setMeds(prev => [{ ...data, lotes: [], categoria: categorias.find(c => c.id === data.categoria_id) } as any, ...prev]);
      await log({ acao: "Cadastro", tabela: "medicamentos", registro_id: data.id });
      toast.success("Medicamento cadastrado!");
    }
    setDialogOpen(false);
  };

  const confirmDeactivate = async (id: string) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;
    const lotesAtivos = med.lotes.filter(l => l.ativo && l.quantidade_atual > 0);
    const unidades = lotesAtivos.reduce((s, l) => s + l.quantidade_atual, 0);
    setDeactivateConfirm({ id, nome: med.nome, lotesAtivos: lotesAtivos.length, unidades });
  };

  const handleDeactivate = async () => {
    if (!deactivateConfirm) return;
    await supabase.from("medicamentos").update({ ativo: false }).eq("id", deactivateConfirm.id);
    setMeds(prev => prev.filter(m => m.id !== deactivateConfirm.id));
    await log({ acao: "Desativação", tabela: "medicamentos", registro_id: deactivateConfirm.id });
    toast.success("Medicamento desativado");
    setDeactivateConfirm(null);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading) return <AppLayout title="Medicamentos"><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div></AppLayout>;

  return (
    <AppLayout title="Medicamentos" subtitle={`${totalCount} medicamentos cadastrados`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, genérico ou código de barras..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Novo</Button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-xs font-semibold">Medicamento</TableHead>
              <TableHead className="text-xs font-semibold">Concentração</TableHead>
              <TableHead className="text-xs font-semibold">Categoria</TableHead>
              <TableHead className="text-xs font-semibold text-center">Estoque</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Local</TableHead>
              <TableHead className="text-xs font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum medicamento encontrado</TableCell></TableRow>
            ) : filtered.map(med => {
              const total = getEstoqueTotal(med.lotes);
              const status = getEstoqueStatus(total, med.estoque_minimo);
              const cfg = ESTOQUE_STATUS_CONFIG[status];
              return (
                <TableRow key={med.id} className="hover:bg-accent/30 cursor-pointer" onClick={() => openEdit(med)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{med.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{med.generico}</p>
                      </div>
                      {med.controlado && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary">Ctrl</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{med.concentracao} • {med.forma_farmaceutica}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]" style={{ borderColor: med.categoria?.cor }}>{med.categoria?.nome || "—"}</Badge></TableCell>
                  <TableCell className="text-center font-semibold">{total}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", cfg.className)}>{cfg.label}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{med.localizacao}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={(e) => { e.stopPropagation(); confirmDeactivate(med.id); }}>Desativar</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages} ({totalCount} registros)</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Deactivate Confirm */}
      <AlertDialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {deactivateConfirm?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateConfirm && deactivateConfirm.lotesAtivos > 0
                ? `Este medicamento tem ${deactivateConfirm.lotesAtivos} lote(s) ativo(s) com ${deactivateConfirm.unidades} unidade(s) em estoque. Deseja continuar?`
                : "Este medicamento não tem estoque ativo. Deseja continuar?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editMed ? "Editar Medicamento" : "Novo Medicamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Nome Comercial</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Nome Genérico</Label><Input value={form.generico} onChange={e => setForm({ ...form, generico: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Princípio Ativo</Label><Input value={form.principio_ativo} onChange={e => setForm({ ...form, principio_ativo: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Concentração</Label><Input value={form.concentracao} onChange={e => setForm({ ...form, concentracao: e.target.value })} placeholder="Ex: 50mg" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Forma Farmacêutica</Label>
                <Select value={form.forma_farmaceutica} onValueChange={v => setForm({ ...form, forma_farmaceutica: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Comprimido", "Cápsula", "Solução Oral", "Injetável", "Gotas", "Pomada", "Supositório", "Adesivo"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Código de Barras</Label><Input value={form.codigo_barras} onChange={e => setForm({ ...form, codigo_barras: e.target.value })} className="font-mono" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Categoria</Label>
                <Select value={form.categoria_id} onValueChange={v => setForm({ ...form, categoria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={v => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Estoque Mínimo</Label><Input type="number" value={form.estoque_minimo} onChange={e => setForm({ ...form, estoque_minimo: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Estoque Máximo</Label><Input type="number" value={form.estoque_maximo} onChange={e => setForm({ ...form, estoque_maximo: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Localização</Label><Input value={form.localizacao} onChange={e => setForm({ ...form, localizacao: e.target.value })} placeholder="A-01" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Preço Unitário (R$)</Label><Input type="number" step="0.01" value={form.preco_unitario} onChange={e => setForm({ ...form, preco_unitario: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.controlado} onChange={e => setForm({ ...form, controlado: e.target.checked })} id="ctrl" />
              <label htmlFor="ctrl" className="text-xs font-medium">Substância Controlada</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="gradient-primary text-primary-foreground">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Medicamentos;
