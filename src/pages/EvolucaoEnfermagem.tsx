import { useEffect, useState } from "react";
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
import { Stethoscope } from "lucide-react";

type Paciente = { id: string; nome: string; prontuario: string };
type Evolucao = {
  id: string;
  data_ref: string;
  turno: string;
  exame_fisico: string;
  queixas: string;
  risco_suicida: string | null;
  risco_queda: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function EvolucaoEnfermagem() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacId, setPacId] = useState("");
  const [turno, setTurno] = useState<"M" | "T" | "N">("M");
  const [queixas, setQueixas] = useState("");
  const [exame, setExame] = useState("");
  const [pa, setPa] = useState("");
  const [fc, setFc] = useState("");
  const [fr, setFr] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [comportamento, setComportamento] = useState("");
  const [rs, setRs] = useState<"baixo" | "moderado" | "alto" | "">("");
  const [rq, setRq] = useState<"baixo" | "moderado" | "alto" | "">("");
  const [hist, setHist] = useState<Evolucao[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    db.from("pacientes").select("id, nome, prontuario").eq("ativo", true).order("nome")
      .then(({ data }: { data: Paciente[] | null }) => setPacientes(data ?? []));
  }, []);

  useEffect(() => {
    if (!pacId) return setHist([]);
    db.from("evolucoes_enfermagem")
      .select("id, data_ref, turno, exame_fisico, queixas, risco_suicida, risco_queda")
      .eq("paciente_id", pacId)
      .order("data_ref", { ascending: false })
      .limit(10)
      .then(({ data }: { data: Evolucao[] | null }) => setHist(data ?? []));
  }, [pacId, salvando]);

  async function salvar() {
    if (!pacId || !user) return toast.error("Selecione paciente");
    try {
      setSalvando(true);
      const { error } = await db.from("evolucoes_enfermagem").insert({
        paciente_id: pacId,
        enfermeiro_id: user.id,
        turno,
        data_ref: new Date().toISOString().slice(0, 10),
        exame_fisico: exame,
        queixas,
        comportamento,
        sinais_vitais: {
          pa: pa || undefined,
          fc: fc ? Number(fc) : undefined,
          fr: fr ? Number(fr) : undefined,
          temp: temp ? Number(temp) : undefined,
          spo2: spo2 ? Number(spo2) : undefined,
        },
        risco_suicida: rs || null,
        risco_queda: rq || null,
      });
      if (error) throw error;
      toast.success("Evolução registrada");
      setQueixas(""); setExame(""); setPa(""); setFc(""); setFr(""); setTemp(""); setSpo2("");
      setComportamento(""); setRs(""); setRq("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppLayout title="Evolução de Enfermagem">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Evolução de Enfermagem (SAE)"
          subtitle="Sistemática de Assistência de Enfermagem — registrar por turno."
          icon={Stethoscope}
          variant="clinical"
        />

        <Card>
          <CardHeader><CardTitle>Nova evolução</CardTitle></CardHeader>
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
              <Label>Turno</Label>
              <Select value={turno} onValueChange={(v) => setTurno(v as typeof turno)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Manhã</SelectItem>
                  <SelectItem value="T">Tarde</SelectItem>
                  <SelectItem value="N">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 grid gap-2 sm:grid-cols-5">
              <div><Label className="text-xs">PA</Label><Input value={pa} onChange={(e) => setPa(e.target.value)} placeholder="120x80" /></div>
              <div><Label className="text-xs">FC</Label><Input value={fc} onChange={(e) => setFc(e.target.value)} inputMode="numeric" /></div>
              <div><Label className="text-xs">FR</Label><Input value={fr} onChange={(e) => setFr(e.target.value)} inputMode="numeric" /></div>
              <div><Label className="text-xs">Tax °C</Label><Input value={temp} onChange={(e) => setTemp(e.target.value)} inputMode="decimal" /></div>
              <div><Label className="text-xs">SpO₂ %</Label><Input value={spo2} onChange={(e) => setSpo2(e.target.value)} inputMode="numeric" /></div>
            </div>

            <div className="md:col-span-2">
              <Label>Queixas</Label>
              <Textarea value={queixas} onChange={(e) => setQueixas(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Exame físico</Label>
              <Textarea value={exame} onChange={(e) => setExame(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Comportamento</Label>
              <Textarea value={comportamento} onChange={(e) => setComportamento(e.target.value)} />
            </div>

            <div>
              <Label>Risco suicida</Label>
              <Select value={rs} onValueChange={(v) => setRs(v as typeof rs)}>
                <SelectTrigger><SelectValue placeholder="Não avaliado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risco de queda</Label>
              <Select value={rq} onValueChange={(v) => setRq(v as typeof rq)}>
                <SelectTrigger><SelectValue placeholder="Não avaliado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="md:col-span-2" disabled={!pacId || salvando} onClick={salvar}>
              {salvando ? "Salvando…" : "Salvar evolução"}
            </Button>
          </CardContent>
        </Card>

        {pacId && hist.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Últimas evoluções</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {hist.map((h) => (
                  <li key={h.id} className="rounded border p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{h.turno}</Badge>
                      <span>{h.data_ref}</span>
                      {h.risco_suicida && <Badge variant="destructive">Risco: {h.risco_suicida}</Badge>}
                      {h.risco_queda && <Badge>Queda: {h.risco_queda}</Badge>}
                    </div>
                    {h.queixas && <p className="mt-1 text-sm">{h.queixas}</p>}
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
