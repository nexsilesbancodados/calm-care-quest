import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Activity } from "lucide-react";
import { ESCALAS, type EscalaKey, calcularEscore } from "@/lib/clinical/escalas";

type Paciente = { id: string; nome: string; prontuario: string };
type HistItem = {
  id: string;
  escala: EscalaKey;
  data_aplicacao: string;
  escore_total: number;
  classificacao: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function Escalas() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacId, setPacId] = useState("");
  const [escalaKey, setEscalaKey] = useState<EscalaKey>("HAMD");
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [obs, setObs] = useState("");
  const [hist, setHist] = useState<HistItem[]>([]);
  const [salvando, setSalvando] = useState(false);

  const def = ESCALAS[escalaKey];

  useEffect(() => {
    db.from("pacientes").select("id, nome, prontuario").eq("ativo", true).order("nome")
      .then(({ data }: { data: Paciente[] | null }) => setPacientes(data ?? []));
  }, []);

  useEffect(() => {
    if (!pacId) return setHist([]);
    db.from("escalas_psiquiatricas")
      .select("id, escala, data_aplicacao, escore_total, classificacao")
      .eq("paciente_id", pacId)
      .order("data_aplicacao", { ascending: false })
      .limit(20)
      .then(({ data }: { data: HistItem[] | null }) => setHist(data ?? []));
  }, [pacId, salvando]);

  useEffect(() => {
    setRespostas({});
  }, [escalaKey]);

  const escore = useMemo(() => calcularEscore(escalaKey, respostas), [escalaKey, respostas]);
  const classificacao = def.classificar(escore);

  async function salvar() {
    if (!pacId || !user) return toast.error("Selecione paciente");
    if (Object.keys(respostas).length !== def.itens.length) {
      return toast.error(`Responda todos os ${def.itens.length} itens`);
    }
    try {
      setSalvando(true);
      const { error } = await db.from("escalas_psiquiatricas").insert({
        paciente_id: pacId,
        avaliador_id: user.id,
        escala: escalaKey,
        data_aplicacao: new Date().toISOString(),
        respostas,
        escore_total: escore,
        classificacao,
        observacao: obs,
      });
      if (error) throw error;
      toast.success(`${def.key} registrada: ${escore} (${classificacao})`);
      setRespostas({});
      setObs("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppLayout title="Escalas Psiquiátricas">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Escalas Psiquiátricas"
          subtitle="PANSS, HAM-D, BDI, YMRS, AIMS, HAM-A, MMSE — validar com equipe clínica."
          icon={Activity}
          variant="clinical"
        />

        <Card>
          <CardHeader>
            <CardTitle>Nova avaliação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Paciente</Label>
              <Select value={pacId} onValueChange={setPacId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} — {p.prontuario}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Escala</Label>
              <Select value={escalaKey} onValueChange={(v) => setEscalaKey(v as EscalaKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ESCALAS).map((e) => (
                    <SelectItem key={e.key} value={e.key}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 rounded border bg-muted/30 p-3 text-xs text-muted-foreground">
              {def.descricao}
            </div>

            <div className="md:col-span-2 space-y-2">
              {def.itens.map((it) => (
                <div key={it.id} className="flex items-center gap-3 rounded border p-3">
                  <span className="flex-1 text-sm">{it.label}</span>
                  <Input
                    type="number"
                    min={it.min ?? 0}
                    max={it.max}
                    value={respostas[it.id] ?? ""}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isNaN(n)) return;
                      setRespostas((r) => ({ ...r, [it.id]: Math.min(it.max, Math.max(it.min ?? 0, n)) }));
                    }}
                    className="w-20 text-center"
                    aria-label={`Resposta para ${it.label}`}
                  />
                  <span className="w-12 text-right text-xs text-muted-foreground">
                    /{it.max}
                  </span>
                </div>
              ))}
            </div>

            <div className="md:col-span-2">
              <Label>Observação</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Escore parcial
                </p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums">{escore}</p>
                <p className="text-xs text-muted-foreground">faixa {def.min}–{def.max}</p>
              </div>
              <Badge className="text-sm font-bold">{classificacao}</Badge>
            </div>

            <Button className="md:col-span-2" disabled={!pacId || salvando} onClick={salvar}>
              {salvando ? "Salvando…" : "Salvar avaliação"}
            </Button>
          </CardContent>
        </Card>

        {pacId && hist.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico deste paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {hist.map((h) => (
                  <li key={h.id} className="flex items-center justify-between rounded border p-3 text-sm">
                    <span>
                      <Badge variant="outline" className="mr-2">{h.escala}</Badge>
                      {new Date(h.data_aplicacao).toLocaleString("pt-BR")}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums font-bold">{h.escore_total}</span>
                      <Badge variant="secondary">{h.classificacao}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
