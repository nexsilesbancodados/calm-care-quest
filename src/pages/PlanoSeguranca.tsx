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
import { HeartPulse, Plus, X } from "lucide-react";

type Paciente = { id: string; nome: string; prontuario: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function TagList({
  items, onAdd, onRemove, placeholder,
}: { items: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <div>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(""); } }
          }} />
        <Button size="sm" variant="outline" onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); } }}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              {it}
              <button onClick={() => onRemove(i)} className="rounded hover:bg-background/20" aria-label="Remover">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanoSeguranca() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacId, setPacId] = useState("");
  const [gatilhos, setGatilhos] = useState<string[]>([]);
  const [sinais, setSinais] = useState<string[]>([]);
  const [estrategias, setEstrategias] = useState<string[]>([]);
  const [contatoNome, setContatoNome] = useState("");
  const [contatoTel, setContatoTel] = useState("");
  const [contatos, setContatos] = useState<Array<{ nome: string; telefone: string; relacao: string }>>([]);
  const [acoes, setAcoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    db.from("pacientes").select("id, nome, prontuario").eq("ativo", true).order("nome")
      .then(({ data }: { data: Paciente[] | null }) => setPacientes(data ?? []));
  }, []);

  async function salvar() {
    if (!pacId || !user) return toast.error("Selecione paciente");
    try {
      setSalvando(true);
      const { error } = await db.from("planos_seguranca").insert({
        paciente_id: pacId,
        elaborador_id: user.id,
        gatilhos,
        sinais_alerta: sinais,
        estrategias_internas: estrategias,
        contatos_apoio: contatos,
        acoes_ambiente: acoes,
        ativo: true,
      });
      if (error) throw error;
      toast.success("Plano de segurança salvo");
      setGatilhos([]); setSinais([]); setEstrategias([]); setContatos([]); setAcoes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppLayout title="Plano de Segurança">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Plano de Segurança (Stanley-Brown)"
          subtitle="Indicado para pacientes com risco moderado/alto de suicídio identificado no C-SSRS."
          icon={HeartPulse}
          variant="clinical"
        />

        <Card>
          <CardHeader><CardTitle>Elaborar plano</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
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

            <div className="md:col-span-2">
              <Label>1. Gatilhos / situações de risco</Label>
              <TagList items={gatilhos}
                onAdd={(v) => setGatilhos([...gatilhos, v])}
                onRemove={(i) => setGatilhos(gatilhos.filter((_, j) => j !== i))}
                placeholder="Ex: conflito familiar, insônia…" />
            </div>
            <div className="md:col-span-2">
              <Label>2. Sinais de alerta precoces</Label>
              <TagList items={sinais}
                onAdd={(v) => setSinais([...sinais, v])}
                onRemove={(i) => setSinais(sinais.filter((_, j) => j !== i))}
                placeholder="Ex: isolamento, irritabilidade…" />
            </div>
            <div className="md:col-span-2">
              <Label>3. Estratégias de enfrentamento internas</Label>
              <TagList items={estrategias}
                onAdd={(v) => setEstrategias([...estrategias, v])}
                onRemove={(i) => setEstrategias(estrategias.filter((_, j) => j !== i))}
                placeholder="Ex: respiração, caminhada, música…" />
            </div>

            <div className="md:col-span-2 rounded border p-3">
              <p className="mb-2 text-sm font-semibold">4. Contatos de apoio</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="Nome" value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} />
                <Input placeholder="Telefone" value={contatoTel} onChange={(e) => setContatoTel(e.target.value)} />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!contatoNome.trim()) return;
                    setContatos([...contatos, { nome: contatoNome, telefone: contatoTel, relacao: "" }]);
                    setContatoNome(""); setContatoTel("");
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>
              {contatos.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {contatos.map((c, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span>{c.nome} — <span className="text-muted-foreground">{c.telefone}</span></span>
                      <Button variant="ghost" size="icon" onClick={() => setContatos(contatos.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="md:col-span-2">
              <Label>5. Ações sobre o ambiente (meios letais)</Label>
              <Textarea
                value={acoes}
                onChange={(e) => setAcoes(e.target.value)}
                placeholder="Retirar cordões, cintos, objetos cortantes. Restringir acesso a medicamentos…"
              />
            </div>

            <Button className="md:col-span-2" disabled={!pacId || salvando} onClick={salvar}>
              {salvando ? "Salvando…" : "Salvar plano"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
