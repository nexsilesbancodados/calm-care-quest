import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserPlus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ROLE_LABELS, type AppRole } from "@/types/database";

const Usuarios = () => {
  const { isAdmin, signup } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", password: "", role: "visualizador" as AppRole });

  useEffect(() => {
    const fetch = async () => {
      const { data: profs } = await supabase.from("profiles").select("*").order("created_at");
      if (profs) {
        const withRoles = await Promise.all(profs.map(async (p: any) => {
          const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", p.user_id).single();
          return { ...p, role: roleData?.role || "visualizador" };
        }));
        setProfiles(withRoles);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleInvite = async () => {
    if (!form.email || !form.password || !form.nome) { toast.error("Preencha todos os campos"); return; }
    const { error } = await signup(form.email, form.password, form.nome);
    if (error) { toast.error(error); return; }
    toast.success(`Usuário ${form.nome} criado! Após confirmação do e-mail, altere o papel via SQL: SELECT promote_to_admin('${form.email}') ou atualize user_roles.`);
    setDialogOpen(false);
    setForm({ nome: "", email: "", password: "", role: "visualizador" });
  };

  const changeRole = async (userId: string, newRole: AppRole) => {
    await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, role: newRole } : p));
    toast.success("Papel atualizado!");
  };

  if (!isAdmin) return <AppLayout title="Usuários"><p className="text-muted-foreground text-center py-12">Acesso restrito a administradores</p></AppLayout>;
  if (loading) return <AppLayout title="Usuários"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout title="Gerenciamento de Usuários" subtitle={`${profiles.length} usuários`}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2"><UserPlus className="h-4 w-4" /> Novo Usuário</Button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">Nome</TableHead>
            <TableHead className="text-xs font-semibold">Papel</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold">Criado em</TableHead>
            <TableHead className="text-xs font-semibold">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {profiles.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-sm">{p.nome}</TableCell>
                <TableCell>
                  <Select value={p.role} onValueChange={(v) => changeRole(p.user_id, v as AppRole)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Badge variant="outline" className={cn("text-[10px]", p.ativo ? "bg-success/10 text-success" : "bg-muted")}>{p.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={async () => {
                    await supabase.from("profiles").update({ ativo: !p.ativo }).eq("id", p.id);
                    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x));
                  }}>{p.ativo ? "Desativar" : "Ativar"}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" />Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Senha Inicial</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleInvite} className="gradient-primary text-primary-foreground">Criar</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Usuarios;
