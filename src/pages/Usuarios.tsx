import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserPlus, Shield, Send, Mail, Ban, Trash2, ShieldCheck, MoreHorizontal, UserX, UserCheck, Building2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ROLE_LABELS, ROLE_PERMISSIONS, type AppRole, type Filial } from "@/types/database";

const PERMISSION_LABELS: Record<string, string> = {
  manage_stock: "Gerenciar Estoque",
  manage_batches: "Gerenciar Lotes",
  manage_movements: "Gerenciar Movimentações",
  approve_transfers: "Aprovar Transferências",
  print_labels: "Imprimir Etiquetas",
  view_reports: "Visualizar Relatórios",
  manage_suppliers: "Gerenciar Fornecedores",
  add_entry: "Registrar Entrada",
  read_stock: "Consultar Estoque",
  scan_barcode: "Leitor de Código de Barras",
  request_meds: "Solicitar Medicamentos",
  register_admin: "Registrar Administração",
  view_basic_reports: "Relatórios Básicos",
};

function getPermissionsForRole(role: AppRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

function getRoleFromPermissions(perms: string[]): AppRole {
  if (perms.includes("*")) return "admin";
  // Find the best matching role
  const roles: AppRole[] = ["farmaceutico", "auxiliar_farmacia", "enfermeiro", "visualizador"];
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (rolePerms.length === perms.length && rolePerms.every(p => perms.includes(p))) {
      return role;
    }
  }
  // If custom selection, find closest match (most permissions = higher role)
  if (perms.length >= 5) return "farmaceutico";
  if (perms.length >= 3) return "auxiliar_farmacia";
  if (perms.length >= 2) return "enfermeiro";
  return "visualizador";
}

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS);

const Usuarios = () => {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNome, setInviteNome] = useState("");
  const [inviteFilialId, setInviteFilialId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("visualizador");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(getPermissionsForRole("visualizador"));
  const [sending, setSending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "block" | "unblock"; userId: string; nome: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: profs }, { data: filiaisData }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("filiais").select("*").eq("ativo", true).order("nome"),
      ]);
      if (profs) {
        const withRoles = await Promise.all(profs.map(async (p: any) => {
          const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", p.user_id).single();
          const filial = filiaisData?.find((f: any) => f.id === p.filial_id);
          return { ...p, role: roleData?.role || "visualizador", filial };
        }));
        setProfiles(withRoles);
      }
      setFiliais(filiaisData as Filial[] || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleRoleChange = (role: AppRole) => {
    setSelectedRole(role);
    setSelectedPermissions(getPermissionsForRole(role));
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev => {
      const next = prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm];
      // Update role based on new permissions
      setSelectedRole(getRoleFromPermissions(next));
      return next;
    });
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteNome) {
      toast.error("Preencha nome e e-mail");
      return;
    }

    const role = getRoleFromPermissions(selectedPermissions);

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, nome: inviteNome, role },
      });

      if (error) {
        toast.error(error.message || "Erro ao enviar convite");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Convite enviado para ${inviteEmail}!`);

      // Update filial_id on profile if set
      if (inviteFilialId && data?.user_id) {
        await supabase.from("profiles").update({ filial_id: inviteFilialId }).eq("user_id", data.user_id);
      }

      setDialogOpen(false);
      setInviteEmail("");
      setInviteNome("");
      setInviteFilialId("");
      setSelectedRole("visualizador");
      setSelectedPermissions(getPermissionsForRole("visualizador"));

      // Refresh profiles
      const { data: profs } = await supabase.from("profiles").select("*").order("created_at");
      if (profs) {
        const withRoles = await Promise.all(profs.map(async (p: any) => {
          const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", p.user_id).single();
          return { ...p, role: roleData?.role || "visualizador" };
        }));
        setProfiles(withRoles);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar convite");
    } finally {
      setSending(false);
    }
  };

  const changeRole = async (userId: string, newRole: AppRole) => {
    await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, role: newRole } : p));
    toast.success("Papel atualizado!");
  };

  const manageUser = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: confirmAction.type, user_id: confirmAction.userId },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro ao executar ação");
        return;
      }
      toast.success(data.message);
      if (confirmAction.type === "delete") {
        setProfiles(prev => prev.filter(p => p.user_id !== confirmAction.userId));
      } else if (confirmAction.type === "block") {
        setProfiles(prev => prev.map(p => p.user_id === confirmAction.userId ? { ...p, ativo: false } : p));
      } else if (confirmAction.type === "unblock") {
        setProfiles(prev => prev.map(p => p.user_id === confirmAction.userId ? { ...p, ativo: true } : p));
      }
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  if (!isAdmin) return <AppLayout title="Usuários"><p className="text-muted-foreground text-center py-12">Acesso restrito a administradores</p></AppLayout>;
  if (loading) return <AppLayout title="Usuários"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout title="Gerenciamento de Usuários" subtitle={`${profiles.length} usuários`}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2">
          <Mail className="h-4 w-4" /> Convidar Funcionário
        </Button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">Nome</TableHead>
             <TableHead className="text-xs font-semibold">Papel</TableHead>
            <TableHead className="text-xs font-semibold">Filial</TableHead>
            <TableHead className="text-xs font-semibold">Permissões</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold">Criado em</TableHead>
            <TableHead className="text-xs font-semibold">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {profiles.map(p => {
              const perms = ROLE_PERMISSIONS[p.role as AppRole] || [];
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.nome}</TableCell>
                  <TableCell>
                    <Select value={p.role} onValueChange={(v) => changeRole(p.user_id, v as AppRole)}>
                      <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={p.filial_id || "sem_filial"} onValueChange={async (v) => {
                      const filialId = v === "sem_filial" ? null : v;
                      await supabase.from("profiles").update({ filial_id: filialId }).eq("user_id", p.user_id);
                      const filial = filiais.find(f => f.id === filialId);
                      setProfiles(prev => prev.map(pr => pr.user_id === p.user_id ? { ...pr, filial_id: filialId, filial } : pr));
                      toast.success("Filial atualizada!");
                    }}>
                      <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Sem filial" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_filial">Sem filial</SelectItem>
                        {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[250px]">
                      {perms.includes("*") ? (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Acesso Total</Badge>
                      ) : perms.slice(0, 3).map(perm => (
                        <Badge key={perm} variant="outline" className="text-[10px]">{PERMISSION_LABELS[perm] || perm}</Badge>
                      ))}
                      {!perms.includes("*") && perms.length > 3 && (
                        <Badge variant="outline" className="text-[10px] bg-muted">+{perms.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", p.ativo ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20")}>
                      {p.ativo ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {p.ativo ? (
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer text-warning"
                            onClick={() => setConfirmAction({ type: "block", userId: p.user_id, nome: p.nome })}
                          >
                            <Ban className="h-3.5 w-3.5" /> Bloquear Acesso
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="gap-2 text-xs cursor-pointer text-success"
                            onClick={() => setConfirmAction({ type: "unblock", userId: p.user_id, nome: p.nome })}
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Desbloquear
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-xs cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => setConfirmAction({ type: "delete", userId: p.user_id, nome: p.nome })}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir Permanentemente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Convidar Funcionário
            </DialogTitle>
            <DialogDescription>
              Envie um convite por e-mail e defina as permissões de acesso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nome completo</Label>
                <Input
                  placeholder="Nome do funcionário"
                  value={inviteNome}
                  onChange={e => setInviteNome(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">E-mail</Label>
                <Input
                  type="email"
                  placeholder="email@hospital.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Papel</Label>
              <Select value={selectedRole} onValueChange={(v) => handleRoleChange(v as AppRole)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        {v}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Selecionar um papel preenche automaticamente as permissões. Você pode ajustar individualmente abaixo.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Permissões
              </Label>

              {selectedRole === "admin" ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm text-primary font-medium">✦ Acesso Total</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Administradores têm acesso irrestrito a todas as funcionalidades.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm} className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox
                        checked={selectedPermissions.includes(perm)}
                        onCheckedChange={() => togglePermission(perm)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-sm group-hover:text-foreground transition-colors">
                        {PERMISSION_LABELS[perm]}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleInvite}
                disabled={sending || !inviteEmail || !inviteNome}
                className="gradient-primary text-primary-foreground gap-2"
              >
                {sending ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "delete" && <Trash2 className="h-5 w-5 text-destructive" />}
              {confirmAction?.type === "block" && <Ban className="h-5 w-5 text-warning" />}
              {confirmAction?.type === "unblock" && <UserCheck className="h-5 w-5 text-success" />}
              {confirmAction?.type === "delete" && "Excluir Usuário"}
              {confirmAction?.type === "block" && "Bloquear Usuário"}
              {confirmAction?.type === "unblock" && "Desbloquear Usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "delete" && (
                <>Tem certeza que deseja excluir permanentemente o usuário <strong>{confirmAction.nome}</strong>? Esta ação não pode ser desfeita. Todos os dados do usuário serão removidos.</>
              )}
              {confirmAction?.type === "block" && (
                <>Deseja bloquear o acesso de <strong>{confirmAction?.nome}</strong>? O usuário não conseguirá fazer login até ser desbloqueado.</>
              )}
              {confirmAction?.type === "unblock" && (
                <>Deseja restaurar o acesso de <strong>{confirmAction?.nome}</strong>? O usuário poderá fazer login novamente.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={manageUser}
              disabled={actionLoading}
              className={cn(
                confirmAction?.type === "delete" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                confirmAction?.type === "block" && "bg-warning text-warning-foreground hover:bg-warning/90",
                confirmAction?.type === "unblock" && "bg-success text-success-foreground hover:bg-success/90"
              )}
            >
              {actionLoading ? (
                <div className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <>
                  {confirmAction?.type === "delete" && "Excluir"}
                  {confirmAction?.type === "block" && "Bloquear"}
                  {confirmAction?.type === "unblock" && "Desbloquear"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Usuarios;
