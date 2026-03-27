import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Search, User, FileText, Calendar, Pill, Clock, Activity, Download, ClipboardList } from "lucide-react";

interface PatientSummary {
  paciente: string;
  prontuario: string | null;
  total_dispensacoes: number;
  ultima_dispensacao: string;
  medicamentos_distintos: number;
}

interface PatientMovement {
  id: string;
  tipo: string;
  quantidade: number;
  created_at: string;
  setor: string | null;
  observacao: string;
  prescricao_id: string | null;
  medicamento_nome: string;
  medicamento_concentracao: string;
}

const Pacientes = () => {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [timeline, setTimeline] = useState<PatientMovement[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("movimentacoes")
        .select("paciente, prontuario, quantidade, created_at, medicamento_id")
        .in("tipo", ["dispensacao", "saida"])
        .not("paciente", "is", null)
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      const map = new Map<string, PatientSummary>();
      const medSets = new Map<string, Set<string>>();

      data.forEach((m: any) => {
        const key = m.paciente?.trim();
        if (!key) return;
        if (!map.has(key)) {
          map.set(key, {
            paciente: key,
            prontuario: m.prontuario,
            total_dispensacoes: 0,
            ultima_dispensacao: m.created_at,
            medicamentos_distintos: 0,
          });
          medSets.set(key, new Set());
        }
        const p = map.get(key)!;
        p.total_dispensacoes++;
        if (m.medicamento_id) medSets.get(key)!.add(m.medicamento_id);
        if (m.created_at > p.ultima_dispensacao) p.ultima_dispensacao = m.created_at;
      });

      medSets.forEach((set, key) => {
        const p = map.get(key);
        if (p) p.medicamentos_distintos = set.size;
      });

      setPatients(Array.from(map.values()).sort((a, b) => b.ultima_dispensacao.localeCompare(a.ultima_dispensacao)));
      setLoading(false);
    };
    fetch();
  }, [profile?.filial_id]);

  const openTimeline = async (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setTimelineLoading(true);

    const { data } = await supabase
      .from("movimentacoes")
      .select("id, tipo, quantidade, created_at, setor, observacao, prescricao_id, medicamentos(nome, concentracao)")
      .eq("paciente", patient.paciente)
      .order("created_at", { ascending: false })
      .limit(200);

    setTimeline(
      (data || []).map((m: any) => ({
        id: m.id,
        tipo: m.tipo,
        quantidade: m.quantidade,
        created_at: m.created_at,
        setor: m.setor,
        observacao: m.observacao,
        prescricao_id: m.prescricao_id,
        medicamento_nome: m.medicamentos?.nome || "—",
        medicamento_concentracao: m.medicamentos?.concentracao || "",
      }))
    );
    setTimelineLoading(false);
  };

  const filtered = patients.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.paciente.toLowerCase().includes(s) || p.prontuario?.toLowerCase().includes(s);
  });

  const exportCSV = () => {
    if (!selectedPatient || timeline.length === 0) return;
    const headers = ["Data", "Medicamento", "Concentração", "Quantidade", "Setor", "Prescrição", "Observação"];
    const rows = timeline.map(t => [
      new Date(t.created_at).toLocaleString("pt-BR"),
      t.medicamento_nome,
      t.medicamento_concentracao,
      t.quantidade,
      t.setor || "—",
      t.prescricao_id?.substring(0, 8) || "—",
      t.observacao || "",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `paciente-${selectedPatient.paciente.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) return <AppLayout title="Histórico de Pacientes"><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></AppLayout>;

  return (
    <AppLayout title="Histórico de Pacientes" subtitle={`${patients.length} pacientes com dispensações registradas`}>
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou prontuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Nenhum paciente encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Dispensações registradas com nome do paciente aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <div key={p.paciente}>
              <Card
                className="p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer group"
                onClick={() => openTimeline(p)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.paciente}</p>
                    {p.prontuario && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Prontuário: {p.prontuario}
                      </p>
                    )}
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-primary">{p.total_dispensacoes}</p>
                    <p className="text-[10px] text-muted-foreground">Dispensações</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{p.medicamentos_distintos}</p>
                    <p className="text-[10px] text-muted-foreground">Medicamentos</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {new Date(p.ultima_dispensacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Última</p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Timeline Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {selectedPatient?.paciente}
              {selectedPatient?.prontuario && (
                <Badge variant="outline" className="text-[10px] ml-2">Pront. {selectedPatient.prontuario}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">{timeline.length} registros</p>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </Button>
          </div>

          {timelineLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : (
            <ScrollArea className="max-h-[55vh] pr-2">
              <div className="relative pl-6 space-y-0">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

                {timeline.map((t, i) => {
                  const isDispensacao = t.tipo === "dispensacao";
                  return (
                    <div
                      key={t.id}
                      className="relative pb-4"
                    >
                      {/* Dot */}
                      <div className={cn(
                        "absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-background",
                        isDispensacao ? "bg-info" : "bg-warning"
                      )} />

                      <div className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Pill className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium">{t.medicamento_nome}</span>
                            <span className="text-xs text-muted-foreground">{t.medicamento_concentracao}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{t.quantidade} un.</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(t.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {t.setor && <span>• {t.setor}</span>}
                          {t.prescricao_id && (
                            <span className="flex items-center gap-1">
                              • <ClipboardList className="h-3 w-3" /> Rx {t.prescricao_id.substring(0, 8)}
                            </span>
                          )}
                        </div>
                        {t.observacao && <p className="text-[11px] text-muted-foreground mt-1 italic">{t.observacao}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Pacientes;
