import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User, Mail, Shield, Calendar, Save, Check, Key, Bell, Moon, Sun, Camera, Loader2 } from "lucide-react";
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

async function resizeImage(file: File, maxSize: number = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > h) { h = (maxSize * h) / w; w = maxSize; }
      else { w = (maxSize * w) / h; h = maxSize; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Resize failed")), "image/jpeg", 0.85);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const Perfil = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [nome, setNome] = useState(profile?.nome || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPass, setChangingPass] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    refreshProfile();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }

    setUploadingAvatar(true);
    try {
      const resized = await resizeImage(file);
      const ext = "jpg";
      const path = `${user!.id}/avatar.${ext}`;

      // Upload (upsert)
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, resized, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user!.id);
      await refreshProfile();
      toast.success("Avatar atualizado!");
    } catch (err: any) {
      toast.error("Erro ao enviar avatar: " + (err.message || ""));
    }
    setUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        <div>
          <Card className="p-0 shadow-card overflow-hidden">
            <div className="h-24 gradient-hero relative">
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            </div>
            <div className="px-6 pb-6 -mt-10 relative">
              <div className="flex items-end gap-5 mb-6">
                <div className="relative group">
                  <Avatar className="h-20 w-20 ring-4 ring-card shadow-elevated">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={nome} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/10 to-info/10 text-primary text-2xl font-bold">
                      {displayInitials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Camera overlay */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="pb-1">
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
                    <Input value={nome} onChange={e => setNome(e.target.value)} className="flex-1 rounded-xl" />
                    <Button onClick={handleSaveName} disabled={saving || nome === profile?.nome} className="gap-2 rounded-xl">
                      {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      {saved ? "Salvo!" : "Salvar"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">E-mail (não editável)</Label>
                  <Input value={user?.email || ""} disabled className="bg-muted/50 rounded-xl" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Permissions Card */}
        <div>
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
        </div>

        {/* Preferences */}
        <div>
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
        </div>

        {/* Change Password */}
        <div>
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
        </div>
      </div>
    </AppLayout>
  );
};

export default Perfil;
