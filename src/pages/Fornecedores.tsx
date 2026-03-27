import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Phone, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Fornecedor } from "@/types/database";

const PAGE_SIZE = 30;

const Fornecedores = () => {
  const { log } = useAudit();
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState({ nome: "", cnpj: "", contato: "", email: "", telefone: "", endereco: "" });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ id: string; nome: string; medsCount: number; ativo: boolean } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { count } = await supabase.from("fornecedores").select("id", { count: "exact", head: true });
    setTotalCount(count || 0);
    const { data } = await supabase.from("fornecedores").select("*").order("nome").range(from, to);
    setSuppliers(data as Fornecedor[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page]);

  const filtered = suppliers.filter(s => !search || s.nome.toLowerCase().includes(search.toLowerCase()) || s.cnpj.includes(search));
  const activeCount = suppliers.filter(s => s.ativo).length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const openNew = () => { setEditItem(null); setForm({ nome: "", cnpj: "", contato: "", email: "", telefone: "", endereco: "" }); setDialogOpen(true); };
  const openEdit = (s: Fornecedor) => { setEditItem(s); setForm({ nome: s.nome, cnpj: s.cnpj, contato: s.contato, email: s.email, telefone: s.telefone, endereco: s.endereco }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório"); return; }
    if (editItem) {
      await supabase.from("fornecedores").update(form).eq("id", editItem.id);
      setSuppliers(prev => prev.map(s => s.id === editItem.id ? { ...s, ...form } as Fornecedor : s));
      await log({ acao: "Atualização", tabela: "fornecedores", registro_id: editItem.id });
      toast.success("Fornecedor atualizado!");
    } else {
      const { data, error } = await supabase.from("fornecedores").insert({ ...form, filial_id: profile?.filial_id }).select().single();
      if (error) { toast.error("Erro ao cadastrar"); return; }
      setSuppliers(prev => [data as Fornecedor, ...prev]);
      await log({ acao: "Cadastro", tabela: "fornecedores", registro_id: data.id });
      toast.success("Fornecedor cadastrado!");
    }
    setDialogOpen(false);
  };

  const confirmToggle = async (id: string) => {
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    if (s.ativo) {
      // Count linked meds
      const { count } = await supabase.from("medicamentos").select("id", { count: "exact", head: true }).eq("fornecedor_id", id).eq("ativo", true);
      setDeactivateConfirm({ id, nome: s.nome, medsCount: count || 0, ativo: s.ativo });
    } else {
      // Reactivate directly
      await supabase.from("fornecedores").update({ ativo: true }).eq("id", id);
      setSuppliers(prev => prev.map(x => x.id === id ? { ...x, ativo: true } as Fornecedor : x));
      toast.success("Fornecedor reativado");
    }
  };

  const handleToggle = async () => {
    if (!deactivateConfirm) return;
    await supabase.from("fornecedores").update({ ativo: false }).eq("id", deactivateConfirm.id);
    setSuppliers(prev => prev.map(x => x.id === deactivateConfirm.id ? { ...x, ativo: false } as Fornecedor : x));
    toast.success("Fornecedor desativado");
    setDeactivateConfirm(null);
  };

  if (loading) return <AppLayout title="Fornecedores"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout title="Fornecedores" subtitle={`${totalCount} fornecedores • ${activeCount} ativos`}>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Novo</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
          >
            <Card className={cn("p-0 shadow-card hover:shadow-card-hover transition-all cursor-pointer overflow-hidden", !s.ativo && "opacity-50")} onClick={() => openEdit(s)}>
              {/* Top accent */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold font-display">{s.nome}</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{s.cnpj}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[9px] font-semibold", s.ativo ? "bg-success/10 text-success border-success/20" : "bg-muted border-muted")}>{s.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {s.telefone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-primary/50" />{s.telefone}</div>}
                  {s.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-primary/50" />{s.email}</div>}
                </div>
                <div className="mt-3 pt-3 border-t border-border/40">
                  <Button size="sm" variant={s.ativo ? "destructive" : "outline"} className="text-[10px] h-7 rounded-lg" onClick={(e) => { e.stopPropagation(); confirmToggle(s.id); }}>{s.ativo ? "Desativar" : "Reativar"}</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {deactivateConfirm?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateConfirm && deactivateConfirm.medsCount > 0
                ? `Este fornecedor tem ${deactivateConfirm.medsCount} medicamento(s) vinculado(s). Deseja continuar?`
                : "Este fornecedor não tem medicamentos vinculados. Deseja continuar?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle} className="bg-destructive text-destructive-foreground">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>{editItem ? "Editar" : "Novo"} Fornecedor</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">CNPJ</Label><Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="font-mono" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Contato</Label><Input value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">E-mail</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Endereço</Label><Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="gradient-primary text-primary-foreground">Salvar</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Fornecedores;
