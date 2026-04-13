import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AlertTriangle, HeartPulse, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { calcularRiscoCssrs, cssrsSchema } from "@/lib/schemas/paciente";
import { salvarAvaliacaoCssrs, sugestaoConduta } from "@/lib/clinical/cssrs";

type Paciente = { id: string; nome: string; prontuario: string; risco_suicida: string | null };
type Historico = {
  id: string; data_avaliacao: string; risco: "baixo" | "moderado" | "alto"; conduta: string;
};

const PERGUNTAS: Array<{ key: keyof FormState; label: string }> = [
  { key: "q1_desejo_morto", label: "1. Desejou estar morto(a) ou não acordar?" },
  { key: "q2_ideacao_suicida", label: "2. Teve pensamentos de se matar?" },
  { key: "q3_ideacao_com_metodo", label: "3. Pensou em como faria (método)?" },
  { key: "q4_ideacao_com_intencao", label: "4. Teve intenção de agir sobre esses pensamentos?" },
  { key: "q5_ideacao_com_plano", label: "5. Elaborou plano detalhado?" },
  { key: "q6_comportamento_30d", label: "6a. Teve comportamento suicida nos últimos 30 dias?" },
  { key: "q6_comportamento_vida", label: "6b. Já teve comportamento suicida alguma vez na vida?" },
];

type FormState = {
  q1_desejo_morto: boolean;
  q2_ideacao_suicida: boolean;
  q3_ideacao_com_metodo: boolean;
  q4_ideacao_com_intencao: boolean;
  q5_ideacao_com_plano: boolean;
  q6_comportamento_30d: boolean;
  q6_comportamento_vida: boolean;
};

const INITIAL: FormState = {
  q1_desejo_morto: false,
  q2_ideacao_suicida: false,
  q3_ideacao_com_metodo: false,
  q4_ideacao_com_intencao: false,
  q5_ideacao_com_plano: false,
  q6_comportamento_30d: false,
  q6_comportamento_vida: false,
};

const RISK_COLORS: Record<string, string> = {
  baixo: "bg-success/10 text-success border-success/30",
  moderado: "bg-warning/10 text-warning border-warning/30",
  alto: "bg-destructive text-destructive-foreground border-destructive animate-pulse",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function AvaliacaoCssrs() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState<string>("");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [observacao, setObservacao] = useState("");
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    db.from("pacientes")
      .select("id, nome, prontuario, risco_suicida")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }: { data: Paciente[] | null }) => setPacientes(data ?? []));
  }, []);

  useEffect(() => {
    if (!pacienteId) return setHistorico([]);
    db.from("avaliacoes_cssrs")
      .select("id, data_avaliacao, risco, conduta")
      .eq("paciente_id", pacienteId)
      .order("data_avaliacao", { ascending: false })
      .limit(10)
      .then(({ data }: { data: Historico[] | null }) => setHistorico(data ?? []));
  }, [pacienteId]);

  const risco = useMemo(
    () =>
      calcularRiscoCssrs({
        ...form,
        paciente_id: pacienteId || "00000000-0000-0000-0000-000000000000",
        data_avaliacao: new Date().toISOString(),
        avaliador_id: user?.id ?? "00000000-0000-0000-0000-000000000000",
        observacao,
      }),
    [form, pacienteId, user, observacao],
  );

  async function handleSalvar() {
    if (!pacienteId) return toast.error("Selecione o paciente");
    if (!user) return toast.error("Sessão expirada");
    const payload = {
      ...form,
      paciente_id: pacienteId,
      data_avaliacao: new Date().toISOString(),
      avaliador_id: user.id,
      observacao,
    };
    const parsed = cssrsSchema.safeParse(payload);
    if (!parsed.success) {
      return toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
    }
    try {
      setSalvando(true);
      await salvarAvaliacaoCssrs(parsed.data);
      toast.success(`Avaliação salva — risco ${risco}`);
      setForm(INITIAL);
      setObservacao("");
      const { data } = await db
        .from("avaliacoes_cssrs")
        .select("id, data_avaliacao, risco, conduta")
        .eq("paciente_id", pacienteId)
        .order("data_avaliacao", { ascending: false })
        .limit(10);
      setHistorico(data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppLayout title="Avaliação C-SSRS">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Avaliação de Risco Suicida — C-SSRS"
          subtitle="Columbia Suicide Severity Rating Scale — screener para equipe clínica."
          icon={HeartPulse}
          variant="clinical"
        />

        <Card>
          <CardHeader>
            <CardTitle>Nova avaliação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="pac">Paciente</Label>
              <Select value={pacienteId} onValueChange={setPacienteId}>
                <SelectTrigger id="pac" aria-label="Selecionar paciente">
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {p.prontuario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {PERGUNTAS.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <Label htmlFor={key} className="pr-4 text-sm leading-snug">
                    {label}
                  </Label>
                  <Switch
                    id={key}
                    checked={form[key]}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="obs">Observação clínica</Label>
              <Textarea
                id="obs"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                maxLength={2000}
                placeholder="Contexto, fatores de risco/proteção, histórico relevante…"
              />
            </div>

            <div
              className={`relative flex flex-col gap-3 overflow-hidden rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
                risco === "alto"
                  ? "border-destructive/40 bg-destructive/5"
                  : risco === "moderado"
                  ? "border-warning/40 bg-warning/5"
                  : "border-success/40 bg-success/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    risco === "alto"
                      ? "bg-destructive/15 text-destructive"
                      : risco === "moderado"
                      ? "bg-warning/15 text-warning"
                      : "bg-success/15 text-success"
                  }`}
                >
                  {risco === "alto" ? (
                    <AlertTriangle className="h-6 w-6" aria-hidden />
                  ) : (
                    <ShieldCheck className="h-6 w-6" aria-hidden />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Risco calculado
                  </p>
                  <Badge className={`mt-1 text-xs font-bold ${RISK_COLORS[risco]}`}>
                    {risco.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="max-w-md text-xs leading-relaxed text-muted-foreground sm:text-right">
                {sugestaoConduta(risco)}
              </div>
            </div>

            <Button disabled={!pacienteId || salvando} onClick={handleSalvar} className="w-full">
              {salvando ? "Salvando…" : "Salvar avaliação"}
            </Button>
          </CardContent>
        </Card>

        {pacienteId && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico (últimas 10)</CardTitle>
            </CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma avaliação anterior.</p>
              ) : (
                <ul className="space-y-2">
                  {historico.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded border p-3">
                      <div className="text-sm">
                        {new Date(h.data_avaliacao).toLocaleString("pt-BR")}
                      </div>
                      <Badge className={RISK_COLORS[h.risco]}>{h.risco}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
