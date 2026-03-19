import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Bell, Shield, Database, Users, Save, Check, Plus, Trash2, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth, roleLabels, roleDescriptions, type UserRole } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const Configuracoes = () => {
  const { user, can, invitedUsers, inviteUser, removeUser } = useAuth();
  const [saved, setSaved] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "farma" as UserRole });

  const [settings, setSettings] = useState({
    hospitalName: "Hospital Psiquiátrico São Lucas",
    pharmacyName: "Farmácia Interna Central",
    cnpj: "12.345.678/0001-90",
    responsiblePharmacist: "Dr. Carlos Alberto Mendes",
    crf: "CRF-SP 12345",
    lowStockAlert: true,
    expiryAlert: true,
    expiryDays: "60",
    criticalStockAlert: true,
    emailNotifications: false,
    controlledSubstanceLog: true,
    doubleCheck: true,
    autoBackup: true,
    backupFrequency: "diário",
  });

  const handleSave = () => {
    setSaved(true);
    toast.success("Configurações salvas com sucesso!");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleInvite = () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Preencha nome e e-mail");
      return;
    }
    inviteUser({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      initials: newUser.name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase(),
    });
    toast.success(`Convite enviado para ${newUser.email}`);
    setInviteOpen(false);
    setNewUser({ name: "", email: "", role: "farma" });
  };

  const handleRemoveUser = (id: string, name: string) => {
    removeUser(id);
    toast.success(`${name} removido da equipe`);
  };

  return (
    <AppLayout title="Configurações" subtitle="Ajustes gerais do sistema">
      <div className="max-w-3xl space-y-6">
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="usuarios">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Usuários & Acessos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-6">
            {/* Hospital Info */}
            <SettingsSection icon={Building2} title="Informações do Hospital" delay={0}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nome do Hospital" value={settings.hospitalName} onChange={(v) => setSettings({ ...settings, hospitalName: v })} />
                <Field label="Farmácia" value={settings.pharmacyName} onChange={(v) => setSettings({ ...settings, pharmacyName: v })} />
                <Field label="CNPJ" value={settings.cnpj} onChange={(v) => setSettings({ ...settings, cnpj: v })} />
              </div>
            </SettingsSection>

            {/* Notifications */}
            <SettingsSection icon={Bell} title="Alertas e Notificações" delay={0.05}>
              <div className="space-y-4">
                <ToggleField label="Alerta de estoque baixo" description="Notificar quando medicamento atingir estoque mínimo" checked={settings.lowStockAlert} onChange={(v) => setSettings({ ...settings, lowStockAlert: v })} />
                <ToggleField label="Alerta de validade" description="Notificar medicamentos próximos do vencimento" checked={settings.expiryAlert} onChange={(v) => setSettings({ ...settings, expiryAlert: v })} />
                {settings.expiryAlert && (
                  <div className="pl-12 space-y-1.5">
                    <Label className="text-xs font-medium">Dias de antecedência</Label>
                    <Select value={settings.expiryDays} onValueChange={(v) => setSettings({ ...settings, expiryDays: v })}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="60">60 dias</SelectItem>
                        <SelectItem value="90">90 dias</SelectItem>
                        <SelectItem value="120">120 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <ToggleField label="Alerta de estoque crítico" description="Alerta urgente para níveis críticos" checked={settings.criticalStockAlert} onChange={(v) => setSettings({ ...settings, criticalStockAlert: v })} />
                <ToggleField label="Notificações por e-mail" description="Enviar alertas também por e-mail" checked={settings.emailNotifications} onChange={(v) => setSettings({ ...settings, emailNotifications: v })} badge="Em breve" />
              </div>
            </SettingsSection>

            {/* Security */}
            <SettingsSection icon={Shield} title="Segurança e Controle" delay={0.1}>
              <div className="space-y-4">
                <ToggleField label="Log de substâncias controladas" description="Registrar todas as movimentações de controlados automaticamente" checked={settings.controlledSubstanceLog} onChange={(v) => setSettings({ ...settings, controlledSubstanceLog: v })} />
                <ToggleField label="Conferência dupla" description="Exigir confirmação de segundo profissional para dispensação de controlados" checked={settings.doubleCheck} onChange={(v) => setSettings({ ...settings, doubleCheck: v })} />
              </div>
            </SettingsSection>

            {/* Backup */}
            <SettingsSection icon={Database} title="Backup e Dados" delay={0.15}>
              <div className="space-y-4">
                <ToggleField label="Backup automático" description="Realizar backup dos dados periodicamente" checked={settings.autoBackup} onChange={(v) => setSettings({ ...settings, autoBackup: v })} />
                {settings.autoBackup && (
                  <div className="pl-12 space-y-1.5">
                    <Label className="text-xs font-medium">Frequência</Label>
                    <Select value={settings.backupFrequency} onValueChange={(v) => setSettings({ ...settings, backupFrequency: v })}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diário">Diário</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </SettingsSection>

            {/* Save */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-end pt-2 pb-8">
              <Button onClick={handleSave} className="gradient-primary text-primary-foreground gap-2 px-6">
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? "Salvo!" : "Salvar Configurações"}
              </Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-6">
            {/* Role Descriptions */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Shield className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold">Níveis de Acesso</h3>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(["admin", "farma"] as UserRole[]).map((role) => (
                    <div key={role} className={cn("rounded-lg border p-3", role === "admin" ? "border-primary/20 bg-primary/5" : "border-info/20 bg-info/5")}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn("text-[10px]", role === "admin" ? "border-primary/30 text-primary" : "border-info/30 text-info")}>
                          {roleLabels[role]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Team Members */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Equipe</h3>
                      <p className="text-[11px] text-muted-foreground">{invitedUsers.length + 1} membros</p>
                    </div>
                  </div>
                  {can("invite_users") && (
                    <Button onClick={() => setInviteOpen(true)} size="sm" className="gradient-primary text-primary-foreground gap-1.5 text-xs">
                      <UserPlus className="h-3.5 w-3.5" /> Convidar
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Current User */}
                  {user && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/20 border">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{user.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", user.role === "admin" ? "border-primary/30 text-primary" : "border-info/30 text-info")}>
                        {roleLabels[user.role]}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Você</Badge>
                    </div>
                  )}

                  {/* Other Members */}
                  {invitedUsers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/10 transition-colors">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">{member.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", member.role === "admin" ? "border-primary/30 text-primary" : "border-info/30 text-info")}>
                        {roleLabels[member.role]}
                      </Badge>
                      {can("invite_users") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveUser(member.id, member.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {!can("invite_users") && (
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-[11px] text-muted-foreground text-center">
                      Apenas administradores podem gerenciar a equipe
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Convidar Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome Completo</Label>
              <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Nome do profissional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@hospital.com" className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nível de Acesso</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["admin", "farma"] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => setNewUser({ ...newUser, role })}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      newUser.role === role
                        ? role === "admin" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-info bg-info/5 ring-1 ring-info/30"
                        : "hover:bg-accent/30"
                    )}
                  >
                    <Badge variant="outline" className={cn("text-[10px] mb-1", role === "admin" ? "border-primary/30 text-primary" : "border-info/30 text-info")}>
                      {roleLabels[role]}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground leading-snug">{roleDescriptions[role]}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button onClick={handleInvite} className="gradient-primary text-primary-foreground gap-2">
                <UserPlus className="h-4 w-4" /> Enviar Convite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

function SettingsSection({ icon: Icon, title, children, delay = 0 }: { icon: any; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-5 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {children}
      </Card>
    </motion.div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ToggleField({ label, description, checked, onChange, badge }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {badge && <Badge variant="outline" className="text-[10px] text-muted-foreground">{badge}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={!!badge} />
    </div>
  );
}

export default Configuracoes;
