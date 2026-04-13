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
import { Lock, UnlockKeyhole, AlertTriangle } from "lucide-react";
import { contencaoSchema } from "@/lib/schemas/clinica";

type Paciente = { id: string; nome: string; prontuario: string };
type Contencao = {
  id: string;
  paciente_id: string;
  paciente_nome: string;
  prontuario: string;
  tipo: string;
  motivo: string;
  inicio: string;
  fim: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function Contencao() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [ativas, setAtivas] = useState<Contencao[]>([]);
  const [pacId, setPacId] = useState("");
  const [tipo, setTipo] = useState<"fisica" | "quimica" | "ambiental">("fisica");
  const [motivo, setMotivo] = useState("");
  const [metodo, setMetodo] = useState("");
  const [crm, setCrm] = useState("");
  const [dose, setDose] = useState("");
  const [via, setVia] = useState<"oral" | "IM" | "IV" | "SC" | "sublingual" | "outra">("IM");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    db.from("pacientes")
      .select("id, nome, prontuario")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }: { data: Paciente[] | null }) => setPacientes(data ?? []));
    reload();
  }, []);

  async function reload() {
    const { data } = await db.from("v_contencoes_ativas").select("*").order("inicio", { ascending: false });
    setAtivas(data ?? []);
  }

  async function registrar() {
    if (!pacId || !user) return toast.error("Selecione paciente");
    const payload = {
      paciente_id: pacId,
      tipo,
      motivo,
      descricao_metodo: metodo,
      inicio: new Date().toISOString(),
      crm_prescritor: crm || null,
      dose: tipo === "quimica" ? dose : "",
      via: tipo === "quimica" ? via : undefined,
    };
    const parsed = contencaoSchema.safeParse(payload);
    if (!parsed.success) {
      return toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
    }
    try {
      setSalvando(true);
      const { error } = await db.from("contencoes").insert({
        ...parsed.data,
        executor_id: user.id,
        reavaliacoes: [],
      });
      if (error) throw error;
      toast.warning("Contenção registrada — reavaliar em 15 min", { duration: 8000 });
      setMotivo("");
      setMetodo("");
      setDose("");
      setCrm("");
      setPacId("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setSalvando(false);
    }
  }

  async function liberar(id: string) {
    const liberacao_motivo = prompt("Motivo da liberação:");
    if (!liberacao_motivo) return;
    const { error } = await db
      .from("contencoes")
      .update({ fim: new Date().toISOString(), liberacao_motivo })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contenção liberada");
    await reload();
  }

  async function reavaliar(c: Contencao) {
    const obs = prompt("Reavaliação (estado do paciente):");
    if (!obs) return;
    const { data: atual } = await db.from("contencoes").select("reavaliacoes").eq("id", c.id).single();
    const nova = [
      ...(atual?.reavaliacoes ?? []),
      { data: new Date().toISOString(), obs, avaliador_id: user?.id },
    ];
    const { error } = await db.from("contencoes").update({ reavaliacoes: nova }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Reavaliação registrada");
  }

  return (
    <AppLayout title="Contenção">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Contenção (física/química/ambiental)"
          subtitle="Registro obrigatório ANVISA/CFM. Reavaliar a cada 15–30 minutos."
          icon={Lock}
          variant="security"
        />

        <Card>
          <CardHeader>
            <CardTitle>Nova contenção</CardTitle>
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
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Física</SelectItem>
                  <SelectItem value="quimica">Química</SelectItem>
                  <SelectItem value="ambiental">Ambiental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Motivo clínico</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Hetero-agressividade, fuga, risco iminente…" />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição do método</Label>
              <Textarea value={metodo} onChange={(e) => setMetodo(e.target.value)} placeholder="Faixas de 5 pontos em maca, monitorização contínua…" />
            </div>
            <div>
              <Label>CRM do prescritor</Label>
              <Input value={crm} onChange={(e) => setCrm(e.target.value.toUpperCase())} placeholder="12345/SP" />
            </div>
            {tipo === "quimica" && (
              <>
                <div>
                  <Label>Dose</Label>
                  <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Ex: Haloperidol 5mg" />
                </div>
                <div>
                  <Label>Via</Label>
                  <Select value={via} onValueChange={(v) => setVia(v as typeof via)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["oral","sublingual","IM","IV","SC","outra"].map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button className="md:col-span-2" disabled={salvando || !pacId} onClick={registrar}>
              <AlertTriangle className="mr-2 h-4 w-4" aria-hidden /> Registrar contenção
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contenções ativas</CardTitle>
          </CardHeader>
          <CardContent>
            {ativas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma contenção ativa no momento.</p>
            ) : (
              <ul className="space-y-2">
                {ativas.map((c) => {
                  const dur = Math.round((Date.now() - new Date(c.inicio).getTime()) / 60000);
                  const alerta = dur >= 30;
                  return (
                    <li
                      key={c.id}
                      className={`flex flex-col gap-3 rounded border p-3 sm:flex-row sm:items-center sm:justify-between ${alerta ? "border-destructive/40 bg-destructive/5 clinical-alert-high" : ""}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase">{c.tipo}</Badge>
                          <span className="font-medium">{c.paciente_nome}</span>
                          <span className="text-xs text-muted-foreground">#{c.prontuario}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{c.motivo}</p>
                        <p className="mt-1 text-xs">
                          Início: {new Date(c.inicio).toLocaleString("pt-BR")}
                          <span className={`ml-2 font-bold ${alerta ? "text-destructive" : "text-muted-foreground"}`}>
                            {dur} min
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => reavaliar(c)}>Reavaliar</Button>
                        <Button size="sm" variant="destructive" onClick={() => liberar(c.id)}>
                          <UnlockKeyhole className="mr-1 h-3.5 w-3.5" /> Liberar
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
