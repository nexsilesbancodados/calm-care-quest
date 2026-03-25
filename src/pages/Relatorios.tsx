import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { Download, Printer, Filter, Pill, Package, TrendingUp, Calendar, Clock, ArrowLeftRight, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Medicamento, Lote, Categoria, Movimentacao } from "@/types/database";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG } from "@/types/database";

const COLORS = ["#1e3a5f", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#6b7280"];

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

function printReport(title: string, content: string) {
  const pw = window.open("", "_blank");
  if (!pw) return;
  pw.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
    h1{font-size:18px;color:#1e3a5f;margin-bottom:4px}
    h2{font-size:11px;color:#666;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}
    th{background:#f5f5f5;font-weight:600}
    .badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600}
    .green{background:#dcfce7;color:#16a34a}.yellow{background:#fef3c7;color:#d97706}
    .red{background:#fee2e2;color:#dc2626}.gray{background:#f3f4f6;color:#6b7280}
    @media print{@page{margin:12mm}}</style></head>
    <body><h1>PsiRumoCerto — ${title}</h1><h2>Gerado em: ${new Date().toLocaleString("pt-BR")}</h2>${content}
    <script>window.onload=function(){window.print()}<\/script></body></html>`);
  pw.document.close();
}

const Relatorios = () => {
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [venDays, setVenDays] = useState("60");

  useEffect(() => {
    const fetch = async () => {
      const [{ data: medsData }, { data: lotesData }, { data: catsData }, { data: movData }, { data: transData }] =
        await Promise.all([
          supabase.from("medicamentos").select("*").eq("ativo", true),
          supabase.from("lotes").select("*").eq("ativo", true),
          supabase.from("categorias_medicamento").select("*"),
          supabase.from("movimentacoes").select("*, medicamentos(nome, concentracao)").order("created_at", { ascending: false }).limit(500),
          supabase.from("transferencias").select("*, medicamentos(nome, concentracao), clinica_destino:clinicas_parceiras!transferencias_clinica_destino_id_fkey(nome)").order("created_at", { ascending: false }).limit(200),
        ]);
      setCategorias((catsData as Categoria[]) || []);
      setMovements(movData || []);
      setTransfers(transData || []);
      setMeds(
        (medsData || []).map((m: any) => ({
          ...m,
          lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const filteredMeds = catFilter === "all" ? meds : meds.filter((m) => m.categoria_id === catFilter);
  const totalUnits = filteredMeds.reduce((s, m) => s + getEstoqueTotal(m.lotes), 0);

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
    { name: "Normal", value: filteredMeds.filter((m) => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "normal").length, color: "#10b981" },
    { name: "Baixo", value: filteredMeds.filter((m) => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "baixo").length, color: "#f59e0b" },
    { name: "Crítico", value: filteredMeds.filter((m) => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "critico").length, color: "#ef4444" },
    { name: "Esgotado", value: filteredMeds.filter((m) => getEstoqueStatus(getEstoqueTotal(m.lotes), m.estoque_minimo) === "esgotado").length, color: "#6b7280" },
  ];

  const topStock = [...filteredMeds].map((m) => ({ name: m.nome.length > 20 ? m.nome.slice(0, 20) + "…" : m.nome, qty: getEstoqueTotal(m.lotes) })).sort((a, b) => b.qty - a.qty).slice(0, 8);

  // Valor total do estoque
  const totalValue = filteredMeds.reduce((s, m) => s + m.lotes.reduce((sl, l) => sl + l.quantidade_atual * l.preco_unitario, 0), 0);

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
              const rows = filteredMeds.map((m) => {
                const t = getEstoqueTotal(m.lotes);
                const st = getEstoqueStatus(t, m.estoque_minimo);
                const cls = st === "normal" ? "green" : st === "baixo" ? "yellow" : st === "critico" ? "red" : "gray";
                return `<tr><td>${m.nome}</td><td>${m.concentracao}</td><td style="text-align:center">${t}</td><td style="text-align:center">${m.estoque_minimo}</td><td><span class="badge ${cls}">${st}</span></td><td style="text-align:right">R$ ${(m.lotes.reduce((s, l) => s + l.quantidade_atual * l.preco_unitario, 0)).toFixed(2)}</td></tr>`;
              }).join("");
              printReport("Relatório de Estoque Atual", `<p><strong>${filteredMeds.length}</strong> itens | <strong>${totalUnits.toLocaleString("pt-BR")}</strong> unidades | Valor: <strong>R$ ${totalValue.toFixed(2)}</strong></p><table><thead><tr><th>Medicamento</th><th>Concentração</th><th>Estoque</th><th>Mínimo</th><th>Status</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table>`);
            }}><Printer className="h-3.5 w-3.5" />PDF</Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "Itens", value: filteredMeds.length, icon: Pill },
              { label: "Unidades", value: totalUnits.toLocaleString("pt-BR"), icon: Package },
              { label: "Valor Total", value: `R$ ${totalValue.toFixed(2)}`, icon: TrendingUp },
            ].map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex items-center gap-2 mb-1"><m.icon className="h-3.5 w-3.5 text-primary" /><p className="text-[11px] text-muted-foreground uppercase">{m.label}</p></div>
                <p className="text-xl font-bold">{m.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5 shadow-card">
              <h3 className="text-sm font-semibold mb-4">Maiores Estoques</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topStock} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip /><Bar dataKey="qty" fill="hsl(214, 60%, 35%)" radius={[0, 4, 4, 0]} barSize={16} name="Unidades" />
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
              const rows = filteredMov.map((m) => `<tr><td>${formatDate(m.created_at)}</td><td>${m.tipo}</td><td>${m.medicamentos?.nome || "—"}</td><td style="text-align:center">${m.quantidade}</td><td>${m.paciente || m.setor || "—"}</td></tr>`).join("");
              printReport(`Movimentações (${formatDate(dateFrom)} a ${formatDate(dateTo)})`, `<p><strong>${filteredMov.length}</strong> registros no período</p><table><thead><tr><th>Data</th><th>Tipo</th><th>Medicamento</th><th>Qtd</th><th>Paciente/Setor</th></tr></thead><tbody>${rows}</tbody></table>`);
            }}><Printer className="h-3.5 w-3.5" />PDF</Button>
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
                const rows = expiring.map((e) => {
                  const cls = e.days <= 15 ? "red" : e.days <= 30 ? "yellow" : "green";
                  return `<tr><td>${e.med.nome}</td><td>${e.lote.numero_lote}</td><td>${formatDate(e.lote.validade)}</td><td style="text-align:center"><span class="badge ${cls}">${e.days}d</span></td><td style="text-align:center">${e.lote.quantidade_atual}</td></tr>`;
                }).join("");
                printReport(`Medicamentos a Vencer (${venDays} dias)`, `<p><strong>${expiring.length}</strong> lotes a vencer</p><table><thead><tr><th>Medicamento</th><th>Lote</th><th>Validade</th><th>Dias</th><th>Qtd</th></tr></thead><tbody>${rows}</tbody></table>`);
              }}><Printer className="h-3.5 w-3.5" />PDF</Button>
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
              const rows = consumoSetorData.map((c) => `<tr><td>${c.name}</td><td style="text-align:center">${c.value}</td></tr>`).join("");
              printReport(`Consumo por Setor/Paciente (${formatDate(dateFrom)} a ${formatDate(dateTo)})`, `<table><thead><tr><th>Setor/Paciente</th><th>Quantidade</th></tr></thead><tbody>${rows}</tbody></table>`);
            }}><Printer className="h-3.5 w-3.5" />PDF</Button>
          </div>
          <Card className="p-5 shadow-card">
            <h3 className="text-sm font-semibold mb-4">Top 10 — Consumo por Setor/Paciente</h3>
            {consumoSetorData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma saída no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={consumoSetorData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip /><Bar dataKey="value" fill="hsl(214, 60%, 35%)" radius={[0, 4, 4, 0]} barSize={16} name="Unidades" />
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
              const rows = filteredTrans.map((t) => `<tr><td>${formatDate(t.created_at)}</td><td>${t.medicamentos?.nome || "—"}</td><td>${t.clinica_destino?.nome || "—"}</td><td style="text-align:center">${t.quantidade}</td><td>${t.status}</td></tr>`).join("");
              printReport(`Transferências (${formatDate(dateFrom)} a ${formatDate(dateTo)})`, `<p><strong>${filteredTrans.length}</strong> transferências no período</p><table><thead><tr><th>Data</th><th>Medicamento</th><th>Destino</th><th>Qtd</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
            }}><Printer className="h-3.5 w-3.5" />PDF</Button>
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
      </Tabs>
    </AppLayout>
  );
};

export default Relatorios;
