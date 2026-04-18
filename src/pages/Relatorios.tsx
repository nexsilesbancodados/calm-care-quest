import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Download, FileDown, Pill, Package, TrendingUp, Clock, ArrowLeftRight, FileText, ShieldCheck, Activity, BarChart3, Users, AlertCircle, Boxes } from "lucide-react";
import { generatePdfReport, statusText, type ReportSection } from "@/lib/pdf/reportGenerator";
import { cn } from "@/lib/utils";
import { useUserProductivity } from "@/hooks/useAdvancedKpis";
import { RupturaTab } from "@/components/RupturaTab";
import type { Medicamento, Lote, Categoria, Movimentacao, TipoItem } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG, TIPO_ITEM_CONFIG } from "@/types/database";

const COLORS = [
  "hsl(205, 60%, 24%)",
  "hsl(205, 85%, 55%)",
  "hsl(152, 56%, 40%)",
  "hsl(40, 96%, 50%)",
  "hsl(4, 76%, 50%)",
  "hsl(239, 84%, 67%)",
  "hsl(215, 8%, 50%)",
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function downloadCSV(headers: string[], rows: any[][], filename: string) {
  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}




const Relatorios = () => {
  const { profile } = useAuth();
  const { data: productivityData = [] } = useUserProductivity(30);
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [venDays, setVenDays] = useState("60");
  const [hospitalNome, setHospitalNome] = useState("");

  // Psicotrópicos filter
  const [psicoMonth, setPsicoMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // CMM period filter (months)
  const [cmmPeriod, setCmmPeriod] = useState("3");

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: medsData }, { data: lotesData }, { data: catsData }, { data: movData }, { data: transData }, { data: configData }] =
        await Promise.all([
          supabase.from("medicamentos").select("*").eq("ativo", true),
          supabase.from("lotes").select("*").eq("ativo", true),
          supabase.from("categorias_medicamento").select("*"),
          supabase.from("movimentacoes").select("*, medicamentos(nome, concentracao)").order("created_at", { ascending: false }).limit(500),
          supabase.from("transferencias").select("*, medicamentos(nome, concentracao), clinica_destino:clinicas_parceiras!transferencias_clinica_destino_id_fkey(nome)").order("created_at", { ascending: false }).limit(200),
          supabase.from("configuracoes_hospital").select("nome").limit(1),
        ]);
      setCategorias((catsData as Categoria[]) || []);
      setMovements(movData || []);
      setTransfers(transData || []);
      if (configData && configData.length > 0) setHospitalNome(configData[0].nome);
      setMeds(
        (medsData || []).map((m: any) => ({
          ...m,
          lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
        }))
      );
      setLoading(false);
    };
    fetchAll();
  }, [profile?.filial_id]);

  const filteredMeds = catFilter === "all" ? meds : meds.filter((m) => m.categoria_id === catFilter);
  const totalUnits = filteredMeds.reduce((s, m) => s + getEstoqueTotal(m.lotes), 0);
  const userName = profile?.nome || "—";

  // Movimentações filtradas por período
  const filteredMov = movements.filter((m) => {
    const d = m.created_at.slice(0, 10);
    return d >= dateFrom && d <= dateTo;
  });

  // Transferências filtradas por período
  const filteredTrans = transfers.filter((t) => {
    const d = t.created_at.slice(0, 10);
    return d >= dateFrom && d <= dateTo;
  });

  // Medicamentos a vencer
  const now = new Date();
  const venDaysNum = parseInt(venDays) || 60;
  const expiring = meds.flatMap((m) =>
    m.lotes
      .filter((l) => {
        const diff = (new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= venDaysNum;
      })
      .map((l) => ({ med: m, lote: l, days: Math.ceil((new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) }))
  ).sort((a, b) => a.days - b.days);

  // Consumo por setor
  const consumoSetor = filteredMov
    .filter((m) => ["saida", "dispensacao"].includes(m.tipo))
    .reduce<Record<string, number>>((acc, m) => {
      const key = m.setor || m.paciente || "Não informado";
      acc[key] = (acc[key] || 0) + m.quantidade;
      return acc;
    }, {});
  const consumoSetorData = Object.entries(consumoSetor)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Stock status breakdown
  const stockStatus = [
    { name: "Normal", value: filteredMeds.filter((m) => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "normal").length, color: "hsl(152, 56%, 40%)" },
    { name: "Baixo", value: filteredMeds.filter((m) => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "baixo").length, color: "hsl(40, 96%, 50%)" },
    { name: "Crítico", value: filteredMeds.filter((m) => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "critico").length, color: "hsl(4, 76%, 50%)" },
    { name: "Esgotado", value: filteredMeds.filter((m) => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "esgotado").length, color: "hsl(215, 8%, 50%)" },
  ];

  const topStock = [...filteredMeds].map((m) => ({ name: m.nome.length > 20 ? m.nome.slice(0, 20) + "…" : m.nome, qty: getEstoqueTotal(m.lotes) })).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const totalValue = filteredMeds.reduce((s, m) => s + m.lotes.reduce((sl, l) => sl + l.quantidade_atual * l.preco_unitario, 0), 0);

  // === PSICOTRÓPICOS ===
  const controlledMeds = meds.filter(m => m.controlado);
  const psicoMonthStart = psicoMonth + "-01";
  const psicoMonthEnd = (() => {
    const [y, m] = psicoMonth.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${psicoMonth}-${String(last).padStart(2, "0")}`;
  })();

  const psicoData = useMemo(() => {
    return controlledMeds.flatMap(med =>
      med.lotes.map(lote => {
        const entradas = movements.filter(m =>
          m.medicamento_id === med.id && m.lote_id === lote.id && m.tipo === "entrada" &&
          m.created_at.slice(0, 10) >= psicoMonthStart && m.created_at.slice(0, 10) <= psicoMonthEnd
        ).reduce((s: number, m: any) => s + m.quantidade, 0);
        const saidas = movements.filter(m =>
          m.medicamento_id === med.id && m.lote_id === lote.id && ["saida", "dispensacao"].includes(m.tipo) &&
          m.created_at.slice(0, 10) >= psicoMonthStart && m.created_at.slice(0, 10) <= psicoMonthEnd
        ).reduce((s: number, m: any) => s + m.quantidade, 0);
        return {
          med,
          lote,
          entradas,
          saidas,
          saldo: lote.quantidade_atual,
        };
      })
    );
  }, [controlledMeds, movements, psicoMonthStart, psicoMonthEnd]);

  // === CMM POR MEDICAMENTO ===
  const cmmData = useMemo(() => {
    const months = parseInt(cmmPeriod) || 3;
    const periodAgo = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString();
    return meds.map(med => {
      const dispensacoes = movements.filter(m =>
        m.medicamento_id === med.id && ["saida", "dispensacao"].includes(m.tipo) && m.created_at >= periodAgo
      );
      const totalDisp = dispensacoes.reduce((s: number, m: any) => s + m.quantidade, 0);
      const cmmVal = Math.round(totalDisp / months);
      const estoqueAtual = getEstoqueTotal(med.lotes);
      const cobertura = cmmVal > 0 ? Math.round(estoqueAtual / (cmmVal / 30)) : estoqueAtual > 0 ? 999 : 0;
      return { med, cmm: cmmVal, estoque: estoqueAtual, cobertura };
    }).filter(d => d.cmm > 0 || d.estoque > 0).sort((a, b) => a.cobertura - b.cobertura);
  }, [meds, movements, cmmPeriod]);

  const getCoberturaStatus = (dias: number) => {
    if (dias >= 999) return { label: ">30d", cls: "bg-success/10 text-success border-success/20" };
    if (dias > 30) return { label: `${dias}d`, cls: "bg-success/10 text-success border-success/20" };
    if (dias >= 15) return { label: `${dias}d`, cls: "bg-warning/10 text-warning border-warning/20" };
    return { label: `${dias}d`, cls: "bg-destructive/10 text-destructive border-destructive/20" };
  };

  if (loading) return <AppLayout title="Relatórios"><Skeleton className="h-64 rounded-xl" /></AppLayout>;

  return (
    <AppLayout title="Relatórios & Análises" subtitle="Visão analítica completa">
      {/* Filtros globais */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Categoria</Label>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-[140px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-[140px]" />
        </div>
      </div>

      <Tabs defaultValue="estoque">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="estoque" className="text-xs gap-1"><Package className="h-3.5 w-3.5" /> Estoque Atual</TabsTrigger>
          <TabsTrigger value="movimentacoes" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Movimentações</TabsTrigger>
          <TabsTrigger value="vencimento" className="text-xs gap-1"><Clock className="h-3.5 w-3.5" /> Vencimento</TabsTrigger>
          <TabsTrigger value="consumo" className="text-xs gap-1"><TrendingUp className="h-3.5 w-3.5" /> Consumo por Setor</TabsTrigger>
          <TabsTrigger value="transferencias" className="text-xs gap-1"><ArrowLeftRight className="h-3.5 w-3.5" /> Transferências</TabsTrigger>
          <TabsTrigger value="psicotropicos" className="text-xs gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Psicotrópicos</TabsTrigger>
          <TabsTrigger value="cmm" className="text-xs gap-1"><Activity className="h-3.5 w-3.5" /> CMM</TabsTrigger>
          <TabsTrigger value="curvaABC" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" /> Curva ABC</TabsTrigger>
          <TabsTrigger value="produtividade" className="text-xs gap-1"><Users className="h-3.5 w-3.5" /> Produtividade</TabsTrigger>
          <TabsTrigger value="por-tipo" className="text-xs gap-1"><Boxes className="h-3.5 w-3.5" /> Por Tipo</TabsTrigger>
          <TabsTrigger value="ruptura" className="text-xs gap-1"><AlertCircle className="h-3.5 w-3.5" /> Previsão Ruptura</TabsTrigger>
        </TabsList>

        {/* TAB: Estoque Atual */}
        <TabsContent value="estoque" className="space-y-6">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              downloadCSV(
                ["Medicamento", "Concentração", "Estoque", "Mínimo", "Status", "Valor Unit.", "Valor Total"],
                filteredMeds.map((m) => {
                  const t = getEstoqueTotal(m.lotes);
                  const val = m.lotes.reduce((s, l) => s + l.quantidade_atual * l.preco_unitario, 0);
                  return [m.nome, m.concentracao, t, m.estoque_minimo, getEstoqueStatus(t, m.estoque_minimo), m.preco_unitario.toFixed(2), val.toFixed(2)];
                }),
                "estoque-atual"
              );
            }}><Download className="h-3.5 w-3.5" />CSV</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              generatePdfReport(
                { title: "Relatório de Estoque Atual", hospitalNome, userName },
                [
                  { type: "kpi", items: [
                    { label: "Itens", value: filteredMeds.length },
                    { label: "Unidades", value: totalUnits.toLocaleString("pt-BR") },
                    { label: "Valor Total", value: `R$ ${totalValue.toFixed(2)}` },
                  ]},
                  { type: "table", headers: ["Medicamento", "Concentração", "Estoque", "Mínimo", "Status", "Valor (R$)"],
                    rows: filteredMeds.map(m => {
                      const t = getEstoqueTotal(m.lotes);
                      return [m.nome, m.concentracao, t, m.estoque_minimo, statusText(getEstoqueStatus(t, m.estoque_minimo)), `R$ ${m.lotes.reduce((s, l) => s + l.quantidade_atual * l.preco_unitario, 0).toFixed(2)}`];
                    }),
                    columnStyles: { 2: { halign: "center" }, 3: { halign: "center" }, 5: { halign: "right" } },
                  },
                ]
              );
            }}><FileDown className="h-3.5 w-3.5" />PDF</Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "Itens", value: filteredMeds.length, icon: Pill },
              { label: "Unidades", value: totalUnits.toLocaleString("pt-BR"), icon: Package },
              { label: "Valor Total", value: `R$ ${totalValue.toFixed(2)}`, icon: TrendingUp },
            ].map((m, i) => (
              <div key={m.label} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex items-center gap-2 mb-1"><m.icon className="h-3.5 w-3.5 text-primary" /><p className="text-[11px] text-muted-foreground uppercase">{m.label}</p></div>
                <p className="text-xl font-bold">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="p-5 shadow-card">
              <h3 className="text-sm font-semibold mb-4">Maiores Estoques</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topStock} margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip /><Bar dataKey="qty" fill="hsl(205, 85%, 55%)" radius={[0, 4, 4, 0]} barSize={16} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5 shadow-card">
              <h3 className="text-sm font-semibold mb-4">Status do Estoque</h3>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={240}>
                  <PieChart><Pie data={stockStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" stroke="none">
                    {stockStatus.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">{stockStatus.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="ml-auto font-medium">{s.value}</span>
                  </div>
                ))}</div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Movimentações */}
        <TabsContent value="movimentacoes" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              downloadCSV(
                ["Data", "Tipo", "Medicamento", "Quantidade", "Paciente/Setor", "Observação"],
                filteredMov.map((m) => [formatDate(m.created_at), m.tipo, m.medicamentos?.nome || "—", m.quantidade, m.paciente || m.setor || "—", m.observacao || ""]),
                "movimentacoes"
              );
            }}><Download className="h-3.5 w-3.5" />CSV</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              generatePdfReport(
                { title: `Movimentações (${formatDate(dateFrom)} a ${formatDate(dateTo)})`, hospitalNome, userName, orientation: "landscape" },
                [
                  { type: "text", content: `${filteredMov.length} registros no período`, bold: true },
                  { type: "table", headers: ["Data", "Tipo", "Medicamento", "Qtd", "Paciente/Setor", "Observação"],
                    rows: filteredMov.map(m => [formatDate(m.created_at), m.tipo, m.medicamentos?.nome || "—", m.quantidade, m.paciente || m.setor || "—", m.observacao || ""]),
                    columnStyles: { 3: { halign: "center" } },
                  },
                ]
              );
            }}><FileDown className="h-3.5 w-3.5" />PDF</Button>
          </div>
          <Badge variant="outline" className="text-xs">{filteredMov.length} movimentações no período</Badge>
          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Data</TableHead>
                <TableHead className="text-xs font-semibold">Tipo</TableHead>
                <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
                <TableHead className="text-xs font-semibold">Paciente/Setor</TableHead>
                <TableHead className="text-xs font-semibold">Obs</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredMov.slice(0, 50).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{formatDate(m.created_at)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{m.tipo}</Badge></TableCell>
                    <TableCell className="text-sm font-medium">{m.medicamentos?.nome || "—"}</TableCell>
                    <TableCell className="text-center font-semibold">{m.quantidade}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.paciente || m.setor || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{m.observacao || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB: Vencimento */}
        <TabsContent value="vencimento" className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Label className="text-xs">Próximos</Label>
            <Select value={venDays} onValueChange={setVenDays}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">180 dias</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
                downloadCSV(
                  ["Medicamento", "Lote", "Validade", "Dias Restantes", "Quantidade"],
                  expiring.map((e) => [e.med.nome, e.lote.numero_lote, formatDate(e.lote.validade), e.days, e.lote.quantidade_atual]),
                  "vencimentos"
                );
              }}><Download className="h-3.5 w-3.5" />CSV</Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
                generatePdfReport(
                  { title: `Medicamentos a Vencer (${venDays} dias)`, hospitalNome, userName },
                  [
                    { type: "text", content: `${expiring.length} lotes a vencer`, bold: true },
                    { type: "table", headers: ["Medicamento", "Lote", "Validade", "Dias Restantes", "Quantidade"],
                      rows: expiring.map(e => [e.med.nome, e.lote.numero_lote, formatDate(e.lote.validade), e.days, e.lote.quantidade_atual]),
                      columnStyles: { 3: { halign: "center" }, 4: { halign: "center" } },
                    },
                  ]
                );
              }}><FileDown className="h-3.5 w-3.5" />PDF</Button>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">{expiring.length} lotes a vencer em {venDays} dias</Badge>
          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                <TableHead className="text-xs font-semibold">Lote</TableHead>
                <TableHead className="text-xs font-semibold">Validade</TableHead>
                <TableHead className="text-xs font-semibold text-center">Dias</TableHead>
                <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {expiring.map((e, i) => (
                  <TableRow key={`${e.lote.id}-${i}`}>
                    <TableCell className="text-sm font-medium">{e.med.nome}</TableCell>
                    <TableCell className="text-sm font-mono">{e.lote.numero_lote}</TableCell>
                    <TableCell className="text-sm">{formatDate(e.lote.validade)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px]", e.days <= 15 ? "bg-destructive/10 text-destructive" : e.days <= 30 ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>{e.days}d</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{e.lote.quantidade_atual}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB: Consumo por Setor */}
        <TabsContent value="consumo" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              downloadCSV(["Setor/Paciente", "Quantidade"], consumoSetorData.map((c) => [c.name, c.value]), "consumo-setor");
            }}><Download className="h-3.5 w-3.5" />CSV</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              generatePdfReport(
                { title: `Consumo por Setor/Paciente (${formatDate(dateFrom)} a ${formatDate(dateTo)})`, hospitalNome, userName },
                [{ type: "table", headers: ["Setor/Paciente", "Quantidade"], rows: consumoSetorData.map(c => [c.name, c.value]), columnStyles: { 1: { halign: "center" } } }]
              );
            }}><FileDown className="h-3.5 w-3.5" />PDF</Button>
          </div>
          <Card className="p-5 shadow-card">
            <h3 className="text-sm font-semibold mb-4">Top 10 — Consumo por Setor/Paciente</h3>
            {consumoSetorData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma saída no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={consumoSetorData} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip /><Bar dataKey="value" fill="hsl(205, 85%, 55%)" radius={[0, 4, 4, 0]} barSize={16} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </TabsContent>

        {/* TAB: Transferências */}
        <TabsContent value="transferencias" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              downloadCSV(
                ["Data", "Medicamento", "Destino", "Quantidade", "Status"],
                filteredTrans.map((t) => [formatDate(t.created_at), t.medicamentos?.nome || "—", t.clinica_destino?.nome || "—", t.quantidade, t.status]),
                "transferencias"
              );
            }}><Download className="h-3.5 w-3.5" />CSV</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              generatePdfReport(
                { title: `Transferências (${formatDate(dateFrom)} a ${formatDate(dateTo)})`, hospitalNome, userName },
                [
                  { type: "text", content: `${filteredTrans.length} transferências no período`, bold: true },
                  { type: "table", headers: ["Data", "Medicamento", "Destino", "Qtd", "Status"],
                    rows: filteredTrans.map(t => [formatDate(t.created_at), t.medicamentos?.nome || "—", t.clinica_destino?.nome || "—", t.quantidade, t.status]),
                    columnStyles: { 3: { halign: "center" } },
                  },
                ]
              );
            }}><FileDown className="h-3.5 w-3.5" />PDF</Button>
          </div>
          <Badge variant="outline" className="text-xs">{filteredTrans.length} transferências no período</Badge>
          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Data</TableHead>
                <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                <TableHead className="text-xs font-semibold">Destino</TableHead>
                <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredTrans.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{formatDate(t.created_at)}</TableCell>
                    <TableCell className="text-sm font-medium">{t.medicamentos?.nome || "—"}</TableCell>
                    <TableCell className="text-sm">{t.clinica_destino?.nome || "—"}</TableCell>
                    <TableCell className="text-center font-semibold">{t.quantidade}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB: Psicotrópicos */}
        <TabsContent value="psicotropicos" className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Label className="text-xs">Período</Label>
            <Input type="month" value={psicoMonth} onChange={e => setPsicoMonth(e.target.value)} className="h-8 text-xs w-[160px]" />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
                downloadCSV(
                  ["Medicamento", "Concentração", "Forma", "Lote", "Entradas", "Saídas", "Saldo", "Validade"],
                  psicoData.map(d => [d.med.nome, d.med.concentracao, d.med.forma_farmaceutica, d.lote.numero_lote, d.entradas, d.saidas, d.saldo, formatDate(d.lote.validade)]),
                  `psicotropicos-${psicoMonth}`
                );
              }}><Download className="h-3.5 w-3.5" />CSV</Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
                generatePdfReport(
                  { title: `Mapa de Psicotrópicos — ${psicoMonth}`, subtitle: "Portaria SVS/MS nº 344/98 — ANVISA", hospitalNome, userName, orientation: "landscape" },
                  [
                    { type: "kpi", items: [{ label: "Controlados", value: controlledMeds.length }, { label: "Lotes", value: psicoData.length }] },
                    { type: "table", headers: ["Medicamento", "Concentração", "Forma", "Lote", "Entradas", "Saídas", "Saldo", "Validade"],
                      rows: psicoData.map(d => [d.med.nome, d.med.concentracao, d.med.forma_farmaceutica, d.lote.numero_lote, d.entradas, d.saidas, d.saldo, formatDate(d.lote.validade)]),
                      columnStyles: { 4: { halign: "center" }, 5: { halign: "center" }, 6: { halign: "center" } },
                    },
                  ]
                );
              }}><FileDown className="h-3.5 w-3.5" />PDF</Button>
            </div>
          </div>

          <div className="rounded-lg border bg-info/5 border-info/20 p-3 text-xs text-info flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Relatório para apresentação à ANVISA — Mapa de Psicotrópicos (Portaria SVS/MS nº 344/98)
          </div>

          <Badge variant="outline" className="text-xs">{controlledMeds.length} medicamentos controlados • {psicoData.length} lotes</Badge>

          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                <TableHead className="text-xs font-semibold">Concentração</TableHead>
                <TableHead className="text-xs font-semibold">Forma</TableHead>
                <TableHead className="text-xs font-semibold">Lote</TableHead>
                <TableHead className="text-xs font-semibold text-center">Entradas</TableHead>
                <TableHead className="text-xs font-semibold text-center">Saídas</TableHead>
                <TableHead className="text-xs font-semibold text-center">Saldo</TableHead>
                <TableHead className="text-xs font-semibold">Validade</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {psicoData.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Nenhum medicamento controlado encontrado</TableCell></TableRow>
                ) : psicoData.map((d, i) => (
                  <TableRow key={`${d.lote.id}-${i}`}>
                    <TableCell className="text-sm font-medium">{d.med.nome}</TableCell>
                    <TableCell className="text-sm">{d.med.concentracao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.med.forma_farmaceutica}</TableCell>
                    <TableCell className="text-sm font-mono">{d.lote.numero_lote}</TableCell>
                    <TableCell className="text-center text-sm text-success font-medium">{d.entradas || "—"}</TableCell>
                    <TableCell className="text-center text-sm text-destructive font-medium">{d.saidas || "—"}</TableCell>
                    <TableCell className="text-center font-semibold">{d.saldo}</TableCell>
                    <TableCell className="text-sm">{formatDate(d.lote.validade)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB: CMM por Medicamento */}
        <TabsContent value="cmm" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-xs">Período</Label>
            <Select value={cmmPeriod} onValueChange={setCmmPeriod}>
              <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 mês</SelectItem>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              downloadCSV(
                ["Medicamento", "CMM (un/mês)", "Estoque Atual", "Cobertura (dias)", "Status"],
                cmmData.map(d => [d.med.nome, d.cmm, d.estoque, d.cobertura >= 999 ? ">30" : d.cobertura, d.cobertura > 30 ? "OK" : d.cobertura >= 15 ? "Atenção" : "Crítico"]),
                "cmm-medicamentos"
              );
            }}><Download className="h-3.5 w-3.5" />CSV</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              generatePdfReport(
                { title: "CMM por Medicamento", subtitle: `Consumo Médio Mensal — Média dos últimos ${cmmPeriod} meses`, hospitalNome, userName },
                [
                  { type: "kpi", items: [
                    { label: "Medicamentos", value: cmmData.length },
                    { label: "Cobertura <15d", value: cmmData.filter(d => d.cobertura < 15).length },
                    { label: "Cobertura 15-30d", value: cmmData.filter(d => d.cobertura >= 15 && d.cobertura <= 30).length },
                  ]},
                  { type: "table", headers: ["Medicamento", "CMM (un/mês)", "Estoque Atual", "Cobertura"],
                    rows: cmmData.map(d => [d.med.nome, d.cmm, d.estoque, d.cobertura >= 999 ? ">30d" : `${d.cobertura}d`]),
                    columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } },
                  },
                ]
              );
            }}><FileDown className="h-3.5 w-3.5" />PDF</Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-2">
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <p className="text-[11px] text-muted-foreground uppercase mb-1">Medicamentos</p>
              <p className="text-xl font-bold">{cmmData.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <p className="text-[11px] text-muted-foreground uppercase mb-1">Cobertura &lt;15d</p>
              <p className="text-xl font-bold text-destructive">{cmmData.filter(d => d.cobertura < 15).length}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-card">
              <p className="text-[11px] text-muted-foreground uppercase mb-1">Cobertura 15-30d</p>
              <p className="text-xl font-bold text-warning">{cmmData.filter(d => d.cobertura >= 15 && d.cobertura <= 30).length}</p>
            </div>
          </div>

          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                <TableHead className="text-xs font-semibold text-center">CMM (un/mês)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Estoque Atual</TableHead>
                <TableHead className="text-xs font-semibold text-center">Cobertura</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {cmmData.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">Nenhum dado de consumo nos últimos 3 meses</TableCell></TableRow>
                ) : cmmData.map(d => {
                  const cs = getCoberturaStatus(d.cobertura);
                  return (
                    <TableRow key={d.med.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{d.med.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{d.med.concentracao} • {d.med.forma_farmaceutica}</p>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{d.cmm}</TableCell>
                      <TableCell className="text-center">{d.estoque}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[10px]", cs.cls)}>{cs.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB: Curva ABC */}
        <TabsContent value="curvaABC" className="space-y-4">
          {(() => {
            const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
            const abcData = meds.map(med => {
              const consumo = movements.filter(m =>
                m.medicamento_id === med.id && ["saida", "dispensacao"].includes(m.tipo) && m.created_at >= threeMonthsAgo
              );
              const valorConsumo = consumo.reduce((s: number, m: any) => {
                const lote = med.lotes.find((l: any) => l.id === m.lote_id);
                return s + m.quantidade * (lote?.preco_unitario || med.preco_unitario || 0);
              }, 0);
              return { med, valorConsumo, qty: consumo.reduce((s: number, m: any) => s + m.quantidade, 0) };
            }).filter(d => d.valorConsumo > 0).sort((a, b) => b.valorConsumo - a.valorConsumo);

            const totalValor = abcData.reduce((s, d) => s + d.valorConsumo, 0);
            let acum = 0;
            const classified = abcData.map(d => {
              acum += d.valorConsumo;
              const pct = totalValor > 0 ? (acum / totalValor) * 100 : 100;
              const classe = pct <= 80 ? "A" : pct <= 95 ? "B" : "C";
              return { ...d, pctAcum: pct, classe };
            });

            const countA = classified.filter(d => d.classe === "A").length;
            const countB = classified.filter(d => d.classe === "B").length;
            const countC = classified.filter(d => d.classe === "C").length;

            const chartData = classified.slice(0, 15).map(d => ({
              name: d.med.nome.length > 18 ? d.med.nome.slice(0, 18) + "…" : d.med.nome,
              valor: Math.round(d.valorConsumo * 100) / 100,
              classe: d.classe,
            }));

            return (
              <>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
                    downloadCSV(
                      ["Medicamento", "Classe", "Valor Consumo (R$)", "Qtd Consumida", "% Acumulado"],
                      classified.map(d => [d.med.nome, d.classe, d.valorConsumo.toFixed(2), d.qty, d.pctAcum.toFixed(1) + "%"]),
                      "curva-abc"
                    );
                  }}><Download className="h-3.5 w-3.5" />CSV</Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
                    generatePdfReport(
                      { title: "Curva ABC — Análise de Consumo", subtitle: "Classificação baseada no valor de consumo dos últimos 90 dias", hospitalNome, userName },
                      [
                        { type: "kpi", items: [
                          { label: "Classe A (80%)", value: countA },
                          { label: "Classe B (15%)", value: countB },
                          { label: "Classe C (5%)", value: countC },
                          { label: "Valor Total", value: `R$ ${totalValor.toFixed(2)}` },
                        ]},
                        { type: "table", headers: ["Medicamento", "Classe", "Valor (R$)", "Qtd", "% Acum."],
                          rows: classified.map(d => [d.med.nome, d.classe, `R$ ${d.valorConsumo.toFixed(2)}`, d.qty, `${d.pctAcum.toFixed(1)}%`]),
                          columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "center" }, 4: { halign: "center" } },
                        },
                      ]
                    );
                  }}><FileDown className="h-3.5 w-3.5" />PDF</Button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="rounded-xl border bg-card p-4 shadow-card">
                    <p className="text-[11px] text-muted-foreground uppercase mb-1">Classe A (80%)</p>
                    <p className="text-xl font-bold text-destructive">{countA}</p>
                    <p className="text-[10px] text-muted-foreground">itens de alto valor</p>
                  </div>
                  <div className="rounded-xl border bg-card p-4 shadow-card">
                    <p className="text-[11px] text-muted-foreground uppercase mb-1">Classe B (15%)</p>
                    <p className="text-xl font-bold text-warning">{countB}</p>
                    <p className="text-[10px] text-muted-foreground">itens intermediários</p>
                  </div>
                  <div className="rounded-xl border bg-card p-4 shadow-card">
                    <p className="text-[11px] text-muted-foreground uppercase mb-1">Classe C (5%)</p>
                    <p className="text-xl font-bold text-success">{countC}</p>
                    <p className="text-[10px] text-muted-foreground">itens de baixo valor</p>
                  </div>
                </div>

                {chartData.length > 0 && (
                  <Card className="p-5 shadow-card">
                    <h3 className="text-sm font-semibold mb-4">Top 15 — Valor de Consumo (90 dias)</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={chartData} margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                        <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={16} name="Valor (R$)">
                          {chartData.map((d, i) => (
                            <Cell key={i} fill={d.classe === "A" ? "#ef4444" : d.classe === "B" ? "#f59e0b" : "#10b981"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                <Card className="shadow-card overflow-hidden">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">Medicamento</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Classe</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Valor (R$)</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Qtd</TableHead>
                      <TableHead className="text-xs font-semibold text-center">% Acum.</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {classified.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Nenhum consumo nos últimos 90 dias</TableCell></TableRow>
                      ) : classified.map(d => (
                        <TableRow key={d.med.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{d.med.nome}</p>
                            <p className="text-[11px] text-muted-foreground">{d.med.concentracao}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn("text-[10px] font-bold",
                              d.classe === "A" ? "bg-destructive/10 text-destructive border-destructive/20" :
                              d.classe === "B" ? "bg-warning/10 text-warning border-warning/20" :
                              "bg-success/10 text-success border-success/20"
                            )}>{d.classe}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">R$ {d.valorConsumo.toFixed(2)}</TableCell>
                          <TableCell className="text-center font-semibold">{d.qty}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{d.pctAcum.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* TAB: Produtividade por Usuário */}
        <TabsContent value="produtividade" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              downloadCSV(
                ["Usuário", "Total Mov.", "Dispensações", "Entradas", "Devoluções", "Unidades"],
                productivityData.map((d: any) => [d.usuario, d.total_movimentacoes, d.dispensacoes, d.entradas, d.devolucoes, d.total_unidades]),
                "produtividade-usuarios"
              );
            }}><Download className="h-3.5 w-3.5" />CSV</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              generatePdfReport(
                { title: "Produtividade por Usuário (30 dias)", hospitalNome, userName },
                [
                  { type: "text", content: `${productivityData.length} usuários ativos no período`, bold: true },
                  { type: "table", headers: ["Usuário", "Total Mov.", "Dispensações", "Entradas", "Devoluções", "Unidades"],
                    rows: productivityData.map((d: any) => [d.usuario, d.total_movimentacoes, d.dispensacoes, d.entradas, d.devolucoes, d.total_unidades]),
                    columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" } },
                  },
                ]
              );
            }}><FileDown className="h-3.5 w-3.5" />PDF</Button>
          </div>

          <Badge variant="outline" className="text-xs">{productivityData.length} usuários ativos (últimos 30 dias)</Badge>

          {productivityData.length > 0 && (
            <Card className="p-5 shadow-card">
              <h3 className="text-sm font-semibold mb-4">Movimentações por Usuário</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, productivityData.length * 40)}>
                <BarChart data={productivityData.slice(0, 15).map((d: any) => ({ name: d.usuario.length > 20 ? d.usuario.slice(0, 20) + "…" : d.usuario, total: d.total_movimentacoes }))} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(205, 85%, 55%)" radius={[0, 4, 4, 0]} barSize={16} name="Movimentações" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Usuário</TableHead>
                <TableHead className="text-xs font-semibold text-center">Total</TableHead>
                <TableHead className="text-xs font-semibold text-center">Dispensações</TableHead>
                <TableHead className="text-xs font-semibold text-center">Entradas</TableHead>
                <TableHead className="text-xs font-semibold text-center">Devoluções</TableHead>
                <TableHead className="text-xs font-semibold text-center">Unidades</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {productivityData.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Nenhuma movimentação no período</TableCell></TableRow>
                ) : productivityData.map((d: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{d.usuario}</TableCell>
                    <TableCell className="text-center font-semibold">{d.total_movimentacoes}</TableCell>
                    <TableCell className="text-center text-info">{d.dispensacoes}</TableCell>
                    <TableCell className="text-center text-success">{d.entradas}</TableCell>
                    <TableCell className="text-center">{d.devolucoes}</TableCell>
                    <TableCell className="text-center font-semibold">{d.total_unidades}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB: Por Tipo de Item */}
        <TabsContent value="por-tipo" className="space-y-4">
          {(() => {
            const tipos: TipoItem[] = ["medicamento", "material", "epi", "higiene"];
            // Consumo (saída/dispensação) por tipo no período
            const consumoPorTipo = tipos.map((t) => {
              const medsTipo = meds.filter((m) => ((m as any).tipo_item ?? "medicamento") === t);
              const medIds = new Set(medsTipo.map((m) => m.id));
              const movs = filteredMov.filter((m) => ["saida", "dispensacao"].includes(m.tipo) && medIds.has(m.medicamento_id));
              const unidades = movs.reduce((s, m) => s + m.quantidade, 0);
              const itens = medsTipo.length;
              const estoque = medsTipo.reduce((s, m) => s + getEstoqueTotal(m.lotes), 0);
              const valor = medsTipo.reduce((s, m) => s + m.lotes.reduce((sl, l) => sl + l.quantidade_atual * l.preco_unitario, 0), 0);
              return { tipo: t, ...TIPO_ITEM_CONFIG[t], itens, estoque, valor, consumo: unidades, movs: movs.length };
            });
            const totalGeral = consumoPorTipo.reduce((s, c) => s + c.consumo, 0);
            return (
              <>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
                    downloadCSV(
                      ["Tipo", "Itens cadastrados", "Estoque (un.)", "Valor (R$)", "Consumo período (un.)", "Movimentações"],
                      consumoPorTipo.map((c) => [c.label, c.itens, c.estoque, c.valor.toFixed(2), c.consumo, c.movs]),
                      "consumo-por-tipo"
                    );
                  }}><Download className="h-3.5 w-3.5" />CSV</Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {consumoPorTipo.map((c) => (
                    <Card key={c.tipo} className="p-4 shadow-card">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{c.emoji}</span>
                        <Badge variant="outline" className={cn("text-[10px]", c.className)}>{c.label}</Badge>
                      </div>
                      <p className="text-2xl font-bold tabular-nums">{c.consumo.toLocaleString("pt-BR")}</p>
                      <p className="text-[11px] text-muted-foreground">unidades consumidas</p>
                      <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <p className="text-muted-foreground">Itens</p>
                          <p className="font-semibold">{c.itens}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Estoque</p>
                          <p className="font-semibold">{c.estoque.toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="p-5 shadow-card">
                  <h3 className="text-sm font-semibold mb-4">Consumo por Tipo no Período ({totalGeral.toLocaleString("pt-BR")} un.)</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={consumoPorTipo.map((c) => ({ name: c.label, consumo: c.consumo, estoque: c.estoque }))} margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="consumo" fill="hsl(205, 85%, 55%)" radius={[4, 4, 0, 0]} barSize={40} name="Consumo (un.)" />
                      <Bar dataKey="estoque" fill="hsl(152, 56%, 40%)" radius={[4, 4, 0, 0]} barSize={40} name="Estoque atual (un.)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-5 shadow-card">
                  <h3 className="text-sm font-semibold mb-4">Distribuição de Itens Cadastrados</h3>
                  <div className="flex items-center">
                    <ResponsiveContainer width="50%" height={240}>
                      <PieChart>
                        <Pie data={consumoPorTipo.filter((c) => c.itens > 0).map((c) => ({ name: c.label, value: c.itens }))} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" stroke="none">
                          {consumoPorTipo.filter((c) => c.itens > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">{consumoPorTipo.map((c, i) => (
                      <div key={c.tipo} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{c.emoji} {c.label}</span>
                        <span className="ml-auto font-medium">{c.itens} itens</span>
                      </div>
                    ))}</div>
                  </div>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* TAB: Previsão de Ruptura */}
        <TabsContent value="ruptura" className="space-y-4">
          <RupturaTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Relatorios;
