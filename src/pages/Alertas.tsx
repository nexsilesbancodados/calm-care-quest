import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, XCircle, ShieldAlert, CheckCircle2, ShoppingCart, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { getStockStatus } from "@/types/medication";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AlertType = "esgotado" | "crítico" | "validade" | "vencido";

const Alertas = () => {
  const { medications } = useMedicationContext();
  const now = new Date();
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const allAlerts = useMemo(() => [
    ...medications
      .filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "esgotado")
      .map((m) => ({ id: `${m.id}-esgotado`, type: "esgotado" as const, icon: XCircle, title: `${m.name} esgotado`, desc: `Lote ${m.batchNumber} — sem estoque`, med: m })),
    ...medications
      .filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "crítico")
      .map((m) => ({ id: `${m.id}-crítico`, type: "crítico" as const, icon: AlertTriangle, title: `${m.name} em nível crítico`, desc: `Estoque: ${m.currentStock}/${m.minimumStock} unidades`, med: m })),
    ...medications
      .filter((m) => {
        const diff = (new Date(m.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 60 && diff > 0;
      })
      .map((m) => ({ id: `${m.id}-validade`, type: "validade" as const, icon: Clock, title: `${m.name} próximo do vencimento`, desc: `Validade: ${new Date(m.expirationDate).toLocaleDateString("pt-BR")}`, med: m })),
    ...medications
      .filter((m) => new Date(m.expirationDate) < now)
      .map((m) => ({ id: `${m.id}-vencido`, type: "vencido" as const, icon: ShieldAlert, title: `${m.name} VENCIDO`, desc: `Venceu em ${new Date(m.expirationDate).toLocaleDateString("pt-BR")} — retirar imediatamente`, med: m })),
  ], [medications, now]);

  const alerts = useMemo(() => {
    return allAlerts
      .filter((a) => !resolvedIds.has(a.id))
      .filter((a) => typeFilter === "all" || a.type === typeFilter);
  }, [allAlerts, typeFilter, resolvedIds]);

  const typeConfig = {
    esgotado: { label: "Esgotado", className: "bg-muted text-muted-foreground" },
    crítico: { label: "Crítico", className: "bg-destructive/10 text-destructive" },
    validade: { label: "Validade", className: "bg-warning/10 text-warning" },
    vencido: { label: "Vencido", className: "bg-destructive/10 text-destructive" },
  };

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { esgotado: 0, crítico: 0, validade: 0, vencido: 0 };
    allAlerts.filter((a) => !resolvedIds.has(a.id)).forEach((a) => counts[a.type]++);
    return counts;
  }, [allAlerts, resolvedIds]);

  const handleResolve = (id: string) => {
    setResolvedIds((prev) => new Set([...prev, id]));
    toast.success("Alerta marcado como resolvido");
  };

  const handleRequestRestock = (name: string) => {
    toast.success(`Solicitação de reposição enviada para ${name}`);
  };

  return (
    <AppLayout title="Alertas" subtitle={`${alerts.length} alertas ativos`}>
      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({allAlerts.length - resolvedIds.size})</SelectItem>
            <SelectItem value="esgotado">Esgotado ({typeCounts.esgotado})</SelectItem>
            <SelectItem value="crítico">Crítico ({typeCounts.crítico})</SelectItem>
            <SelectItem value="validade">Validade ({typeCounts.validade})</SelectItem>
            <SelectItem value="vencido">Vencido ({typeCounts.vencido})</SelectItem>
          </SelectContent>
        </Select>
        {resolvedIds.size > 0 && (
          <Badge variant="outline" className="text-xs text-muted-foreground">{resolvedIds.size} resolvido(s)</Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(["esgotado", "crítico", "validade", "vencido"] as AlertType[]).map((type, i) => {
          const config = typeConfig[type];
          const icons = [XCircle, AlertTriangle, Clock, ShieldAlert];
          const Icon = icons[i];
          return (
            <motion.div key={type} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={cn("rounded-xl border bg-card p-3 shadow-card cursor-pointer transition-all", typeFilter === type && "ring-2 ring-primary")}
              onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
            >
              <div className="flex items-center gap-2">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", config.className)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{config.label}</p>
                  <p className="text-lg font-bold">{typeCounts[type]}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-3 max-w-3xl">
        {alerts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {resolvedIds.size > 0 ? "Todos os alertas filtrados foram resolvidos ✓" : "Nenhum alerta no momento ✓"}
          </div>
        ) : (
          alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", typeConfig[alert.type].className)}>
                <alert.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <Badge variant="outline" className={cn("text-[10px]", typeConfig[alert.type].className)}>
                    {typeConfig[alert.type].label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.desc}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Local: {alert.med.location}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {(alert.type === "esgotado" || alert.type === "crítico") && (
                  <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => handleRequestRestock(alert.med.name)}>
                    <ShoppingCart className="h-3 w-3" /> Solicitar
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-[10px] h-7 gap-1 text-muted-foreground" onClick={() => handleResolve(alert.id)}>
                  <CheckCircle2 className="h-3 w-3" /> Resolver
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </AppLayout>
  );
};

export default Alertas;
