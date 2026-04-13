import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Clock, CheckCircle2, User, Pill,
  Timer, TrendingUp, AlertCircle,
} from "lucide-react";
import { format, differenceInMinutes, differenceInHours, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicacaoPendente {
  id: string;
  prescricao_id: string;
  item_prescricao_id: string;
  paciente: string;
  prontuario: string | null;
  setor: string | null;
  medicamento: string;
  posologia: string;
  turno: string;
  horario_previsto: Date;
  status: "no_horario" | "proximo" | "atrasado" | "muito_atrasado" | "administrado";
  minutos_atraso: number;
}

const TURNO_HORARIOS: Record<string, { inicio: number; fim: number }> = {
  M: { inicio: 6, fim: 12 },
  T: { inicio: 12, fim: 18 },
  N: { inicio: 18, fim: 24 },
};

function calcularStatusMedicacao(turno: string, administrado: boolean): MedicacaoPendente["status"] {
  if (administrado) return "administrado";

  const now = new Date();
  const hora = now.getHours();
  const turnoInfo = TURNO_HORARIOS[turno];
  if (!turnoInfo) return "no_horario";

  const meioTurno = (turnoInfo.inicio + turnoInfo.fim) / 2;

  if (hora < turnoInfo.inicio) return "no_horario";
  if (hora >= turnoInfo.inicio && hora < meioTurno) return "proximo";
  if (hora >= meioTurno && hora < turnoInfo.fim) return "atrasado";
  if (hora >= turnoInfo.fim) return "muito_atrasado";

  return "no_horario";
}

function getMinutosAtraso(turno: string): number {
  const now = new Date();
  const hora = now.getHours();
  const turnoInfo = TURNO_HORARIOS[turno];
  if (!turnoInfo) return 0;

  const meioTurno = (turnoInfo.inicio + turnoInfo.fim) / 2;
  if (hora < meioTurno) return 0;
  return (hora - meioTurno) * 60 + now.getMinutes();
}

const STATUS_CONFIG = {
  administrado: { label: "Administrado", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2, priority: 4 },
  no_horario: { label: "Aguardando", color: "bg-muted text-muted-foreground", icon: Clock, priority: 3 },
  proximo: { label: "Próximo", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Timer, priority: 2 },
  atrasado: { label: "Atrasado", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400", icon: AlertTriangle, priority: 1 },
  muito_atrasado: { label: "Muito Atrasado", color: "bg-destructive/15 text-destructive", icon: AlertCircle, priority: 0 },
};

export function PainelAtrasos() {
  const { profile } = useAuth();
  const [now, setNow] = useState(new Date());

  // Refresh every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = format(now, "yyyy-MM-dd");

  const { data: medicacoes = [], isLoading } = useQuery({
    queryKey: ["painel-atrasos", today, profile?.filial_id],
    queryFn: async () => {
      // Get today's active prescriptions with items
      const { data: prescricoes } = await supabase
        .from("prescricoes")
        .select("id, paciente, prontuario, setor")
        .in("status", ["ativa", "parcialmente_dispensada"]);

      if (!prescricoes?.length) return [];

      const prescIds = prescricoes.map((p) => p.id);

      // Get items with medications
      const { data: itens } = await supabase
        .from("itens_prescricao")
        .select("id, prescricao_id, medicamento_id, posologia, quantidade_prescrita")
        .in("prescricao_id", prescIds);

      if (!itens?.length) return [];

      // Get med names
      const medIds = [...new Set(itens.map((i) => i.medicamento_id))];
      const { data: meds } = await supabase
        .from("medicamentos")
        .select("id, nome")
        .in("id", medIds);

      const medMap = new Map((meds || []).map((m) => [m.id, m.nome]));

      // Get today's checklist records
      const { data: checks } = await supabase
        .from("checklist_medicacao")
        .select("item_prescricao_id, turno, administrado")
        .in("prescricao_id", prescIds)
        .eq("data", today);

      const checkMap = new Map<string, boolean>();
      for (const c of checks || []) {
        checkMap.set(`${c.item_prescricao_id}-${c.turno}`, c.administrado);
      }

      // Build list
      const result: MedicacaoPendente[] = [];
      const prescMap = new Map(prescricoes.map((p) => [p.id, p]));

      for (const item of itens) {
        const presc = prescMap.get(item.prescricao_id);
        if (!presc) continue;

        const posologia = (item.posologia || "").toLowerCase();
        const turnos: string[] = [];

        if (posologia.includes("3x") || posologia.includes("8/8")) {
          turnos.push("M", "T", "N");
        } else if (posologia.includes("2x") || posologia.includes("12/12")) {
          turnos.push("M", "N");
        } else if (posologia.includes("noite")) {
          turnos.push("N");
        } else {
          turnos.push("M");
        }

        for (const turno of turnos) {
          const administrado = checkMap.get(`${item.id}-${turno}`) || false;
          const status = calcularStatusMedicacao(turno, administrado);
          const minutosAtraso = getMinutosAtraso(turno);

          result.push({
            id: `${item.id}-${turno}`,
            prescricao_id: item.prescricao_id,
            item_prescricao_id: item.id,
            paciente: presc.paciente,
            prontuario: presc.prontuario,
            setor: presc.setor,
            medicamento: medMap.get(item.medicamento_id) || "—",
            posologia: item.posologia || "",
            turno,
            horario_previsto: new Date(),
            status,
            minutos_atraso: administrado ? 0 : minutosAtraso,
          });
        }
      }

      // Sort: most urgent first
      result.sort((a, b) => {
        const pa = STATUS_CONFIG[a.status].priority;
        const pb = STATUS_CONFIG[b.status].priority;
        if (pa !== pb) return pa - pb;
        return b.minutos_atraso - a.minutos_atraso;
      });

      return result;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    const total = medicacoes.length;
    const administrados = medicacoes.filter((m) => m.status === "administrado").length;
    const atrasados = medicacoes.filter((m) => m.status === "atrasado" || m.status === "muito_atrasado").length;
    const proximos = medicacoes.filter((m) => m.status === "proximo").length;
    const pct = total > 0 ? Math.round((administrados / total) * 100) : 0;
    return { total, administrados, atrasados, proximos, pct };
  }, [medicacoes]);

  // Realtime subscription for checklist updates
  useEffect(() => {
    const channel = supabase
      .channel("checklist-atrasos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_medicacao" }, () => {
        // Will trigger refetch via react-query
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (isLoading) {
    return (
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendentes = medicacoes.filter((m) => m.status !== "administrado");

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-destructive/5 to-warning/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Painel de Atrasos — MAR</CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {format(now, "dd/MM/yyyy HH:mm", { locale: ptBR })} • Atualiza a cada minuto
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.atrasados > 0 && (
              <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse">
                <AlertCircle className="h-3 w-3" /> {stats.atrasados} atrasado{stats.atrasados > 1 ? "s" : ""}
              </Badge>
            )}
            {stats.proximos > 0 && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] gap-1">
                <Timer className="h-3 w-3" /> {stats.proximos} próximo{stats.proximos > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{stats.administrados} de {stats.total} administrados</span>
            <span className="font-bold">{stats.pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {pendentes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium">Todas as medicações foram administradas!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-border/30">
              {pendentes.map((med) => {
                const cfg = STATUS_CONFIG[med.status];
                const Icon = cfg.icon;
                const turnoLabel = med.turno === "M" ? "Manhã" : med.turno === "T" ? "Tarde" : "Noite";

                return (
                  <div
                    key={med.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors",
                      med.status === "muito_atrasado" && "bg-destructive/5"
                    )}
                  >
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{cfg.label}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold truncate">{med.paciente}</p>
                        {med.prontuario && (
                          <span className="text-[9px] font-mono text-muted-foreground">#{med.prontuario}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Pill className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">{med.medicamento}</span>
                        <span className="text-[9px] text-muted-foreground/50">• {med.posologia}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <Badge variant="outline" className="text-[9px] gap-0.5">
                        {turnoLabel}
                      </Badge>
                      {med.minutos_atraso > 0 && (
                        <span className={cn(
                          "text-[9px] font-bold",
                          med.status === "muito_atrasado" ? "text-destructive" : "text-orange-600 dark:text-orange-400"
                        )}>
                          +{med.minutos_atraso >= 60 ? `${Math.floor(med.minutos_atraso / 60)}h${med.minutos_atraso % 60}m` : `${med.minutos_atraso}min`}
                        </span>
                      )}
                    </div>

                    {med.setor && (
                      <Badge variant="secondary" className="text-[9px] shrink-0 hidden sm:inline-flex">
                        {med.setor}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default PainelAtrasos;
