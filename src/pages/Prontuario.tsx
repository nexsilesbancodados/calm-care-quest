import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { maskCpf } from "@/lib/security/pii";
import { UserCircle2, AlertTriangle, Pill, ClipboardCheck, HeartPulse, Activity, Stethoscope, Lock, Shield } from "lucide-react";

type Paciente = {
  id: string;
  nome: string;
  prontuario: string;
  cpf: string | null;
  data_nascimento: string;
  sexo: string;
  setor: string | null;
  leito: string | null;
  diagnostico_cid: string | null;
  risco_suicida?: string | null;
  em_contencao?: boolean;
};

type TimelineItem = {
  id: string;
  kind: "prescricao" | "dispensacao" | "mar" | "cssrs" | "escala" | "evolucao" | "contencao" | "consentimento";
  at: string;
  title: string;
  subtitle?: string;
  badge?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const kindMeta: Record<TimelineItem["kind"], { icon: typeof Pill; color: string; label: string }> = {
  prescricao: { icon: Pill, color: "text-primary", label: "Prescrição" },
  dispensacao: { icon: Pill, color: "text-info", label: "Dispensação" },
  mar: { icon: ClipboardCheck, color: "text-success", label: "MAR" },
  cssrs: { icon: HeartPulse, color: "text-destructive", label: "C-SSRS" },
  escala: { icon: Activity, color: "text-accent", label: "Escala" },
  evolucao: { icon: Stethoscope, color: "text-info", label: "Evolução" },
  contencao: { icon: Lock, color: "text-warning", label: "Contenção" },
  consentimento: { icon: Shield, color: "text-muted-foreground", label: "Consentimento" },
};

export default function Prontuario() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [alergias, setAlergias] = useState<Array<{ agente: string; severidade: string }>>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: p } = await db.from("pacientes").select("*").eq("id", id).single();
      setPaciente(p ?? null);

      const { data: al } = await db.from("alergias_paciente").select("agente, severidade").eq("paciente_id", id);
      setAlergias(al ?? []);

      const merged: TimelineItem[] = [];
      const add = async (table: string, kind: TimelineItem["kind"], build: (r: Record<string, unknown>) => { title: string; subtitle?: string; badge?: string; at: string }) => {
        const res = await db.from(table).select("*").eq("paciente_id", id).order("created_at", { ascending: false }).limit(50);
        (res.data ?? []).forEach((r: Record<string, unknown>) => {
          const v = build(r);
          merged.push({ id: `${table}-${r.id as string}`, kind, at: v.at, title: v.title, subtitle: v.subtitle, badge: v.badge });
        });
      };

      await Promise.all([
        add("avaliacoes_cssrs", "cssrs", (r) => ({
          at: String(r.data_avaliacao ?? r.created_at),
          title: `Risco ${String(r.risco).toUpperCase()}`,
          subtitle: String(r.conduta ?? "").slice(0, 120),
          badge: String(r.risco),
        })),
        add("administracoes_mar", "mar", (r) => ({
          at: String(r.horario_administrado ?? r.created_at),
          title: String(r.dose_administrada ?? "Dose administrada"),
          subtitle: r.recusado ? `Recusa: ${r.motivo_recusa ?? ""}` : `Via ${r.via ?? ""}`,
          badge: r.recusado ? "recusa" : undefined,
        })),
        add("evolucoes_enfermagem", "evolucao", (r) => ({
          at: `${String(r.data_ref)}T00:00:00`,
          title: `Evolução turno ${String(r.turno)}`,
          subtitle: String(r.queixas ?? "").slice(0, 150),
        })),
        add("contencoes", "contencao", (r) => ({
          at: String(r.inicio ?? r.created_at),
          title: `Contenção ${String(r.tipo)}`,
          subtitle: String(r.motivo ?? "").slice(0, 150),
          badge: r.fim ? "encerrada" : "ativa",
        })),
        add("escalas_psiquiatricas", "escala", (r) => ({
          at: String(r.data_aplicacao ?? r.created_at),
          title: `${String(r.escala)} — escore ${String(r.escore_total)}`,
          subtitle: String(r.classificacao ?? ""),
        })),
        add("consentimentos_lgpd", "consentimento", (r) => ({
          at: String(r.concedido_em ?? r.created_at),
          title: String(r.finalidade).replace(/_/g, " "),
          subtitle: r.revogado_em ? "Revogado" : "Ativo",
        })),
      ]);

      merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setTimeline(merged);
      setLoading(false);
    })();
  }, [id]);

  const idade = useMemo(() => {
    if (!paciente?.data_nascimento) return null;
    const d = new Date(paciente.data_nascimento);
    const ms = Date.now() - d.getTime();
    return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  }, [paciente]);

  if (!id) return null;

  if (loading) {
    return (
      <AppLayout title="Prontuário">
        <div className="space-y-4 p-4 md:p-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!paciente) {
    return (
      <AppLayout title="Prontuário">
        <div className="p-8 text-center text-sm text-muted-foreground">
          Paciente não encontrado.{" "}
          <Button variant="link" onClick={() => navigate("/pacientes")}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={paciente.nome}>
      <div className="page-enter space-y-5 p-4 md:p-8">
        <PageHeader
          title={paciente.nome}
          subtitle={`#${paciente.prontuario}${idade !== null ? ` · ${idade} anos` : ""}${paciente.sexo ? ` · ${paciente.sexo}` : ""}${paciente.leito ? ` · Leito ${paciente.leito}` : ""}`}
          icon={UserCircle2}
          variant="clinical"
          actions={
            <div className="flex flex-wrap gap-1.5">
              {paciente.em_contencao && <Badge variant="destructive">Em contenção</Badge>}
              {paciente.risco_suicida === "alto" && (
                <Badge className="bg-destructive text-destructive-foreground clinical-alert-high">
                  Risco suicida ALTO
                </Badge>
              )}
              {paciente.risco_suicida === "moderado" && (
                <Badge className="bg-warning/10 text-warning border-warning/40">Risco moderado</Badge>
              )}
              {paciente.cpf && <Badge variant="outline">CPF {maskCpf(paciente.cpf)}</Badge>}
              {paciente.diagnostico_cid && <Badge variant="outline">CID {paciente.diagnostico_cid}</Badge>}
            </div>
          }
        />

        {alergias.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Alergias registradas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {alergias.map((a, i) => (
                <Badge
                  key={i}
                  variant={a.severidade === "anafilatica" || a.severidade === "grave" ? "destructive" : "outline"}
                >
                  {a.agente} · {a.severidade}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate(`/cssrs?paciente=${id}`)}>
              <HeartPulse className="mr-1.5 h-3.5 w-3.5" /> C-SSRS
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/mar?paciente=${id}`)}>
              <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Registrar MAR
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/evolucao?paciente=${id}`)}>
              <Stethoscope className="mr-1.5 h-3.5 w-3.5" /> Evolução
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/contencao?paciente=${id}`)}>
              <Lock className="mr-1.5 h-3.5 w-3.5" /> Contenção
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/plano-seguranca?paciente=${id}`)}>
              <Shield className="mr-1.5 h-3.5 w-3.5" /> Plano segurança
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/escalas?paciente=${id}`)}>
              <Activity className="mr-1.5 h-3.5 w-3.5" /> Escala
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Linha do tempo</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="flex-wrap">
                <TabsTrigger value="all">Tudo</TabsTrigger>
                <TabsTrigger value="mar">MAR</TabsTrigger>
                <TabsTrigger value="evolucao">Evolução</TabsTrigger>
                <TabsTrigger value="cssrs">C-SSRS</TabsTrigger>
                <TabsTrigger value="escala">Escalas</TabsTrigger>
                <TabsTrigger value="contencao">Contenção</TabsTrigger>
              </TabsList>
              {(["all", "mar", "evolucao", "cssrs", "escala", "contencao"] as const).map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <TimelineList items={tab === "all" ? timeline : timeline.filter((t) => t.kind === tab)} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function TimelineList({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem registros.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const meta = kindMeta[it.kind];
        const Icon = meta.icon;
        return (
          <li key={it.id} className="flex gap-3 rounded-lg border p-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 ${meta.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{it.title}</p>
                <time className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(it.at).toLocaleString("pt-BR")}
                </time>
              </div>
              {it.subtitle && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{it.subtitle}</p>
              )}
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                {it.badge && <Badge variant="secondary" className="text-[10px]">{it.badge}</Badge>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
