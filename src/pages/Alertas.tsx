import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Clock, XCircle, ShieldAlert, CheckCircle2, RefreshCw,
  Bell, Zap, Settings2, Play, Package, FileText, CalendarClock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutomations } from "@/hooks/useAutomations";
import { useAuth } from "@/contexts/AuthContext";

const TIPO_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; desc: string }> = {
  estoque_baixo: { label: "Estoque Baixo", icon: Package, color: "text-destructive", bg: "bg-destructive/10", desc: "Verifica medicamentos com estoque abaixo do mínimo" },
  vencimento: { label: "Vencimento", icon: Clock, color: "text-warning", bg: "bg-warning/10", desc: "Alerta sobre lotes próximos do vencimento" },
  dispensacao: { label: "Dispensação", icon: FileText, color: "text-info", bg: "bg-info/10", desc: "Dispensação automática via prescrição (FEFO)" },
  prescricao_vencida: { label: "Prescrição Vencida", icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", desc: "Prescrições que expiraram" },
  system: { label: "Sistema", icon: Bell, color: "text-primary", bg: "bg-primary/10", desc: "Notificações gerais do sistema" },
};

const SEVERIDADE_CONFIG: Record<string, { label: string; className: string }> = {
  critico: { label: "Crítico", className: "bg-destructive/10 text-destructive border-destructive/20" },
  alto: { label: "Alto", className: "bg-warning/10 text-warning border-warning/20" },
  medio: { label: "Médio", className: "bg-info/10 text-info border-info/20" },
  info: { label: "Info", className: "bg-primary/10 text-primary border-primary/20" },
};

const AUTOMACAO_LABELS: Record<string, { label: string; desc: string; icon: any }> = {
  alerta_estoque_baixo: { label: "Alertas de Estoque Baixo", desc: "Notifica quando medicamentos atingem estoque mínimo ou crítico", icon: Package },
  alerta_vencimento: { label: "Alertas de Vencimento", desc: "Notifica sobre lotes próximos da data de validade", icon: Clock },
  dispensacao_automatica: { label: "Dispensação Automática", desc: "Permite dispensar prescrições inteiras automaticamente com FEFO", icon: Zap },
  relatorio_periodico: { label: "Relatórios Periódicos", desc: "Gera resumos automáticos de movimentações e estoque", icon: CalendarClock },
};

const Alertas = () => {
  const { isAdmin } = useAuth();
  const {
    notificacoes, configs, loading, running,
    markAsRead, markAsResolved, markAllRead,
    toggleConfig, runAutomations, refresh,
  } = useAutomations();
  const [tab, setTab] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const tipos = ["all", "estoque_baixo", "vencimento", "dispensacao", "prescricao_vencida"];
  const filtered = tab === "all" ? notificacoes : notificacoes.filter((n) => n.tipo === tab);

  const counts: Record<string, number> = { all: notificacoes.length };
  notificacoes.forEach((n) => { counts[n.tipo] = (counts[n.tipo] || 0) + 1; });

  if (loading) {
    return (
      <AppLayout title="Alertas & Automações">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Alertas & Automações"
      subtitle={`${notificacoes.length} alertas ativos`}
      actions={
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 gradient-primary text-primary-foreground"
                onClick={runAutomations}
                disabled={running}
              >
                {running ? (
                  <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Executar Agora</span>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      }
    >
      {/* Automation Config Panel */}
      <AnimatePresence>
        {settingsOpen && isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Configuração de Automações</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {configs.map((cfg) => {
                  const meta = AUTOMACAO_LABELS[cfg.tipo];
                  if (!meta) return null;
                  return (
                    <div
                      key={cfg.id}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 transition-all",
                        cfg.ativo ? "bg-card border-primary/20" : "bg-muted/30 border-border/50 opacity-70"
                      )}
                    >
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cfg.ativo ? "bg-primary/10" : "bg-muted")}>
                        <meta.icon className={cn("h-4 w-4", cfg.ativo ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{meta.label}</p>
                          <Switch
                            checked={cfg.ativo}
                            onCheckedChange={(checked) => toggleConfig(cfg.tipo, checked)}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{meta.desc}</p>
                        {cfg.ultima_execucao && (
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            Última execução: {new Date(cfg.ultima_execucao).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { key: "estoque_baixo", icon: Package, color: "text-destructive", bg: "bg-destructive/10" },
          { key: "vencimento", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { key: "dispensacao", icon: FileText, color: "text-info", bg: "bg-info/10" },
          { key: "prescricao_vencida", icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((item, i) => {
          const cfg = TIPO_CONFIG[item.key];
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-xl border bg-card p-4 shadow-card cursor-pointer transition-all hover:shadow-card-hover",
                tab === item.key && "ring-2 ring-primary"
              )}
              onClick={() => setTab(tab === item.key ? "all" : item.key)}
            >
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", item.bg)}>
                  <item.icon className={cn("h-4 w-4", item.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{cfg?.label || item.key}</p>
                  <p className="text-xl font-bold">{counts[item.key] || 0}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Todos
              {counts.all > 0 && <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px]">{counts.all}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="estoque_baixo" className="text-xs gap-1.5">
              <Package className="h-3.5 w-3.5" /> Estoque
            </TabsTrigger>
            <TabsTrigger value="vencimento" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Vencimento
            </TabsTrigger>
            <TabsTrigger value="dispensacao" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Dispensação
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {notificacoes.some((n) => !n.lida) && (
          <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={markAllRead}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Alert List */}
      <div className="space-y-3 max-w-3xl">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Tudo em ordem!</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {tab === "all"
                ? "Não há alertas no momento. As automações estão monitorando o sistema."
                : `Não há alertas do tipo "${TIPO_CONFIG[tab]?.label || tab}" no momento.`}
            </p>
            {isAdmin && (
              <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={runAutomations} disabled={running}>
                <Play className="h-3.5 w-3.5" /> Verificar agora
              </Button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map((n, i) => {
              const cfg = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.system;
              const sev = SEVERIDADE_CONFIG[n.severidade] || SEVERIDADE_CONFIG.info;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, height: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border bg-card p-4 shadow-card hover:shadow-card-hover transition-all",
                    !n.lida && "border-l-2 border-l-primary"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cfg.bg)}>
                    <cfg.icon className={cn("h-5 w-5", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={cn("text-sm truncate", !n.lida ? "font-bold" : "font-semibold")}>{n.titulo}</p>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0", sev.className)}>
                        {sev.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[11px] h-8 shrink-0 hover:bg-success/10 hover:text-success"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsResolved(n.id);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolver
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
};

export default Alertas;
