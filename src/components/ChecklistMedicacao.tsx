import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Check, X, ChevronLeft, ChevronRight, Sun, Sunset, Moon, ClipboardCheck,
  Printer, User, Pill, Calendar, AlertCircle
} from "lucide-react";
import type { Prescricao, ItemPrescricao, Medicamento } from "@/types/database";

interface ChecklistRecord {
  id: string;
  item_prescricao_id: string;
  data: string;
  turno: string;
  administrado: boolean;
  enfermeiro_id: string | null;
  observacao: string;
}

interface ChecklistMedicacaoProps {
  prescricao: Prescricao & { itens?: (ItemPrescricao & { medicamento?: Medicamento })[] };
  onClose: () => void;
}

const TURNOS = [
  { key: "M", label: "Manhã", icon: Sun, color: "text-amber-500" },
  { key: "T", label: "Tarde", icon: Sunset, color: "text-orange-500" },
  { key: "N", label: "Noite", icon: Moon, color: "text-indigo-400" },
] as const;

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function ChecklistMedicacao({ prescricao, onClose }: ChecklistMedicacaoProps) {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<ChecklistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const itens = prescricao.itens || [];

  // Calculate week days
  const weekDays = useMemo(() => {
    const today = new Date();
    const base = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(base, i));
  }, [weekOffset]);

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  // Fetch records for current week
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("checklist_medicacao")
      .select("id, item_prescricao_id, data, turno, administrado, enfermeiro_id, observacao")
      .eq("prescricao_id", prescricao.id)
      .gte("data", format(weekStart, "yyyy-MM-dd"))
      .lte("data", format(weekEnd, "yyyy-MM-dd"));
    setRecords((data as ChecklistRecord[]) || []);
    setLoading(false);
  }, [prescricao.id, weekStart, weekEnd]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Realtime: sync with other users' changes
  useEffect(() => {
    const channel = supabase
      .channel(`checklist-rt-${prescricao.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_medicacao", filter: `prescricao_id=eq.${prescricao.id}` }, () => {
        fetchRecords();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [prescricao.id, fetchRecords]);

  // Get record for a specific item/day/turno
  const getRecord = useCallback((itemId: string, date: Date, turno: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return records.find(r => r.item_prescricao_id === itemId && r.data === dateStr && r.turno === turno);
  }, [records]);

  // Toggle administration
  const toggleAdmin = useCallback(async (itemId: string, date: Date, turno: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const cellKey = `${itemId}-${dateStr}-${turno}`;
    setSaving(cellKey);

    const existing = getRecord(itemId, date, turno);

    if (existing) {
      const newAdm = !existing.administrado;
      const { error } = await supabase
        .from("checklist_medicacao")
        .update({ administrado: newAdm, enfermeiro_id: user?.id })
        .eq("id", existing.id);
      if (error) { toast.error("Erro ao atualizar"); setSaving(null); return; }

      // Baixa automática ao marcar como administrado
      if (newAdm) {
        const { data: resultado } = await supabase.rpc("baixa_estoque_checklist", {
          _item_prescricao_id: itemId,
          _prescricao_id: prescricao.id,
          _usuario_id: user?.id,
        });
        if (resultado && typeof resultado === "object" && "success" in (resultado as Record<string, unknown>)) {
          const res = resultado as { success: boolean; medicamento?: string; lote?: string; estoque_restante?: number; error?: string };
          if (res.success) {
            toast.success(`Baixa automática: ${res.medicamento} — Lote ${res.lote} (restam ${res.estoque_restante})`);
          } else {
            toast.warning(res.error || "Sem estoque para baixa automática");
          }
        }
      }
    } else {
      const { error } = await supabase
        .from("checklist_medicacao")
        .insert({
          prescricao_id: prescricao.id,
          item_prescricao_id: itemId,
          data: dateStr,
          turno,
          administrado: true,
          enfermeiro_id: user?.id,
        });
      if (error) { toast.error("Erro ao registrar"); setSaving(null); return; }

      // Baixa automática ao inserir como administrado
      const { data: resultado } = await supabase.rpc("baixa_estoque_checklist", {
        _item_prescricao_id: itemId,
        _prescricao_id: prescricao.id,
        _usuario_id: user?.id,
      });
      if (resultado && typeof resultado === "object" && "success" in (resultado as Record<string, unknown>)) {
        const res = resultado as { success: boolean; medicamento?: string; lote?: string; estoque_restante?: number; error?: string };
        if (res.success) {
          toast.success(`Baixa automática: ${res.medicamento} — Lote ${res.lote} (restam ${res.estoque_restante})`);
        } else {
          toast.warning(res.error || "Sem estoque para baixa automática");
        }
      }
    }

    await fetchRecords();
    setSaving(null);
  }, [getRecord, prescricao.id, user?.id, fetchRecords]);

  // Count stats
  const stats = useMemo(() => {
    const totalCells = itens.length * 7 * 3;
    const administered = records.filter(r => r.administrado).length;
    return { totalCells, administered, pct: totalCells > 0 ? Math.round((administered / totalCells) * 100) : 0 };
  }, [itens.length, records]);

  // Intervals from posologia
  const getIntervals = useCallback((posologia: string) => {
    if (!posologia) return { M: 1, T: 0, N: 0 };
    const lower = posologia.toLowerCase();
    if (lower.includes("3x") || lower.includes("8/8")) return { M: 1, T: 1, N: 1 };
    if (lower.includes("2x") || lower.includes("12/12")) return { M: 1, T: 0, N: 1 };
    if (lower.includes("manhã") || lower.includes("manha")) return { M: 1, T: 0, N: 0 };
    if (lower.includes("noite")) return { M: 0, T: 0, N: 1 };
    return { M: 1, T: 0, N: 0 }; // default manhã
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (loading && records.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Check-list de Controle de Medicação</h3>
            <p className="text-[11px] text-muted-foreground">
              Prescrição #{prescricao.numero_receita} • {prescricao.paciente}
              {prescricao.prontuario && ` • Pront: ${prescricao.prontuario}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Check className="h-3 w-3" /> {stats.administered}/{stats.totalCells} ({stats.pct}%)
          </Badge>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs print:hidden" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </Button>
          <Button variant="ghost" size="sm" className="text-xs print:hidden" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Patient Info Bar */}
      <div className="rounded-lg border bg-muted/30 p-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-muted-foreground" /> <strong>Nome:</strong> {prescricao.paciente}</span>
        {prescricao.prontuario && <span className="flex items-center gap-1.5 font-mono"><strong>Pront:</strong> {prescricao.prontuario}</span>}
        {prescricao.setor && <span><strong>Setor:</strong> {prescricao.setor}</span>}
        <span><strong>Médico:</strong> {prescricao.medico}{prescricao.crm ? ` (CRM: ${prescricao.crm})` : ""}</span>
        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-muted-foreground" /> <strong>Data Rx:</strong> {new Date(prescricao.data_prescricao).toLocaleDateString("pt-BR")}</span>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)} className="gap-1 text-xs">
          <ChevronLeft className="h-3.5 w-3.5" /> Semana anterior
        </Button>
        <div className="text-xs font-medium text-muted-foreground">
          {format(weekStart, "dd/MM", { locale: ptBR })} — {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
        </div>
        <div className="flex items-center gap-2">
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-xs">
              Hoje
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)} className="gap-1 text-xs">
            Próxima semana <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 border-b border-r font-semibold text-[10px] uppercase tracking-wider text-muted-foreground min-w-[40px]">#</th>
              <th className="text-left p-2 border-b border-r font-semibold text-[10px] uppercase tracking-wider text-muted-foreground min-w-[160px]">Medicamento</th>
              <th className="text-center p-2 border-b border-r font-semibold text-[10px] uppercase tracking-wider text-muted-foreground w-[50px]">MG</th>
              <th className="text-center p-2 border-b border-r font-semibold text-[10px] uppercase tracking-wider text-muted-foreground" colSpan={3}>
                <span className="text-[9px]">Intervalo</span>
              </th>
              {weekDays.map((day, idx) => (
                <th
                  key={idx}
                  className={cn(
                    "text-center p-1 border-b border-r font-semibold text-[10px] uppercase tracking-wider",
                    isSameDay(day, today) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                  colSpan={3}
                >
                  <div>{DAY_LABELS[idx]}</div>
                  <div className="text-[9px] font-normal">{format(day, "dd/MM")}</div>
                </th>
              ))}
              <th className="text-center p-2 border-b font-semibold text-[10px] uppercase tracking-wider text-muted-foreground w-[50px]">QTD<br />Sem.</th>
            </tr>
            {/* Sub-header with M/T/N */}
            <tr className="bg-muted/30">
              <th className="border-b border-r" colSpan={3}></th>
              {TURNOS.map(t => (
                <th key={t.key} className="text-center p-1 border-b border-r text-[9px] font-medium text-muted-foreground w-[20px]">
                  {t.key}
                </th>
              ))}
              {weekDays.map((_, dayIdx) => (
                TURNOS.map(t => (
                  <th key={`${dayIdx}-${t.key}`} className={cn(
                    "text-center p-0.5 border-b text-[9px] font-medium",
                    t.key === "N" ? "border-r" : "",
                    "text-muted-foreground"
                  )}>
                    {t.key}
                  </th>
                ))
              ))}
              <th className="border-b"></th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td colSpan={100} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm">Nenhum medicamento na prescrição</p>
                    <p className="text-[11px]">Adicione itens à prescrição para usar o checklist</p>
                  </div>
                </td>
              </tr>
            ) : itens.map((item, idx) => {
              const intervals = getIntervals(item.posologia);
              const weeklyQty = Object.values(intervals).reduce((s, v) => s + v, 0) * 7 * item.quantidade_prescrita;

              return (
                <tr key={item.id} className={cn("hover:bg-accent/20 transition-colors", idx % 2 === 0 ? "bg-card" : "bg-muted/10")}>
                  {/* Number */}
                  <td className="p-2 border-b border-r text-center font-mono font-medium text-muted-foreground">{idx + 1}</td>
                  {/* Med name */}
                  <td className="p-2 border-b border-r">
                    <div className="flex items-center gap-1.5">
                      <Pill className="h-3 w-3 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.medicamento?.nome || "—"}</p>
                        {item.posologia && <p className="text-[9px] text-muted-foreground">{item.posologia}</p>}
                      </div>
                    </div>
                  </td>
                  {/* Dosage */}
                  <td className="p-2 border-b border-r text-center font-mono">
                    {item.medicamento?.concentracao || "—"}
                  </td>
                  {/* Interval M/T/N */}
                  {TURNOS.map(t => (
                    <td key={t.key} className="p-1 border-b border-r text-center font-mono">
                      {intervals[t.key as keyof typeof intervals]}
                    </td>
                  ))}
                  {/* Week cells */}
                  {weekDays.map((day, dayIdx) => (
                    TURNOS.map(t => {
                      const record = getRecord(item.id, day, t.key);
                      const isAdministered = record?.administrado;
                      const cellKey = `${item.id}-${format(day, "yyyy-MM-dd")}-${t.key}`;
                      const isSavingThis = saving === cellKey;
                      const isToday = isSameDay(day, today);
                      const intervalActive = intervals[t.key as keyof typeof intervals] > 0;

                      return (
                        <td
                          key={`${dayIdx}-${t.key}`}
                          className={cn(
                            "border-b text-center p-0",
                            t.key === "N" ? "border-r" : "",
                            isToday ? "bg-primary/5" : ""
                          )}
                        >
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className={cn(
                                    "w-full h-7 flex items-center justify-center transition-all",
                                    intervalActive ? "cursor-pointer hover:bg-accent/50" : "cursor-default opacity-30",
                                    isAdministered && "bg-emerald-500/15",
                                    isSavingThis && "animate-pulse"
                                  )}
                                  onClick={() => intervalActive && toggleAdmin(item.id, day, t.key)}
                                  disabled={!intervalActive || isSavingThis}
                                >
                                  {isAdministered ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : intervalActive ? (
                                    <span className="text-[9px] text-muted-foreground/40">—</span>
                                  ) : null}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-[11px]">
                                <p className="font-medium">{item.medicamento?.nome}</p>
                                <p>{DAY_LABELS[dayIdx]} {format(day, "dd/MM")} — {TURNOS.find(tt => tt.key === t.key)?.label}</p>
                                <p>{isAdministered ? "✅ Administrado" : "Pendente"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    })
                  ))}
                  {/* Weekly qty */}
                  <td className="p-2 border-b text-center font-mono font-medium">{weeklyQty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground print:hidden">
        <span className="flex items-center gap-1"><Sun className="h-3 w-3 text-amber-500" /> M = Manhã</span>
        <span className="flex items-center gap-1"><Sunset className="h-3 w-3 text-orange-500" /> T = Tarde</span>
        <span className="flex items-center gap-1"><Moon className="h-3 w-3 text-indigo-400" /> N = Noite</span>
        <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> = Administrado</span>
        <span>Clique na célula para registrar</span>
      </div>
    </div>
  );
}
