import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Clock, XCircle, ShieldAlert, CheckCircle2, RefreshCw,
  Bell, Zap, Settings2, Play, Package, FileText, CalendarClock,
  ArrowDownCircle, Eye, Tag, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutomations } from "@/hooks/useAutomations";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { toast } from "sonner";
import type { Medicamento, Lote } from "@/types/database";
import { getEstoqueTotal } from "@/types/database";

type AlertType = "esgotado" | "critico" | "validade" | "vencido";

const typeCfg: Record<AlertType, { label: string; className: string; icon: any }> = {
  vencido: { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldAlert },
  esgotado: { label: "Esgotado", className: "bg-muted text-muted-foreground", icon: XCircle },
  critico: { label: "Crítico", className: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
  validade: { label: "Vence em breve", className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
};

const priorityOrder: AlertType[] = ["vencido", "esgotado", "critico", "validade"];

const Alertas = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { log } = useAudit();
  const {
    configs, loading: automLoading, running,
    toggleConfig, runAutomations, refresh: refreshAutomations,
  } = useAutomations();

  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 2b: Baixa dialog
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [baixaTarget, setBaixaTarget] = useState<{ loteId: string; medNome: string; loteNum: string; validade: string; quantidade: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: medsData }, { data: lotesData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true),
      supabase.from("lotes").select("*").eq("ativo", true),
    ]);
    setMeds((medsData || []).map((m: any) => ({ ...m, lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id) })));
    setLoading(false);
  }, []);

  // 2c: Realtime instead of interval
  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("alertas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "lotes" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes" }, () => fetchData())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchData]);

  const now = new Date();
  const allAlerts = meds.flatMap(m => {
    const total = getEstoqueTotal(m.lotes);
    const items: { id: string; type: AlertType; title: string; desc: string; med: string; medId: string; timestamp: Date; loteId?: string; loteNum?: string; quantidade?: number; validade?: string }[] = [];
    if (total === 0) items.push({ id: `${m.id}-esg`, type: "esgotado", title: `${m.nome} esgotado`, desc: "Sem estoque disponível", med: m.nome, medId: m.id, timestamp: new Date(m.updated_at) });
    else if (m.estoque_minimo > 0 && total <= m.estoque_minimo * 0.25) items.push({ id: `${m.id}-crit`, type: "critico", title: `${m.nome} crítico`, desc: `Estoque: ${total}/${m.estoque_minimo}`, med: m.nome, medId: m.id, timestamp: new Date(m.updated_at) });
    m.lotes.forEach(l => {
      const diff = (new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 0) items.push({ id: `${l.id}-venc`, type: "vencido", title: `${m.nome} VENCIDO`, desc: `Lote ${l.numero_lote} venceu em ${new Date(l.validade).toLocaleDateString("pt-BR")}`, med: m.nome, medId: m.id, timestamp: new Date(l.validade), loteId: l.id, loteNum: l.numero_lote, quantidade: l.quantidade_atual, validade: l.validade });
      else if (diff <= 60) items.push({ id: `${l.id}-val`, type: "validade", title: `${m.nome} vence em breve`, desc: `Lote ${l.numero_lote} — ${Math.ceil(diff)} dias restantes`, med: m.nome, medId: m.id, timestamp: new Date(l.validade), loteId: l.id, loteNum: l.numero_lote });
    });
    return items;
  })
    .filter(a => !resolvedIds.has(a.id))
    .sort((a, b) => priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type));

  const filtered = tab === "all" ? allAlerts : allAlerts.filter(a => a.type === tab);

  const counts = {
    all: allAlerts.length,
    vencido: allAlerts.filter(a => a.type === "vencido").length,
    esgotado: allAlerts.filter(a => a.type === "esgotado").length,
    critico: allAlerts.filter(a => a.type === "critico").length,
    validade: allAlerts.filter(a => a.type === "validade").length,
  };

  // 2a: Baixa handler
  const handleBaixa = async () => {
    if (!baixaTarget) return;
    await supabase.from("lotes").update({ ativo: false }).eq("id", baixaTarget.loteId);
    await supabase.from("movimentacoes").insert({
      tipo: "ajuste" as any,
      medicamento_id: meds.find(m => m.lotes.some(l => l.id === baixaTarget.loteId))?.id || null,
      lote_id: baixaTarget.loteId,
      quantidade: baixaTarget.quantidade,
      usuario_id: user?.id,
      observacao: "Baixa por vencimento — automático via Alertas",
    });
    await log({ acao: "Baixa por vencimento", tabela: "lotes", registro_id: baixaTarget.loteId });
    toast.success(`Lote ${baixaTarget.loteNum} baixado com sucesso`);
    setResolvedIds(p => new Set([...p, `${baixaTarget.loteId}-venc`]));
    setBaixaDialogOpen(false);
    setBaixaTarget(null);
    fetchData();
  };

  const AUTOMACAO_LABELS: Record<string, { label: string; desc: string; icon: any }> = {
    alerta_estoque_baixo: { label: "Alertas de Estoque Baixo", desc: "Notifica quando medicamentos atingem estoque mínimo ou crítico", icon: Package },
    alerta_vencimento: { label: "Alertas de Vencimento", desc: "Notifica sobre lotes próximos da data de validade", icon: Clock },
    dispensacao_automatica: { label: "Dispensação Automática", desc: "Permite dispensar prescrições inteiras automaticamente com FEFO", icon: Zap },
    relatorio_periodico: { label: "Relatórios Periódicos", desc: "Gera resumos automáticos de movimentações e estoque", icon: CalendarClock },
  };

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
      subtitle={`${allAlerts.length} alertas ativos`}
      actions={
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setSettingsOpen(!settingsOpen)}>
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 gradient-primary text-primary-foreground" onClick={runAutomations} disabled={running}>
                {running ? <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Executar Agora</span>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      }
    >
      {/* Automation Config Panel */}
      <AnimatePresence>
        {settingsOpen && isAdmin && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
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
                    <div key={cfg.id} className={cn("flex items-start gap-3 rounded-xl border p-4 transition-all overflow-hidden relative", cfg.ativo ? "bg-card border-primary/20 shadow-card" : "bg-muted/30 border-border/50 opacity-70")}>
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cfg.ativo ? "bg-primary/10" : "bg-muted")}>
                        <meta.icon className={cn("h-4 w-4", cfg.ativo ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{meta.label}</p>
                          <Switch checked={cfg.ativo} onCheckedChange={(checked) => toggleConfig(cfg.tipo, checked)} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{meta.desc}</p>
                        {cfg.ultima_execucao && <p className="text-[10px] text-muted-foreground/60 mt-1">Última execução: {new Date(cfg.ultima_execucao).toLocaleString("pt-BR")}</p>}
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
          { key: "vencido" as AlertType, icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
          { key: "esgotado" as AlertType, icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
          { key: "critico" as AlertType, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { key: "validade" as AlertType, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
        ].map((item, i) => (
          <motion.div key={item.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className={cn(
              "group relative rounded-xl border bg-card p-4 shadow-card cursor-pointer transition-all hover:shadow-card-hover overflow-hidden",
              tab === item.key && "ring-2 ring-primary"
            )}
            onClick={() => setTab(tab === item.key ? "all" : item.key)}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110", item.bg)}>
                <item.icon className={cn("h-4.5 w-4.5", item.color)} />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{typeCfg[item.key].label}</p>
                <p className="text-xl sm:text-2xl font-bold font-display leading-tight">{counts[item.key]}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Todos
              {counts.all > 0 && <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px]">{counts.all}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="vencido" className="text-xs gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Vencidos</TabsTrigger>
            <TabsTrigger value="critico" className="text-xs gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Críticos</TabsTrigger>
            <TabsTrigger value="esgotado" className="text-xs gap-1.5"><XCircle className="h-3.5 w-3.5" /> Esgotados</TabsTrigger>
            <TabsTrigger value="validade" className="text-xs gap-1.5"><Clock className="h-3.5 w-3.5" /> Validade</TabsTrigger>
          </TabsList>
        </Tabs>
        {/* 2b: Resolver Todos */}
        {tab !== "all" && filtered.length > 1 && (
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
            setResolvedIds(p => new Set([...p, ...filtered.map(a => a.id)]));
            toast.success(`${filtered.length} alertas resolvidos`);
          }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolver todos ({filtered.length})
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
                ? "Não há alertas no momento. Continue monitorando o estoque."
                : `Não há alertas do tipo "${typeCfg[tab as AlertType]?.label || tab}" no momento.`}
            </p>
          </motion.div>
        ) : (
          filtered.map((a, i) => {
            const cfg = typeCfg[a.type];
            return (
              <motion.div key={a.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="group flex items-start gap-3 sm:gap-4 rounded-xl border bg-card p-3 sm:p-4 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden"
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cfg.className)}>
                  <cfg.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", cfg.className)}>{cfg.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </div>
                {/* 2a: Context buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {a.type === "esgotado" && (
                    <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1" onClick={() => navigate("/entrada")}>
                      <ArrowDownCircle className="h-3 w-3" /> Solicitar
                    </Button>
                  )}
                  {a.type === "critico" && (
                    <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1" onClick={() => navigate("/estoque")}>
                      <Eye className="h-3 w-3" /> Ver Estoque
                    </Button>
                  )}
                  {a.type === "validade" && (
                    <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1" onClick={() => navigate("/etiquetas")}>
                      <Tag className="h-3 w-3" /> Etiqueta
                    </Button>
                  )}
                  {a.type === "vencido" && a.loteId && (
                    <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1 text-destructive border-destructive/30" onClick={() => {
                      setBaixaTarget({ loteId: a.loteId!, medNome: a.med, loteNum: a.loteNum || "", validade: a.validade || "", quantidade: a.quantidade || 0 });
                      setBaixaDialogOpen(true);
                    }}>
                      <Trash2 className="h-3 w-3" /> Baixa
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-[11px] h-7 shrink-0 hover:bg-success/10 hover:text-success"
                    onClick={() => { setResolvedIds(p => new Set([...p, a.id])); toast.success("Alerta resolvido"); }}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Baixa AlertDialog */}
      <AlertDialog open={baixaDialogOpen} onOpenChange={setBaixaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Registrar Baixa por Vencimento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirmar baixa do lote <strong>{baixaTarget?.loteNum}</strong> de <strong>{baixaTarget?.medNome}</strong> (vencido em {baixaTarget?.validade ? new Date(baixaTarget.validade).toLocaleDateString("pt-BR") : "—"})? Serão baixadas <strong>{baixaTarget?.quantidade}</strong> unidades.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBaixa} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar Baixa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Alertas;
