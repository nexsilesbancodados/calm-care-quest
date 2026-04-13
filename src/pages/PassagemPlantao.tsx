import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileDown, ClipboardCopy, Printer, Briefcase } from "lucide-react";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Turno = { nome: string; inicio: Date; fim: Date };

function turnoAtual(): Turno {
  const now = new Date();
  const h = now.getHours();
  const base = new Date(now);
  base.setMinutes(0, 0, 0);
  if (h >= 7 && h < 13) {
    base.setHours(7);
    const fim = new Date(base);
    fim.setHours(13);
    return { nome: "Manhã", inicio: base, fim };
  }
  if (h >= 13 && h < 19) {
    base.setHours(13);
    const fim = new Date(base);
    fim.setHours(19);
    return { nome: "Tarde", inicio: base, fim };
  }
  // Noite (19h–7h do dia seguinte)
  base.setHours(19);
  if (h < 7) base.setDate(base.getDate() - 1);
  const fim = new Date(base);
  fim.setDate(fim.getDate() + 1);
  fim.setHours(7);
  return { nome: "Noite", inicio: base, fim };
}

export default function PassagemPlantao() {
  const { user, profile } = useAuth();
  const [turno, setTurno] = useState<Turno>(() => turnoAtual());
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<{
    dispensacoes: number;
    admMar: number;
    recusas: number;
    cssrsAlto: number;
    contencoesAtivas: number;
    contencoesAbertas: number;
    evolucoes: number;
  }>({ dispensacoes: 0, admMar: 0, recusas: 0, cssrsAlto: 0, contencoesAtivas: 0, contencoesAbertas: 0, evolucoes: 0 });
  const [intercorrencias, setIntercorrencias] = useState<string[]>([]);
  const [pacientesCriticos, setPacientesCriticos] = useState<Array<{ nome: string; motivo: string }>>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const inicioISO = turno.inicio.toISOString();
      const fimISO = turno.fim.toISOString();

      const [disp, mar, cssrs, cont, ev] = await Promise.all([
        db.from("movimentacoes").select("id", { count: "exact", head: true })
          .eq("tipo", "dispensacao").eq("usuario_id", user?.id)
          .gte("created_at", inicioISO).lte("created_at", fimISO),
        db.from("administracoes_mar").select("id, recusado", { count: "exact" })
          .eq("enfermeiro_id", user?.id)
          .gte("horario_administrado", inicioISO).lte("horario_administrado", fimISO),
        db.from("avaliacoes_cssrs").select("id, risco, paciente_id, pacientes(nome)")
          .gte("data_avaliacao", inicioISO).lte("data_avaliacao", fimISO),
        db.from("contencoes").select("id, fim, paciente_id, motivo, pacientes(nome)")
          .gte("inicio", inicioISO),
        db.from("evolucoes_enfermagem").select("id, intercorrencias")
          .eq("enfermeiro_id", user?.id)
          .gte("created_at", inicioISO).lte("created_at", fimISO),
      ]);

      const altos = (cssrs.data ?? []).filter((r: { risco: string }) => r.risco === "alto");
      const abertas = (cont.data ?? []).filter((r: { fim: string | null }) => !r.fim);
      const intercList = (ev.data ?? []).map((e: { intercorrencias: string }) => e.intercorrencias).filter(Boolean);

      setResumo({
        dispensacoes: disp.count ?? 0,
        admMar: mar.count ?? 0,
        recusas: (mar.data ?? []).filter((r: { recusado: boolean }) => r.recusado).length,
        cssrsAlto: altos.length,
        contencoesAtivas: cont.data?.length ?? 0,
        contencoesAbertas: abertas.length,
        evolucoes: ev.data?.length ?? 0,
      });
      setIntercorrencias(intercList);
      setPacientesCriticos([
        ...altos.map((a: { pacientes?: { nome?: string } }) => ({ nome: a.pacientes?.nome ?? "—", motivo: "Risco suicida ALTO (C-SSRS)" })),
        ...abertas.map((c: { pacientes?: { nome?: string }; motivo: string }) => ({ nome: c.pacientes?.nome ?? "—", motivo: `Em contenção: ${c.motivo}` })),
      ]);
      setLoading(false);
    })();
  }, [turno, user?.id]);

  const textoPlano = useMemo(() => {
    const linhas = [
      `PASSAGEM DE PLANTÃO — ${turno.nome}`,
      `Profissional: ${profile?.nome ?? user?.email ?? "—"}`,
      `Período: ${turno.inicio.toLocaleString("pt-BR")} → ${turno.fim.toLocaleString("pt-BR")}`,
      "",
      "RESUMO:",
      `· Dispensações: ${resumo.dispensacoes}`,
      `· Administrações MAR: ${resumo.admMar} (recusas: ${resumo.recusas})`,
      `· Evoluções de enfermagem: ${resumo.evolucoes}`,
      `· C-SSRS risco ALTO: ${resumo.cssrsAlto}`,
      `· Contenções no período: ${resumo.contencoesAtivas} (${resumo.contencoesAbertas} ainda abertas)`,
      "",
      "PACIENTES EM DESTAQUE:",
      ...(pacientesCriticos.length === 0
        ? ["· Nenhum"]
        : pacientesCriticos.map((p) => `· ${p.nome} — ${p.motivo}`)),
      "",
      "INTERCORRÊNCIAS REGISTRADAS:",
      ...(intercorrencias.length === 0
        ? ["· Sem intercorrências registradas"]
        : intercorrencias.map((i, idx) => `${idx + 1}. ${i}`)),
    ];
    return linhas.join("\n");
  }, [turno, profile, user, resumo, pacientesCriticos, intercorrencias]);

  function copiar() {
    navigator.clipboard.writeText(textoPlano).then(() => toast.success("Copiado"));
  }

  function baixarTxt() {
    const blob = new Blob([textoPlano], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `passagem-plantao-${turno.inicio.toISOString().slice(0, 10)}-${turno.nome}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function imprimir() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap">${textoPlano}</pre>`);
    w.document.close();
    w.print();
  }

  return (
    <AppLayout title="Passagem de Plantão">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="Passagem de Plantão"
          subtitle={`Turno ${turno.nome} · ${turno.inicio.toLocaleDateString("pt-BR")} ${turno.inicio.getHours()}h–${turno.fim.getHours()}h`}
          icon={Briefcase}
          variant="default"
          actions={
            <>
              <Button size="sm" variant="outline" onClick={copiar}>
                <ClipboardCopy className="mr-1 h-3.5 w-3.5" /> Copiar
              </Button>
              <Button size="sm" variant="outline" onClick={baixarTxt}>
                <FileDown className="mr-1 h-3.5 w-3.5" /> TXT
              </Button>
              <Button size="sm" onClick={imprimir}>
                <Printer className="mr-1 h-3.5 w-3.5" /> Imprimir
              </Button>
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Dispensações", value: resumo.dispensacoes, tone: "text-info" },
            { label: "Administrações", value: resumo.admMar, tone: "text-success" },
            { label: "Recusas", value: resumo.recusas, tone: "text-warning" },
            { label: "Evoluções", value: resumo.evolucoes, tone: "text-primary" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border bg-card p-4 shadow-card">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</p>
              <p className={`mt-1 text-3xl font-extrabold tabular-nums ${c.tone}`}>
                {loading ? "…" : c.value}
              </p>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Pacientes em destaque</CardTitle></CardHeader>
          <CardContent>
            {pacientesCriticos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum paciente com sinal de alerta no período.</p>
            ) : (
              <ul className="space-y-2">
                {pacientesCriticos.map((p, i) => (
                  <li key={i} className="flex items-center justify-between rounded border p-3">
                    <span className="font-medium">{p.nome}</span>
                    <Badge variant="destructive" className="text-[10px]">{p.motivo}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Texto consolidado</CardTitle></CardHeader>
          <CardContent>
            <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap rounded border bg-muted/30 p-4 font-mono text-xs">
              {textoPlano}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
