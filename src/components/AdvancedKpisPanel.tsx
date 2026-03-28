import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdvancedKpis } from "@/hooks/useAdvancedKpis";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, Target, RotateCcw, ShieldAlert, ArrowRight, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default memo(function AdvancedKpisPanel() {
  const { data: kpis, isLoading } = useAdvancedKpis();
  const navigate = useNavigate();

  if (isLoading) return <Skeleton className="h-32 rounded-2xl" />;
  if (!kpis) return null;

  const totalABC = kpis.curvaA + kpis.curvaB + kpis.curvaC;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-7">
      {/* Curva ABC */}
      <Card
        className="p-3 sm:p-4 border-border/40 rounded-xl sm:rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={() => navigate("/relatorios")}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/6">
            <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.8} />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Curva ABC</p>
        </div>
        {totalABC === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados</p>
        ) : (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] bg-destructive/8 text-destructive border-destructive/15 font-bold">A:{kpis.curvaA}</Badge>
            <Badge variant="outline" className="text-[9px] bg-warning/8 text-warning border-warning/15 font-bold">B:{kpis.curvaB}</Badge>
            <Badge variant="outline" className="text-[9px] bg-success/8 text-success border-success/15 font-bold">C:{kpis.curvaC}</Badge>
          </div>
        )}
      </Card>

      {/* Taxa de Atendimento */}
      <Card
        className="p-3 sm:p-4 border-border/40 rounded-xl sm:rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={() => navigate("/solicitacoes")}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/6">
            <Target className="h-4 w-4 text-success" strokeWidth={1.8} />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Atendimento</p>
        </div>
        <p className={cn("text-xl font-bold", kpis.taxaAtendimento >= 80 ? "text-success" : kpis.taxaAtendimento >= 50 ? "text-warning" : "text-destructive")}>
          {kpis.taxaAtendimento}%
        </p>
        <p className="text-[9px] text-muted-foreground">{kpis.totalSolicitacoes} solicit. (30d)</p>
      </Card>

      {/* Devoluções */}
      <Card
        className="p-3 sm:p-4 border-border/40 rounded-xl sm:rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={() => navigate("/movimentacoes")}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/6">
            <RotateCcw className="h-4 w-4 text-info" strokeWidth={1.8} />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Devoluções</p>
        </div>
        <p className="text-xl font-bold">{kpis.devolucoesMes}</p>
        <p className="text-[9px] text-muted-foreground">este mês</p>
      </Card>

      {/* Quarentena */}
      <Card
        className={cn(
          "p-3 sm:p-4 border-border/40 rounded-xl sm:rounded-2xl cursor-pointer hover:shadow-md transition-shadow",
          kpis.quarentena > 0 && "border-destructive/20"
        )}
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={() => navigate("/alertas")}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", kpis.quarentena > 0 ? "bg-destructive/6" : "bg-muted/50")}>
            <ShieldAlert className={cn("h-4 w-4", kpis.quarentena > 0 ? "text-destructive" : "text-muted-foreground")} strokeWidth={1.8} />
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Quarentena</p>
        </div>
        <p className={cn("text-xl font-bold", kpis.quarentena > 0 ? "text-destructive" : "text-muted-foreground")}>{kpis.quarentena}</p>
        <p className="text-[9px] text-muted-foreground">lotes bloqueados</p>
      </Card>
    </div>
  );
});
