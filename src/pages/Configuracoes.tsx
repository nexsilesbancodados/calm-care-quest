import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Bell, Shield, Save, Check, Plus, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ConfigHospital, ClinicaParceira, Categoria, AuditEntry } from "@/types/database";

const Configuracoes = () => {
  const { isAdmin } = useAuth();
  const { log } = useAudit();
  const [config, setConfig] = useState<ConfigHospital | null>(null);
  const [clinicas, setClinicas] = useState<ClinicaParceira[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [clinicaDialog, setClinicaDialog] = useState(false);
  const [clinicaForm, setClinicaForm] = useState({ nome: "", cnes: "", endereco: "", contato: "", telefone: "" });

  useEffect(() => {
    const fetch = async () => {
      const [{ data: cfgData }, { data: cData }, { data: catData }, { data: auditData }] = await Promise.all([
        supabase.from("configuracoes_hospital").select("*").single(),
        supabase.from("clinicas_parceiras").select("*").order("nome"),
        supabase.from("categorias_medicamento").select("*").order("nome"),
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setConfig(cfgData as ConfigHospital || null);
      setClinicas(cData as ClinicaParceira[] || []);
      setCategorias(catData as Categoria[] || []);
      setAuditEntries(auditData as AuditEntry[] || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSaveConfig = async () => {
    if (!config) return;
    await supabase.from("configuracoes_hospital").update({ nome: config.nome, cnes: config.cnes, alerta_estoque_pct: config.alerta_estoque_pct, alerta_vencimento_dias: config.alerta_vencimento_dias }).eq("id", config.id);
    setSaved(true); toast.success("Configurações salvas!"); setTimeout(() => setSaved(false), 2000);
  };

  const handleAddClinica = async () => {
    if (!clinicaForm.nome) { toast.error("Nome é obrigatório"); return; }
    const { data, error } = await supabase.from("clinicas_parceiras").insert(clinicaForm).select().single();
    if (error) { toast.error("Erro"); return; }
    setClinicas(prev => [...prev, data as ClinicaParceira]);
    await log({ acao: "Cadastro Clínica", tabela: "clinicas_parceiras", registro_id: data.id });
    toast.success("Clínica cadastrada!");
    setClinicaDialog(false);
    setClinicaForm({ nome: "", cnes: "", endereco: "", contato: "", telefone: "" });
  };

  if (!isAdmin) return <AppLayout title="Configurações"><p className="text-muted-foreground text-center py-12">Acesso restrito a administradores</p></AppLayout>;
  if (loading) return <AppLayout title="Configurações"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout title="Configurações" subtitle="Ajustes gerais do sistema">
      <div className="max-w-3xl">
        <Tabs defaultValue="geral">
          <TabsList className="mb-6">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="clinicas">Clínicas Parceiras</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
            <TabsTrigger value="auditoria"><ScrollText className="h-3.5 w-3.5 mr-1" />Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-6">
            {config && (
              <Card className="p-5 shadow-card space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" />Hospital</div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={config.nome} onChange={e => setConfig({ ...config, nome: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">CNES</Label><Input value={config.cnes} onChange={e => setConfig({ ...config, cnes: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Alerta Estoque (%)</Label><Input type="number" value={config.alerta_estoque_pct} onChange={e => setConfig({ ...config, alerta_estoque_pct: Number(e.target.value) })} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Alerta Vencimento (dias)</Label><Input type="number" value={config.alerta_vencimento_dias} onChange={e => setConfig({ ...config, alerta_vencimento_dias: Number(e.target.value) })} /></div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveConfig} className="gradient-primary text-primary-foreground gap-2">
                    {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saved ? "Salvo!" : "Salvar"}
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="clinicas" className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => setClinicaDialog(true)} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" />Nova Clínica</Button></div>
            <div className="grid sm:grid-cols-2 gap-4">
              {clinicas.map(c => (
                <Card key={c.id} className="p-4 shadow-card">
                  <p className="text-sm font-semibold">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.cnes && `CNES: ${c.cnes} • `}{c.endereco}</p>
                  <p className="text-xs text-muted-foreground">{c.contato} • {c.telefone}</p>
                  <Badge variant="outline" className={cn("text-[9px] mt-2", c.ativo ? "bg-success/10 text-success" : "bg-muted")}>{c.ativo ? "Ativa" : "Inativa"}</Badge>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categorias">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categorias.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                  <span className="text-sm font-medium">{c.nome}</span>
                  <Badge variant="outline" className={cn("text-[9px] ml-auto", c.ativo ? "bg-success/10 text-success" : "bg-muted")}>{c.ativo ? "Ativa" : "Inativa"}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="auditoria">
            <Card className="shadow-card overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Ação</TableHead>
                  <TableHead className="text-xs">Tabela</TableHead>
                  <TableHead className="text-xs">Registro</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {auditEntries.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs font-medium">{e.acao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.tabela}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{e.registro_id?.substring(0, 8) || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={clinicaDialog} onOpenChange={setClinicaDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Nova Clínica Parceira</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={clinicaForm.nome} onChange={e => setClinicaForm({ ...clinicaForm, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">CNES</Label><Input value={clinicaForm.cnes} onChange={e => setClinicaForm({ ...clinicaForm, cnes: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Telefone</Label><Input value={clinicaForm.telefone} onChange={e => setClinicaForm({ ...clinicaForm, telefone: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Endereço</Label><Input value={clinicaForm.endereco} onChange={e => setClinicaForm({ ...clinicaForm, endereco: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Contato</Label><Input value={clinicaForm.contato} onChange={e => setClinicaForm({ ...clinicaForm, contato: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setClinicaDialog(false)}>Cancelar</Button><Button onClick={handleAddClinica} className="gradient-primary text-primary-foreground">Cadastrar</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Configuracoes;
