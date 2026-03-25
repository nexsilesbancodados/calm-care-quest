import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, XCircle, ShieldAlert, CheckCircle2, RefreshCw, Package, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: medsData }, { data: lotesData }] = await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true),
      supabase.from("lotes").select("*").eq("ativo", true),
    ]);
    setMeds((medsData || []).map((m: any) => ({ ...m, lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id) })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const now = new Date();
  const allAlerts = meds.flatMap(m => {
    const total = getEstoqueTotal(m.lotes);
    const items: { id: string; type: AlertType; title: string; desc: string; med: string; timestamp: Date }[] = [];
    if (total === 0) items.push({ id: `${m.id}-esg`, type: "esgotado", title: `${m.nome} esgotado`, desc: "Sem estoque disponível", med: m.nome, timestamp: new Date(m.updated_at) });
    else if (m.estoque_minimo > 0 && total <= m.estoque_minimo * 0.25) items.push({ id: `${m.id}-crit`, type: "critico", title: `${m.nome} crítico`, desc: `Estoque: ${total}/${m.estoque_minimo}`, med: m.nome, timestamp: new Date(m.updated_at) });
    m.lotes.forEach(l => {
      const diff = (new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 0) items.push({ id: `${l.id}-venc`, type: "vencido", title: `${m.nome} VENCIDO`, desc: `Lote ${l.numero_lote} venceu em ${new Date(l.validade).toLocaleDateString("pt-BR")}`, med: m.nome, timestamp: new Date(l.validade) });
      else if (diff <= 60) items.push({ id: `${l.id}-val`, type: "validade", title: `${m.nome} vence em breve`, desc: `Lote ${l.numero_lote} — ${Math.ceil(diff)} dias restantes`, med: m.nome, timestamp: new Date(l.validade) });
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

  return (
    <AppLayout
      title="Alertas"
      subtitle={`${allAlerts.length} alertas ativos`}
      actions={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={fetchData}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { key: "vencido" as AlertType, icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
          { key: "esgotado" as AlertType, icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
          { key: "critico" as AlertType, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { key: "validade" as AlertType, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
        ].map((item, i) => (
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
                <p className="text-xs text-muted-foreground">{typeCfg[item.key].label}</p>
                <p className="text-xl font-bold">{counts[item.key]}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all" className="text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Todos
            {counts.all > 0 && <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px]">{counts.all}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="vencido" className="text-xs gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Vencidos
            {counts.vencido > 0 && <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px]">{counts.vencido}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="critico" className="text-xs gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Críticos
          </TabsTrigger>
          <TabsTrigger value="esgotado" className="text-xs gap-1.5">
            <XCircle className="h-3.5 w-3.5" /> Esgotados
          </TabsTrigger>
          <TabsTrigger value="validade" className="text-xs gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Validade
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-card hover:shadow-card-hover transition-all"
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cfg.className)}>
                  <cfg.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", cfg.className)}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[11px] h-8 shrink-0 hover:bg-success/10 hover:text-success"
                  onClick={() => {
                    setResolvedIds(p => new Set([...p, a.id]));
                    toast.success("Alerta marcado como resolvido");
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolver
                </Button>
              </motion.div>
            );
          })
        )}
      </div>
    </AppLayout>
  );
};

export default Alertas;
