import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { User, Mail, Shield, Calendar, Save, Check, Key, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/types/database";

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

const Perfil = () => {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [nome, setNome] = useState(profile?.nome || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPass, setChangingPass] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    if (profile) setNome(profile.nome);
    setNotifEnabled("Notification" in window && Notification.permission === "granted");
  }, [profile]);

  const handleSaveName = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ nome: nome.trim() }).eq("user_id", user!.id);
    if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
    toast.success("Nome atualizado!");
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPass || passwordForm.newPass.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("Senhas não coincidem");
      return;
    }
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
    if (error) { toast.error(error.message); setChangingPass(false); return; }
    toast.success("Senha alterada com sucesso!");
    setPasswordForm({ current: "", newPass: "", confirm: "" });
    setChangingPass(false);
  };

  const handleToggleNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações");
      return;
    }
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setNotifEnabled(result === "granted");
      if (result === "granted") toast.success("Notificações ativadas!");
      else toast.info("Notificações bloqueadas pelo navegador");
    } else if (Notification.permission === "granted") {
      toast.info("Para desativar, ajuste nas configurações do navegador");
    } else {
      toast.info("Notificações bloqueadas. Ative nas configurações do navegador");
    }
  };

  const displayInitials = nome.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const perms = profile ? ROLE_PERMISSIONS[profile.role] || [] : [];

  return (
    <AppLayout title="Meu Perfil" subtitle="Gerencie suas informações pessoais">
      <div className="max-w-2xl space-y-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-5 mb-6">
              <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-2xl font-bold">
                  {displayInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{nome}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {user?.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    profile?.role === "admin" ? "border-primary/30 text-primary bg-primary/5" : "border-info/30 text-info bg-info/5"
                  )}>
                    <Shield className="h-3 w-3 mr-1" />
                    {profile ? ROLE_LABELS[profile.role] : "—"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    Desde {profile ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—"}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="mb-5" />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Nome completo
                </Label>
                <div className="flex gap-2">
                  <Input value={nome} onChange={e => setNome(e.target.value)} className="flex-1" />
                  <Button onClick={handleSaveName} disabled={saving || nome === profile?.nome} className="gap-2">
                    {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saved ? "Salvo!" : "Salvar"}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">E-mail (não editável)</Label>
                <Input value={user?.email || ""} disabled className="bg-muted/50" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Permissions Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-6 shadow-card">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-primary" />
              Minhas Permissões
            </h3>
            {perms.includes("*") ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm text-primary font-medium">✦ Acesso Total (Administrador)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Você tem acesso irrestrito a todas as funcionalidades do sistema.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {perms.map(p => (
                  <Badge key={p} variant="outline" className="text-xs">{PERMISSION_LABELS[p] || p}</Badge>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 shadow-card">
            <h3 className="text-sm font-semibold mb-4">Preferências</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === "light" ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4 text-info" />}
                  <div>
                    <p className="text-sm font-medium">Tema Escuro</p>
                    <p className="text-[11px] text-muted-foreground">Alternar entre tema claro e escuro</p>
                  </div>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Notificações do Navegador</p>
                    <p className="text-[11px] text-muted-foreground">Receba alertas mesmo com a aba em segundo plano</p>
                  </div>
                </div>
                <Switch checked={notifEnabled} onCheckedChange={handleToggleNotifications} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-6 shadow-card">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Key className="h-4 w-4 text-primary" />
              Alterar Senha
            </h3>
            <div className="space-y-3 max-w-sm">
              <div className="space-y-1.5">
                <Label className="text-xs">Nova senha</Label>
                <Input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm(p => ({ ...p, newPass: e.target.value }))} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirmar nova senha</Label>
                <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repita a nova senha" />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPass || !passwordForm.newPass} variant="outline" className="gap-2">
                {changingPass ? <div className="h-4 w-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : <Key className="h-4 w-4" />}
                Alterar Senha
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Perfil;
