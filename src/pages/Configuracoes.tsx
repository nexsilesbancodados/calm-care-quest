import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Bell, Shield, Printer, Database, Users, Save, Check } from "lucide-react";
import { toast } from "sonner";

const Configuracoes = () => {
  const [saved, setSaved] = useState(false);

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

  return (
    <AppLayout title="Configurações" subtitle="Ajustes gerais do sistema">
      <div className="max-w-3xl space-y-6">
        {/* Hospital Info */}
        <SettingsSection icon={Building2} title="Informações do Hospital" delay={0}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome do Hospital" value={settings.hospitalName} onChange={(v) => setSettings({ ...settings, hospitalName: v })} />
            <Field label="Farmácia" value={settings.pharmacyName} onChange={(v) => setSettings({ ...settings, pharmacyName: v })} />
            <Field label="CNPJ" value={settings.cnpj} onChange={(v) => setSettings({ ...settings, cnpj: v })} />
          </div>
        </SettingsSection>

        {/* Responsible */}
        <SettingsSection icon={Users} title="Farmacêutico Responsável" delay={0.05}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome Completo" value={settings.responsiblePharmacist} onChange={(v) => setSettings({ ...settings, responsiblePharmacist: v })} />
            <Field label="CRF" value={settings.crf} onChange={(v) => setSettings({ ...settings, crf: v })} />
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection icon={Bell} title="Alertas e Notificações" delay={0.1}>
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
        <SettingsSection icon={Shield} title="Segurança e Controle" delay={0.15}>
          <div className="space-y-4">
            <ToggleField label="Log de substâncias controladas" description="Registrar todas as movimentações de controlados automaticamente" checked={settings.controlledSubstanceLog} onChange={(v) => setSettings({ ...settings, controlledSubstanceLog: v })} />
            <ToggleField label="Conferência dupla" description="Exigir confirmação de segundo profissional para dispensação de controlados" checked={settings.doubleCheck} onChange={(v) => setSettings({ ...settings, doubleCheck: v })} />
          </div>
        </SettingsSection>

        {/* Backup */}
        <SettingsSection icon={Database} title="Backup e Dados" delay={0.2}>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-end pt-2 pb-8">
          <Button onClick={handleSave} className="gradient-primary text-primary-foreground gap-2 px-6">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Salvo!" : "Salvar Configurações"}
          </Button>
        </motion.div>
      </div>
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
