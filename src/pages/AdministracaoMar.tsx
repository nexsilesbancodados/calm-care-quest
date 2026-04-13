import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BarcodeIcon, CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type PrescricaoPendente = {
  id: string;
  item_id: string;
  paciente_id: string;
  paciente_nome: string;
  codigo_pulseira: string | null;
  medicamento_id: string;
  medicamento_nome: string;
  codigo_barras: string | null;
  dose: string;
  via: string;
  horario_previsto: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function AdministracaoMar() {
  const { user } = useAuth();
  const [pulseira, setPulseira] = useState("");
  const [barcodeMed, setBarcodeMed] = useState("");
  const [pendentes, setPendentes] = useState<PrescricaoPendente[]>([]);
  const [selecionada, setSelecionada] = useState<PrescricaoPendente | null>(null);
  const [doseAdm, setDoseAdm] = useState("");
  const [recusado, setRecusado] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [reacao, setReacao] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function buscarPaciente() {
    if (!pulseira.trim()) return;
    const { data: pacientes } = await db
      .from("pacientes")
      .select("id, nome")
      .eq("codigo_pulseira", pulseira.trim())
      .limit(1);
    const pac = pacientes?.[0];
    if (!pac) {
      toast.error("Pulseira não encontrada");
      setPendentes([]);
      return;
    }
    // Busca prescrições ativas do paciente
    const { data: presc } = await db
      .from("prescricoes")
      .select(
        "id, itens_prescricao(id, medicamento_id, posologia, medicamentos(nome, codigo_barras))",
      )
      .eq("paciente_id", pac.id)
      .eq("status", "ativa")
      .limit(20);

    const lista: PrescricaoPendente[] = [];
    for (const p of presc ?? []) {
      for (const it of p.itens_prescricao ?? []) {
        lista.push({
          id: p.id,
          item_id: it.id,
          paciente_id: pac.id,
          paciente_nome: pac.nome,
          codigo_pulseira: pulseira,
          medicamento_id: it.medicamento_id,
          medicamento_nome: it.medicamentos?.nome ?? "?",
          codigo_barras: it.medicamentos?.codigo_barras ?? null,
          dose: it.posologia,
          via: "oral",
          horario_previsto: new Date().toISOString(),
        });
      }
    }
    setPendentes(lista);
    if (lista.length === 0) toast.info("Paciente sem prescrições ativas");
  }

  function selecionar(p: PrescricaoPendente) {
    setSelecionada(p);
    setDoseAdm(p.dose);
    setBarcodeMed("");
    setRecusado(false);
    setMotivoRecusa("");
    setReacao("");
    setObs("");
  }

  const scanOk =
    !!selecionada?.codigo_barras && barcodeMed.trim() === selecionada.codigo_barras;

  async function registrar() {
    if (!selecionada || !user) return;
    if (!scanOk && !recusado) {
      return toast.error("Scan do medicamento não confere com a prescrição");
    }
    if (recusado && motivoRecusa.trim().length < 3) {
      return toast.error("Informe o motivo da recusa");
    }
    try {
      setSalvando(true);
      const { error } = await db.from("administracoes_mar").insert({
        prescricao_id: selecionada.id,
        item_prescricao_id: selecionada.item_id,
        paciente_id: selecionada.paciente_id,
        medicamento_id: selecionada.medicamento_id,
        dose_administrada: doseAdm,
        via: selecionada.via,
        horario_previsto: selecionada.horario_previsto,
        horario_administrado: new Date().toISOString(),
        enfermeiro_id: user.id,
        barcode_paciente_scan: !!selecionada.codigo_pulseira,
        barcode_medicamento_scan: scanOk,
        recusado,
        motivo_recusa: recusado ? motivoRecusa : null,
        reacao_adversa: reacao || null,
        observacao: obs,
      });
      if (error) throw error;
      toast.success(recusado ? "Recusa registrada" : "Administração registrada");
      setSelecionada(null);
      setPendentes((prev) =>
        prev.filter((p) => p.item_id !== selecionada.item_id),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppLayout title="Administração Beira-Leito">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Administração à Beira-Leito (MAR)"
          subtitle="Scan da pulseira do paciente e do código do medicamento antes de administrar."
          icon={ClipboardCheck}
          variant="clinical"
        />

        <Card>
          <CardHeader>
            <CardTitle>1. Identificação do paciente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <Label htmlFor="pul">Código da pulseira</Label>
              <Input
                id="pul"
                value={pulseira}
                onChange={(e) => setPulseira(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarPaciente()}
                placeholder="Escanear ou digitar"
                autoFocus
              />
            </div>
            <Button onClick={buscarPaciente}>
              <BarcodeIcon className="mr-2 h-4 w-4" aria-hidden /> Carregar prescrições
            </Button>
          </CardContent>
        </Card>

        {pendentes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>2. Prescrições pendentes — {pendentes[0].paciente_nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendentes.map((p) => (
                <button
                  key={p.item_id}
                  onClick={() => selecionar(p)}
                  className={`flex w-full items-center justify-between rounded border p-3 text-left hover:bg-accent ${
                    selecionada?.item_id === p.item_id ? "border-primary" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{p.medicamento_nome}</p>
                    <p className="text-xs text-muted-foreground">{p.dose}</p>
                  </div>
                  <Badge variant="outline">{p.via}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {selecionada && (
          <Card>
            <CardHeader>
              <CardTitle>3. Confirmação e scan do medicamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bm">Código de barras do medicamento</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="bm"
                    value={barcodeMed}
                    onChange={(e) => setBarcodeMed(e.target.value)}
                    placeholder="Escanear"
                  />
                  {scanOk ? (
                    <CheckCircle2 className="h-5 w-5 text-success" aria-label="Confere" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" aria-label="Não confere" />
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="dose">Dose administrada</Label>
                <Input id="dose" value={doseAdm} onChange={(e) => setDoseAdm(e.target.value)} />
              </div>
              <div className="flex items-center justify-between rounded border p-3">
                <Label htmlFor="rec">Recusado pelo paciente?</Label>
                <Switch id="rec" checked={recusado} onCheckedChange={setRecusado} />
              </div>
              {recusado && (
                <div>
                  <Label htmlFor="mot">Motivo da recusa</Label>
                  <Textarea
                    id="mot"
                    value={motivoRecusa}
                    onChange={(e) => setMotivoRecusa(e.target.value)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="ra">Reação adversa (opcional)</Label>
                <Input id="ra" value={reacao} onChange={(e) => setReacao(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="obs">Observação</Label>
                <Textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)} />
              </div>
              <Button className="w-full" disabled={salvando} onClick={registrar}>
                {salvando ? "Registrando…" : "Registrar administração"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
