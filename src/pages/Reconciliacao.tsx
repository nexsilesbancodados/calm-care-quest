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
import { GitCompareArrows, Plus, X } from "lucide-react";

type Paciente = { id: string; nome: string; prontuario: string };
type MedItem = { nome: string; dose: string; via: string; freq: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function MedList({
  items, onChange, label,
}: { items: MedItem[]; onChange: (v: MedItem[]) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      {items.map((m, i) => (
        <div key={i} className="grid grid-cols-12 gap-1">
          <Input className="col-span-4" placeholder="Medicamento" value={m.nome}
            onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} />
          <Input className="col-span-2" placeholder="Dose" value={m.dose}
            onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, dose: e.target.value } : x))} />
          <Input className="col-span-2" placeholder="Via" value={m.via}
            onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, via: e.target.value } : x))} />
          <Input className="col-span-3" placeholder="Frequência" value={m.freq}
            onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, freq: e.target.value } : x))} />
          <Button className="col-span-1" variant="ghost" size="icon"
            onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm"
        onClick={() => onChange([...items, { nome: "", dose: "", via: "oral", freq: "" }])}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
      </Button>
    </div>
  );
}

export default function Reconciliacao() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacId, setPacId] = useState("");
  const [momento, setMomento] = useState<"admissao" | "transferencia" | "alta">("admissao");
  const [previos, setPrevios] = useState<MedItem[]>([]);
  const [atuais, setAtuais] = useState<MedItem[]>([]);
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    db.from("pacientes").select("id, nome, prontuario").eq("ativo", true).order("nome")
      .then(({ data }: { data: Paciente[] | null }) => setPacientes(data ?? []));
  }, []);

  // Detecta discrepâncias simples (omissão/inclusão) por nome case-insensitive
  const discrepancias = (() => {
    const norm = (s: string) => s.trim().toLowerCase();
    const pSet = new Set(previos.map((m) => norm(m.nome)).filter(Boolean));
    const aSet = new Set(atuais.map((m) => norm(m.nome)).filter(Boolean));
    const omissoes = [...pSet].filter((n) => !aSet.has(n));
    const inclusoes = [...aSet].filter((n) => !pSet.has(n));
    return { omissoes, inclusoes };
  })();

  async function salvar() {
    if (!pacId || !user) return toast.error("Selecione paciente");
    try {
      setSalvando(true);
      const { error } = await db.from("reconciliacoes").insert({
        paciente_id: pacId,
        momento,
        responsavel_id: user.id,
        medicamentos_previos: previos,
        medicamentos_atuais: atuais,
        discrepancias: [
          ...discrepancias.omissoes.map((item) => ({ tipo: "omissao", item })),
          ...discrepancias.inclusoes.map((item) => ({ tipo: "inclusao", item })),
        ],
        conciliado: discrepancias.omissoes.length === 0 && discrepancias.inclusoes.length === 0,
        observacao: obs,
      });
      if (error) throw error;
      toast.success("Reconciliação registrada");
      setPrevios([]); setAtuais([]); setObs("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppLayout title="Reconciliação Medicamentosa">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Reconciliação Medicamentosa"
          subtitle="JCI IPSG.3 — comparar lista prévia vs. atual em admissão/transferência/alta."
          icon={GitCompareArrows}
          variant="analytics"
        />

        <Card>
          <CardHeader><CardTitle>Nova reconciliação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                <Label>Momento</Label>
                <Select value={momento} onValueChange={(v) => setMomento(v as typeof momento)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admissao">Admissão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <MedList items={previos} onChange={setPrevios} label="Medicamentos prévios (domicílio/setor anterior)" />
            <MedList items={atuais} onChange={setAtuais} label="Medicamentos atuais (prescrição deste setor)" />

            {(discrepancias.omissoes.length > 0 || discrepancias.inclusoes.length > 0) && (
              <div className="rounded border border-warning/40 bg-warning/5 p-3 text-xs">
                <p className="mb-1 font-semibold text-warning">Discrepâncias detectadas:</p>
                {discrepancias.omissoes.length > 0 && (
                  <p>Omissões: {discrepancias.omissoes.map((i) => (
                    <Badge key={i} variant="outline" className="ml-1">{i}</Badge>
                  ))}</p>
                )}
                {discrepancias.inclusoes.length > 0 && (
                  <p className="mt-1">Inclusões: {discrepancias.inclusoes.map((i) => (
                    <Badge key={i} variant="outline" className="ml-1">{i}</Badge>
                  ))}</p>
                )}
              </div>
            )}

            <div>
              <Label>Observação</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>

            <Button disabled={!pacId || salvando} onClick={salvar} className="w-full">
              {salvando ? "Salvando…" : "Salvar reconciliação"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
