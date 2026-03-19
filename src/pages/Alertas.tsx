import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, XCircle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mockMedications } from "@/data/mockMedications";
import { getStockStatus } from "@/types/medication";
import { cn } from "@/lib/utils";

const Alertas = () => {
  const now = new Date();

  const alerts = [
    ...mockMedications
      .filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "esgotado")
      .map((m) => ({ type: "esgotado" as const, icon: XCircle, title: `${m.name} esgotado`, desc: `Lote ${m.batchNumber} — sem estoque`, med: m })),
    ...mockMedications
      .filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "crítico")
      .map((m) => ({ type: "crítico" as const, icon: AlertTriangle, title: `${m.name} em nível crítico`, desc: `Estoque: ${m.currentStock}/${m.minimumStock} unidades`, med: m })),
    ...mockMedications
      .filter((m) => {
        const diff = (new Date(m.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 60 && diff > 0;
      })
      .map((m) => ({ type: "validade" as const, icon: Clock, title: `${m.name} próximo do vencimento`, desc: `Validade: ${new Date(m.expirationDate).toLocaleDateString("pt-BR")}`, med: m })),
    ...mockMedications
      .filter((m) => new Date(m.expirationDate) < now)
      .map((m) => ({ type: "vencido" as const, icon: ShieldAlert, title: `${m.name} VENCIDO`, desc: `Venceu em ${new Date(m.expirationDate).toLocaleDateString("pt-BR")} — retirar imediatamente`, med: m })),
  ];

  const typeConfig = {
    esgotado: { label: "Esgotado", className: "bg-muted text-muted-foreground" },
    crítico: { label: "Crítico", className: "bg-destructive/10 text-destructive" },
    validade: { label: "Validade", className: "bg-warning/10 text-warning" },
    vencido: { label: "Vencido", className: "bg-destructive/10 text-destructive" },
  };

  return (
    <AppLayout title="Alertas" subtitle={`${alerts.length} alertas ativos`}>
      <div className="space-y-3 max-w-3xl">
        {alerts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Nenhum alerta no momento ✓</div>
        ) : (
          alerts.map((alert, i) => (
            <motion.div
              key={`${alert.med.id}-${alert.type}`}
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
            </motion.div>
          ))
        )}
      </div>
    </AppLayout>
  );
};

export default Alertas;
