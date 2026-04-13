import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type BmpoRow = {
  filial_id: string;
  medicamento_id: string;
  medicamento_nome: string;
  lista_controlada: string;
  dcb_codigo: string | null;
  mes_referencia: string;
  total_entradas: number;
  total_saidas: number;
  total_perdas: number;
  total_devolucoes: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function Bmpo() {
  const [rows, setRows] = useState<BmpoRow[]>([]);
  const [mes, setMes] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  async function load() {
    setLoading(true);
    const ini = `${mes}-01`;
    const { data } = await db
      .from("v_bmpo")
      .select("*")
      .gte("mes_referencia", ini)
      .order("medicamento_nome");
    setRows(data ?? []);
    setLoading(false);
  }

  function exportCsv() {
    const header =
      "medicamento,lista,dcb,mes,entradas,saidas,perdas,devolucoes\n";
    const body = rows
      .map(
        (r) =>
          `"${r.medicamento_nome}",${r.lista_controlada},${r.dcb_codigo ?? ""},${r.mes_referencia},${r.total_entradas},${r.total_saidas},${r.total_perdas},${r.total_devolucoes}`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bmpo_${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout title="BMPO — Controlados">
      <div className="page-enter space-y-6 p-4 md:p-8">
        <PageHeader
          title="BMPO — Balanço de Controlados (Portaria 344/98)"
          subtitle="Base para envio SNGPC/ANVISA. Conferir antes de submeter."
          icon={BarChart3}
          variant="analytics"
          actions={
            <>
              <input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm"
                aria-label="Mês de referência"
              />
              <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="mr-2 h-4 w-4" aria-hidden /> CSV
              </Button>
            </>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Movimentações consolidadas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma movimentação de controlados neste mês.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2">Medicamento</th>
                      <th>Lista</th>
                      <th>DCB</th>
                      <th className="text-right">Entradas</th>
                      <th className="text-right">Saídas</th>
                      <th className="text-right">Perdas</th>
                      <th className="text-right">Devol.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.medicamento_id}-${i}`} className="border-b">
                        <td className="py-2">{r.medicamento_nome}</td>
                        <td>
                          <Badge variant="outline">{r.lista_controlada}</Badge>
                        </td>
                        <td>{r.dcb_codigo ?? "—"}</td>
                        <td className="text-right">{r.total_entradas}</td>
                        <td className="text-right">{r.total_saidas}</td>
                        <td className="text-right text-destructive">
                          {r.total_perdas || ""}
                        </td>
                        <td className="text-right">{r.total_devolucoes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
