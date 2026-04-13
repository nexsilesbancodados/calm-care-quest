import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
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
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Paciente = { id: string; nome: string; prontuario: string };
type Consent = {
  id: string;
  finalidade: string;
  base_legal: string;
  concedido: boolean;
  concedido_por: string;
  concedido_em: string;
  revogado_em: string | null;
};

const FINALIDADES = [
  "tratamento_medico",
  "dispensacao_medicamento",
  "pesquisa_cientifica",
  "faturamento",
  "auditoria_regulatoria",
  "compartilhamento_parceiro",
];
const BASES = ["consentimento", "tutela_saude", "obrigacao_legal", "politica_publica"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function Consentimento() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacId, setPacId] = useState("");
  const [finalidade, setFinalidade] = useState("tratamento_medico");
  const [baseLegal, setBaseLegal] = useState("tutela_saude");
  const [concedidoPor, setConcedidoPor] = useState("");
  const [obs, setObs] = useState("");
  const [lista, setLista] = useState<Consent[]>([]);

  useEffect(() => {
    db.from("pacientes")
      .select("id, nome, prontuario")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }: { data: Paciente[] | null }) => setPacientes(data ?? []));
  }, []);

  useEffect(() => {
    if (!pacId) return setLista([]);
    db.from("consentimentos_lgpd")
      .select("*")
      .eq("paciente_id", pacId)
      .order("concedido_em", { ascending: false })
      .then(({ data }: { data: Consent[] | null }) => setLista(data ?? []));
  }, [pacId]);

  async function conceder() {
    if (!pacId) return toast.error("Selecione paciente");
    if (concedidoPor.trim().length < 3) return toast.error("Informe quem concedeu");
    const { error } = await db.from("consentimentos_lgpd").insert({
      paciente_id: pacId,
      finalidade,
      base_legal: baseLegal,
      concedido: true,
      concedido_por: concedidoPor,
      observacao: obs,
    });
    if (error) return toast.error(error.message);
    toast.success("Consentimento registrado");
    setObs("");
  }

  async function revogar(id: string) {
    const { error } = await db
      .from("consentimentos_lgpd")
      .update({ revogado_em: new Date().toISOString(), concedido: false })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Consentimento revogado");
    const { data } = await db
      .from("consentimentos_lgpd")
      .select("*")
      .eq("paciente_id", pacId)
      .order("concedido_em", { ascending: false });
    setLista(data ?? []);
  }

  return (
    <AppLayout title="Consentimento LGPD">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Consentimento LGPD"
          subtitle="Registro de base legal e consentimento para tratamento de dados sensíveis (Art. 11 LGPD)."
          icon={ShieldCheck}
          variant="security"
        />

        <Card>
          <CardHeader>
            <CardTitle>Novo consentimento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Paciente</Label>
              <Select value={pacId} onValueChange={setPacId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
            <div>
              <Label>Finalidade</Label>
              <Select value={finalidade} onValueChange={setFinalidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINALIDADES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base legal</Label>
              <Select value={baseLegal} onValueChange={setBaseLegal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BASES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Concedido por (nome)</Label>
              <Input
                value={concedidoPor}
                onChange={(e) => setConcedidoPor(e.target.value)}
                placeholder="Paciente ou responsável legal"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Observação</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <Button className="md:col-span-2" onClick={conceder}>
              <Shield className="mr-2 h-4 w-4" aria-hidden /> Registrar consentimento
            </Button>
          </CardContent>
        </Card>

        {pacId && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {lista.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum registro.</p>
              ) : (
                <ul className="space-y-2">
                  {lista.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded border p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={c.concedido ? "default" : "destructive"}>
                            {c.concedido ? "Ativo" : "Revogado"}
                          </Badge>
                          <span className="text-sm font-medium">
                            {c.finalidade.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {c.base_legal} · {new Date(c.concedido_em).toLocaleDateString("pt-BR")}
                          {c.revogado_em &&
                            ` · revogado ${new Date(c.revogado_em).toLocaleDateString("pt-BR")}`}
                        </span>
                      </div>
                      {c.concedido && !c.revogado_em && (
                        <Button variant="outline" size="sm" onClick={() => revogar(c.id)}>
                          <ShieldAlert className="mr-2 h-4 w-4" aria-hidden /> Revogar
                        </Button>
                      )}
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
