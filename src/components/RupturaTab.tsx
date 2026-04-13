import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, AlertCircle, TrendingDown, Clock } from "lucide-react";

type Row = {
  medicamento_id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
  consumo_dia: number;
  dias_cobertura: number | null;
};

function statusFromDias(d: number | null): { label: string; className: string } {
  if (d === null) return { label: "Sem consumo", className: "bg-muted text-muted-foreground" };
  if (d <= 7) return { label: "Crítico", className: "bg-destructive/10 text-destructive border-destructive/30" };
  if (d <= 15) return { label: "Alerta", className: "bg-warning/10 text-warning border-warning/30" };
  if (d <= 30) return { label: "Atenção", className: "bg-info/10 text-info border-info/30" };
  return { label: "Ok", className: "bg-success/10 text-success border-success/30" };
}

export function RupturaTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as unknown as {
        from: (n: string) => { select: (s: string) => Promise<{ data: Row[] | null }> };
      })
        .from("v_previsao_ruptura")
        .select("*");
      setRows((data ?? []).sort((a, b) => {
        const da = a.dias_cobertura ?? Infinity;
        const db = b.dias_cobertura ?? Infinity;
        return da - db;
      }));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.nome.toLowerCase().includes(busca.toLowerCase())),
    [rows, busca],
  );

  const criticos = filtered.filter((r) => r.dias_cobertura !== null && r.dias_cobertura <= 7).length;
  const alertas = filtered.filter((r) => r.dias_cobertura !== null && r.dias_cobertura > 7 && r.dias_cobertura <= 15).length;

  function exportCsv() {
    const header = "medicamento,estoque_atual,estoque_minimo,consumo_dia,dias_cobertura\n";
    const body = filtered
      .map((r) => `"${r.nome}",${r.estoque_atual},${r.estoque_minimo},${r.consumo_dia.toFixed(2)},${r.dias_cobertura?.toFixed(1) ?? ""}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "previsao-ruptura.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 text-destructive" /> Críticos ≤7d
          </div>
          <p className="mt-1 text-2xl font-bold text-destructive">{criticos}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-warning" /> Alertas ≤15d
          </div>
          <p className="mt-1 text-2xl font-bold text-warning">{alertas}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5 text-primary" /> Total monitorados
          </div>
          <p className="mt-1 text-2xl font-bold">{filtered.length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar medicamento…"
            className="h-9 pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="mr-1 h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicamento</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Consumo/dia</TableHead>
              <TableHead className="text-right">Dias cobertura</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Sem dados — aplique a migration `v_previsao_ruptura` no Supabase.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const st = statusFromDias(r.dias_cobertura);
                return (
                  <TableRow key={r.medicamento_id}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.estoque_atual}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{r.estoque_minimo}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.consumo_dia.toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {r.dias_cobertura === null ? "—" : `${r.dias_cobertura.toFixed(1)}d`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${st.className} text-[10px]`}>
                        {st.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
