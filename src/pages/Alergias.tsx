import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { toastWithUndo } from "@/lib/ui/toastWithUndo";

type Paciente = { id: string; nome: string; prontuario: string };
type Alergia = {
  id: string;
  tipo: string;
  agente: string;
  principio_ativo: string | null;
  severidade: string;
  reacao: string;
};

const SEVERIDADES: Record<string, string> = {
  leve: "bg-success/10 text-success",
  moderada: "bg-warning/10 text-warning",
  grave: "bg-destructive/10 text-destructive",
  anafilatica: "bg-destructive text-destructive-foreground",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function Alergias() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacId, setPacId] = useState("");
  const [lista, setLista] = useState<Alergia[]>([]);
  const [tipo, setTipo] = useState<"medicamento" | "alimento" | "latex" | "outro">("medicamento");
  const [agente, setAgente] = useState("");
  const [principio, setPrincipio] = useState("");
  const [sev, setSev] = useState<"leve" | "moderada" | "grave" | "anafilatica">("moderada");
  const [reacao, setReacao] = useState("");

  useEffect(() => {
    db.from("pacientes")
      .select("id, nome, prontuario")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }: { data: Paciente[] | null }) => setPacientes(data ?? []));
  }, []);

  useEffect(() => {
    if (!pacId) return setLista([]);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacId]);

  async function reload() {
    const { data } = await db
      .from("alergias_paciente")
      .select("*")
      .eq("paciente_id", pacId);
    setLista(data ?? []);
  }

  async function adicionar() {
    if (!pacId || !agente || !user) return toast.error("Preencha paciente e agente");
    const { error } = await db.from("alergias_paciente").insert({
      paciente_id: pacId,
      tipo,
      agente,
      principio_ativo: principio || null,
      severidade: sev,
      reacao,
      registrado_por: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Alergia registrada");
    setAgente("");
    setPrincipio("");
    setReacao("");
    void reload();
  }

  function remover(id: string) {
    const removida = lista.find((a) => a.id === id);
    // Remove otimisticamente da UI; commit real acontece depois de 5s
    setLista((prev) => prev.filter((a) => a.id !== id));
    toastWithUndo({
      message: `Alergia "${removida?.agente ?? ""}" será removida`,
      commit: async () => {
        const { error } = await db.from("alergias_paciente").delete().eq("id", id);
        if (error) throw new Error(error.message);
        toast.success("Alergia removida");
      },
      onUndo: () => {
        if (removida) setLista((prev) => [...prev, removida]);
      },
    });
  }

  return (
    <AppLayout title="Alergias">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Alergias e Contraindicações"
          subtitle="Registros estruturados para bloqueio automático na prescrição."
          icon={AlertTriangle}
          variant="security"
        />

        <Card>
          <CardHeader>
            <CardTitle>Nova alergia</CardTitle>
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
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medicamento">Medicamento</SelectItem>
                  <SelectItem value="alimento">Alimento</SelectItem>
                  <SelectItem value="latex">Látex</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Agente</Label>
              <Input value={agente} onChange={(e) => setAgente(e.target.value)} />
            </div>
            <div>
              <Label>Princípio ativo (se medicamento)</Label>
              <Input
                value={principio}
                onChange={(e) => setPrincipio(e.target.value.toLowerCase())}
              />
            </div>
            <div>
              <Label>Severidade</Label>
              <Select value={sev} onValueChange={(v) => setSev(v as typeof sev)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderada">Moderada</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                  <SelectItem value="anafilatica">Anafilática</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reação</Label>
              <Input value={reacao} onChange={(e) => setReacao(e.target.value)} />
            </div>
            <Button className="md:col-span-2" onClick={adicionar}>
              <AlertTriangle className="mr-2 h-4 w-4" aria-hidden /> Adicionar
            </Button>
          </CardContent>
        </Card>

        {pacId && (
          <Card>
            <CardHeader>
              <CardTitle>Registradas</CardTitle>
            </CardHeader>
            <CardContent>
              {lista.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem alergias registradas.</p>
              ) : (
                <ul className="space-y-2">
                  {lista.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded border p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={SEVERIDADES[a.severidade]}>{a.severidade}</Badge>
                          <span className="font-medium">{a.agente}</span>
                          <span className="text-xs text-muted-foreground">({a.tipo})</span>
                        </div>
                        {a.reacao && (
                          <p className="mt-1 text-xs text-muted-foreground">→ {a.reacao}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remover(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
