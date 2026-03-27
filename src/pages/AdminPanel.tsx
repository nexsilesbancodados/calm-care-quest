import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type AppRole, type AuditEntry } from "@/types/database";
import {
  Users, Activity, Shield, Database, Package, Pill, AlertTriangle,
  ArrowLeftRight, BarChart3, Globe, Clock, TrendingUp, Eye,
  Server, HardDrive, Wifi, WifiOff, RefreshCw,
} from "lucide-react";

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/medicamentos": "Medicamentos",
  "/entrada": "Entrada",
  "/dispensacao": "Dispensação",
  "/movimentacoes": "Movimentações",
  "/estoque": "Estoque",
  "/transferencias": "Transferências",
  "/alertas": "Alertas",
  "/relatorios": "Relatórios",
  "/fornecedores": "Fornecedores",
  "/usuarios": "Usuários",
  "/configuracoes": "Configurações",
  "/leitor": "Leitor",
  "/etiquetas": "Etiquetas",
  "/admin": "Painel Admin",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  farmaceutico: "bg-success/10 text-success border-success/20",
  auxiliar_farmacia: "bg-info/10 text-info border-info/20",
  enfermeiro: "bg-warning/10 text-warning border-warning/20",
  visualizador: "bg-muted text-muted-foreground",
};

interface SystemStats {
  totalMeds: number;
  totalLotes: number;
  totalMovs: number;
  totalUsers: number;
  totalTransfers: number;
  pendingTransfers: number;
  lowStockCount: number;
  expiringCount: number;
}

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const { onlineUsers, onlineCount } = useOnlinePresence("/admin");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    const [
      { count: medsCount },
      { count: lotesCount },
      { count: movsCount },
      { count: usersCount },
      { count: transCount },
      { count: pendCount },
      { data: medsData },
      { data: lotesData },
      { data: auditData },
    ] = await Promise.all([
      supabase.from("medicamentos").select("id", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("lotes").select("id", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("movimentacoes").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("transferencias").select("id", { count: "exact", head: true }),
      supabase.from("transferencias").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      supabase.from("medicamentos").select("id, estoque_minimo").eq("ativo", true),
      supabase.from("lotes").select("id, medicamento_id, quantidade_atual, validade").eq("ativo", true),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    // Calculate low stock and expiring
    const now = new Date();
    const in60d = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    let lowStock = 0;
    let expiring = 0;

    (medsData || []).forEach((med: any) => {
      const lotes = (lotesData || []).filter((l: any) => l.medicamento_id === med.id);
      const total = lotes.reduce((s: number, l: any) => s + l.quantidade_atual, 0);
      if (total > 0 && total <= med.estoque_minimo) lowStock++;
      if (lotes.some((l: any) => new Date(l.validade) <= in60d && new Date(l.validade) > now)) expiring++;
    });

    setStats({
      totalMeds: medsCount || 0,
      totalLotes: lotesCount || 0,
      totalMovs: movsCount || 0,
      totalUsers: usersCount || 0,
      totalTransfers: transCount || 0,
      pendingTransfers: pendCount || 0,
      lowStockCount: lowStock,
      expiringCount: expiring,
    });

    setAuditLog((auditData || []) as AuditEntry[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!isAdmin) {
    return (
      <AppLayout title="Painel Admin">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Acesso restrito a administradores</p>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout title="Painel Admin">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Painel Administrativo" subtitle="Coordenação e monitoramento do sistema">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Usuários Online", value: onlineCount, icon: Wifi, color: "text-success" },
          { label: "Total Usuários", value: stats?.totalUsers || 0, icon: Users, color: "text-primary" },
          { label: "Medicamentos", value: stats?.totalMeds || 0, icon: Pill, color: "text-info" },
          { label: "Lotes Ativos", value: stats?.totalLotes || 0, icon: Package, color: "text-primary" },
          { label: "Movimentações", value: stats?.totalMovs || 0, icon: Activity, color: "text-info" },
          { label: "Transf. Pendentes", value: stats?.pendingTransfers || 0, icon: ArrowLeftRight, color: "text-warning" },
          { label: "Estoque Baixo", value: stats?.lowStockCount || 0, icon: AlertTriangle, color: "text-warning" },
          { label: "Vence em 60d", value: stats?.expiringCount || 0, icon: Clock, color: "text-destructive" },
        ].map((s, i) => (
          <div key={s.label}>
            <Card className="p-4 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={cn("h-4 w-4", s.color)} />
                <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            </Card>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="online" className="space-y-4">
        <TabsList>
          <TabsTrigger value="online" className="gap-1.5">
            <Wifi className="h-3.5 w-3.5" /> Online ({onlineCount})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Server className="h-3.5 w-3.5" /> Sistema
          </TabsTrigger>
        </TabsList>

        {/* Online Users Tab */}
        <TabsContent value="online">
          <Card className="shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-success" />
                Usuários Conectados em Tempo Real
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Monitore quem está acessando o sistema e em qual página
              </p>
            </div>
            {onlineUsers.length === 0 ? (
              <div className="py-12 text-center">
                <WifiOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum usuário online no momento</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Usuário</TableHead>
                    <TableHead className="text-xs">Papel</TableHead>
                    <TableHead className="text-xs">Página Atual</TableHead>
                    <TableHead className="text-xs">Conectado desde</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onlineUsers.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                          <span className="text-sm font-medium">{u.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", ROLE_COLORS[u.role] || "")}>
                          {ROLE_LABELS[u.role as AppRole] || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Eye className="h-2.5 w-2.5" />
                          {PAGE_LABELS[u.current_page] || u.current_page}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.last_seen).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                          Online
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card className="shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Log de Auditoria Completo
              </h3>
            </div>
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Data/Hora</TableHead>
                    <TableHead className="text-xs">Ação</TableHead>
                    <TableHead className="text-xs">Tabela</TableHead>
                    <TableHead className="text-xs">Registro</TableHead>
                    <TableHead className="text-xs">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{e.acao}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.tabela}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {e.registro_id?.substring(0, 8) || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {e.dados_novos ? JSON.stringify(e.dados_novos).substring(0, 60) + "…" : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5 shadow-card">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <Database className="h-4 w-4 text-primary" />
                Saúde do Banco de Dados
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Medicamentos ativos", value: stats?.totalMeds || 0, max: 500 },
                  { label: "Lotes ativos", value: stats?.totalLotes || 0, max: 2000 },
                  { label: "Movimentações", value: stats?.totalMovs || 0, max: 10000 },
                  { label: "Transferências", value: stats?.totalTransfers || 0, max: 1000 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold tabular-nums">{item.value.toLocaleString("pt-BR")}</span>
                    </div>
                    <Progress value={Math.min((item.value / item.max) * 100, 100)} className="h-1.5" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 shadow-card">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <HardDrive className="h-4 w-4 text-primary" />
                Informações do Sistema
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Versão", value: "1.0.0" },
                  { label: "Plataforma", value: "Supabase + React" },
                  { label: "Ambiente", value: "Produção" },
                  { label: "Última atualização", value: new Date().toLocaleDateString("pt-BR") },
                  { label: "Usuários online", value: `${onlineCount} conectado(s)` },
                  { label: "Alerta estoque", value: `${stats?.lowStockCount || 0} medicamentos` },
                  { label: "Transferências pendentes", value: `${stats?.pendingTransfers || 0}` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default AdminPanel;
