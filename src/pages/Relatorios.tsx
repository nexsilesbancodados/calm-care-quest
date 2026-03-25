import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { CATEGORIES, getStockStatus } from "@/types/medication";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import {
  TrendingUp, Pill, AlertTriangle, Package, FileText, Calendar,
  Download, FileSpreadsheet, Filter, Printer
} from "lucide-react";

const COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#6366f1", "#ec4899"];

const Relatorios = () => {
  const { medications: allMedications } = useMedicationContext();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("6m");

  // Filtered medications
  const filteredMeds = useMemo(() => {
    let meds = [...allMedications];
    if (categoryFilter !== "all") {
      meds = meds.filter((m) => m.category === categoryFilter);
    }
    if (stockFilter !== "all") {
      meds = meds.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === stockFilter);
    }
    return meds;
  }, [categoryFilter, stockFilter]);

  // Category distribution
  const categoryData = CATEGORIES.map((cat) => {
    const meds = filteredMeds.filter((m) => m.category === cat.value);
    return { name: cat.label, total: meds.reduce((s, m) => s + m.currentStock, 0), count: meds.length };
  }).filter((c) => c.count > 0);

  // Stock status
  const stockData = [
    { name: "Normal", value: filteredMeds.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "normal").length, color: "#10b981" },
    { name: "Baixo", value: filteredMeds.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "baixo").length, color: "#f59e0b" },
    { name: "Crítico", value: filteredMeds.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "crítico").length, color: "#ef4444" },
    { name: "Esgotado", value: filteredMeds.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "esgotado").length, color: "#6b7280" },
  ];

  // Monthly data
  const monthCount = periodFilter === "3m" ? 3 : periodFilter === "6m" ? 6 : 12;
  const allMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const now = new Date();
  const consumptionData = Array.from({ length: monthCount }, (_, i) => {
    const idx = (now.getMonth() - monthCount + 1 + i + 12) % 12;
    return { month: allMonths[idx], entradas: 0, saídas: 0, dispensações: 0 };
  });

  // Top by stock (derived from real data)
  const topConsumed = useMemo(() =>
    [...filteredMeds].sort((a, b) => b.currentStock - a.currentStock).slice(0, 8)
      .map((m) => ({ name: `${m.name} ${m.dosage}`, qty: m.currentStock })),
  [filteredMeds]);

  // Expiration timeline
  const expiryData = useMemo(() => {
    const n = new Date();
    const ranges = [
      { label: "Vencido", min: -Infinity, max: 0, color: "#ef4444" },
      { label: "0-30d", min: 0, max: 30, color: "#f59e0b" },
      { label: "30-60d", min: 30, max: 60, color: "#f97316" },
      { label: "60-90d", min: 60, max: 90, color: "#3b82f6" },
      { label: "90-180d", min: 90, max: 180, color: "#10b981" },
      { label: ">180d", min: 180, max: Infinity, color: "#6b7280" },
    ];
    return ranges.map((r) => ({
      name: r.label,
      count: filteredMeds.filter((m) => {
        const diff = (new Date(m.expirationDate).getTime() - n.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= r.min && diff < r.max;
      }).length,
      color: r.color,
    }));
  }, [filteredMeds]);

  // Summary metrics
  const totalUnits = filteredMeds.reduce((s, m) => s + m.currentStock, 0);
  const avgStock = filteredMeds.length ? Math.round(totalUnits / filteredMeds.length) : 0;
  const controlled = filteredMeds.filter((m) => m.controlledSubstance).length;

  // ─── Export CSV ───
  const handleExportCSV = () => {
    const headers = ["Medicamento", "Dosagem", "Categoria", "Estoque", "Mínimo", "Lote", "Validade", "Local", "Controlado"];
    const rows = filteredMeds.map((m) => [
      m.name, m.dosage, m.category, m.currentStock, m.minimumStock,
      m.batchNumber, new Date(m.expirationDate).toLocaleDateString("pt-BR"),
      m.location, m.controlledSubstance ? "Sim" : "Não",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-psiFarma-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Export Excel (via CSV-like TSV) ───
  const handleExportExcel = () => {
    const headers = ["Medicamento", "Dosagem", "Categoria", "Estoque Atual", "Estoque Mínimo", "Lote", "Validade", "Localização", "Controlado", "Status"];
    const rows = filteredMeds.map((m) => [
      m.name, m.dosage, m.category, m.currentStock, m.minimumStock,
      m.batchNumber, new Date(m.expirationDate).toLocaleDateString("pt-BR"),
      m.location, m.controlledSubstance ? "Sim" : "Não",
      getStockStatus(m.currentStock, m.minimumStock),
    ]);

    // Build XML Spreadsheet (opens natively in Excel)
    const xmlRows = rows.map((r) =>
      `<Row>${r.map((c) => `<Cell><Data ss:Type="${typeof c === "number" ? "Number" : "String"}">${c}</Data></Cell>`).join("")}</Row>`
    ).join("");
    const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0D9488" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Relatório"><Table>
<Row ss:StyleID="header">${headers.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join("")}</Row>
${xmlRows}
</Table></Worksheet></Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-psiFarma-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Export PDF ───
  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = filteredMeds.map((m) => `
      <tr>
        <td>${m.name}</td>
        <td>${m.dosage}</td>
        <td>${m.category}</td>
        <td style="text-align:center">${m.currentStock}</td>
        <td style="text-align:center">${m.minimumStock}</td>
        <td>${m.batchNumber}</td>
        <td>${new Date(m.expirationDate).toLocaleDateString("pt-BR")}</td>
        <td>${m.location}</td>
        <td>${m.controlledSubstance ? "Sim" : "Não"}</td>
      </tr>
    `).join("");

    const filterInfo = [
      categoryFilter !== "all" ? `Categoria: ${CATEGORIES.find(c => c.value === categoryFilter)?.label}` : null,
      stockFilter !== "all" ? `Status: ${stockFilter}` : null,
    ].filter(Boolean).join(" • ") || "Todos os filtros";

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Relatório PsiFarma</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#1a1a2e}
        h1{font-size:18px;color:#0d9488;margin-bottom:4px}
        h2{font-size:13px;font-weight:normal;color:#666;margin-top:0}
        .filters{font-size:11px;color:#888;margin-bottom:12px;padding:6px 10px;background:#f8f8f8;border-radius:6px}
        .summary{display:flex;gap:20px;margin:16px 0;flex-wrap:wrap}
        .stat{background:#f0fdfa;padding:12px 16px;border-radius:8px;min-width:120px}
        .stat .label{font-size:10px;text-transform:uppercase;color:#666;letter-spacing:1px}
        .stat .val{font-size:20px;font-weight:bold;color:#0d9488}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}
        th{background:#0d9488;color:white;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px}
        td{padding:6px 8px;border-bottom:1px solid #eee}
        tr:nth-child(even){background:#f9fafb}
        .footer{margin-top:24px;font-size:10px;color:#999;text-align:center}
        @media print{body{padding:10px}@page{margin:10mm}}
      </style></head><body>
      <h1>📋 Relatório Geral — PsiFarma</h1>
      <h2>Farmácia Hospitalar • Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</h2>
      <div class="filters">Filtros: ${filterInfo}</div>
      <div class="summary">
        <div class="stat"><div class="label">Itens</div><div class="val">${filteredMeds.length}</div></div>
        <div class="stat"><div class="label">Estoque Total</div><div class="val">${totalUnits.toLocaleString("pt-BR")}</div></div>
        <div class="stat"><div class="label">Controlados</div><div class="val">${controlled}</div></div>
        <div class="stat"><div class="label">Média/Item</div><div class="val">${avgStock}</div></div>
      </div>
      <table>
        <thead><tr><th>Medicamento</th><th>Dosagem</th><th>Categoria</th><th>Estoque</th><th>Mínimo</th><th>Lote</th><th>Validade</th><th>Local</th><th>Controlado</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">PsiFarma — Sistema de Gestão Farmacêutica Hospitalar</div>
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>`);
    printWindow.document.close();
  };

  return (
    <AppLayout
      title="Relatórios & Análises"
      subtitle="Visão analítica da farmácia hospitalar"
    >
      {/* Filters & Export Bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Card className="p-4 shadow-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filtros
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="crítico">Crítico</SelectItem>
                  <SelectItem value="esgotado">Esgotado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="12m">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
              {(categoryFilter !== "all" || stockFilter !== "all") && (
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setCategoryFilter("all"); setStockFilter("all"); }}>
                  Limpar filtros
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button onClick={handleExportExcel} variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </Button>
              <Button onClick={handleExportPDF} size="sm" className="gap-1.5 text-xs h-8">
                <Printer className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </div>
          {(categoryFilter !== "all" || stockFilter !== "all") && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Exibindo</span>
              <Badge variant="secondary" className="text-[10px]">{filteredMeds.length} de {allMedications.length} itens</Badge>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total de Itens", value: filteredMeds.length, icon: Pill },
          { label: "Unidades em Estoque", value: totalUnits.toLocaleString("pt-BR"), icon: Package },
          { label: "Média por Item", value: avgStock, icon: TrendingUp },
          { label: "Controlados", value: controlled, icon: AlertTriangle },
          { label: "Categorias", value: categoryData.length, icon: FileText },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <m.icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
            </div>
            <p className="text-xl font-bold">{m.value}</p>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="charts" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="charts" className="text-xs">Gráficos</TabsTrigger>
          <TabsTrigger value="table" className="text-xs">Tabela Detalhada</TabsTrigger>
          <TabsTrigger value="pacientes" className="text-xs">Consumo por Paciente</TabsTrigger>
          <TabsTrigger value="vencimentos" className="text-xs">Vencimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Flow */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="p-5 shadow-card">
                <h3 className="text-sm font-semibold mb-4">Fluxo Mensal de Medicamentos</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={consumptionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="entradas" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Entradas" />
                    <Area type="monotone" dataKey="dispensações" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Dispensações" />
                    <Area type="monotone" dataKey="saídas" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Saídas" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>

            {/* Top Consumed */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="p-5 shadow-card">
                <h3 className="text-sm font-semibold mb-4">Medicamentos Mais Dispensados</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topConsumed} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v} un.`, "Dispensado"]} />
                    <Bar dataKey="qty" fill="hsl(174, 62%, 38%)" radius={[0, 4, 4, 0]} barSize={16} name="Dispensado" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Stock Status Pie */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="p-5 shadow-card">
                <h3 className="text-sm font-semibold mb-4">Status do Estoque</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stockData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" stroke="none">
                      {stockData.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {stockData.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-muted-foreground">{s.name}: <span className="font-semibold text-foreground">{s.value}</span></span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Category Distribution */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-5 shadow-card">
                <h3 className="text-sm font-semibold mb-4">Unidades por Categoria</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v} un.`]} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={24}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>

            {/* Expiry Timeline */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card className="p-5 shadow-card">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Linha do Tempo de Validade
                </h3>
                <div className="space-y-3">
                  {expiryData.map((r) => (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{r.name}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(r.count / Math.max(filteredMeds.length, 1)) * 100}%`, backgroundColor: r.color }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-6 text-right">{r.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card className="shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Medicamento</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Dosagem</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Categoria</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Estoque</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Mínimo</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Lote</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Validade</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeds.map((m, i) => {
                    const status = getStockStatus(m.currentStock, m.minimumStock);
                    const statusColors: Record<string, string> = {
                      normal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                      baixo: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      crítico: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      esgotado: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
                    };
                    return (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                        <td className="p-3 font-medium">{m.name}</td>
                        <td className="p-3 text-muted-foreground">{m.dosage}</td>
                        <td className="p-3"><Badge variant="outline" className="text-[10px]">{m.category}</Badge></td>
                        <td className="p-3 text-center font-semibold">{m.currentStock}</td>
                        <td className="p-3 text-center text-muted-foreground">{m.minimumStock}</td>
                        <td className="p-3 text-muted-foreground font-mono text-[10px]">{m.batchNumber}</td>
                        <td className="p-3 text-muted-foreground">{new Date(m.expirationDate).toLocaleDateString("pt-BR")}</td>
                        <td className="p-3">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold", statusColors[status])}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pacientes">
          <Card className="p-5 shadow-card">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Consumo por Paciente (Últimos 30 dias)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Paciente</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Ala</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Medicamentos</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Total Un.</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Prescrições Ativas</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Carlos Eduardo Santos", ward: "Ala B", meds: "Risperidona 2mg, Clonazepam 2mg", total: 40, rxActive: 2 },
                    { name: "Maria Aparecida Lima", ward: "Ala A", meds: "Carbonato de Lítio 300mg, Quetiapina 100mg", total: 60, rxActive: 2 },
                    { name: "José Antônio Ferreira", ward: "Ala C", meds: "Sertralina 50mg, Diazepam 10mg", total: 35, rxActive: 2 },
                    { name: "Ana Beatriz Souza", ward: "Ala B", meds: "Fluoxetina 20mg", total: 30, rxActive: 1 },
                    { name: "Roberto Carlos Pereira", ward: "Ambulatório", meds: "Carbamazepina 200mg", total: 60, rxActive: 1 },
                  ].map((p) => (
                    <tr key={p.name} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-muted-foreground">{p.ward}</td>
                      <td className="p-3 text-muted-foreground">{p.meds}</td>
                      <td className="p-3 text-center font-semibold">{p.total}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px]">{p.rxActive}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="vencimentos">
          <Card className="p-5 shadow-card">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Cronograma de Vencimentos
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Medicamento</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Lote</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Estoque</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Validade</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Dias Restantes</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredMeds]
                    .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
                    .map((m) => {
                      const daysLeft = Math.floor((new Date(m.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const urgency = daysLeft < 0 ? "bg-destructive/10 text-destructive" : daysLeft <= 30 ? "bg-warning/10 text-warning" : daysLeft <= 90 ? "bg-info/10 text-info" : "bg-muted text-muted-foreground";
                      const label = daysLeft < 0 ? "VENCIDO" : daysLeft <= 30 ? "Urgente" : daysLeft <= 90 ? "Próximo" : "OK";
                      return (
                        <tr key={m.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                          <td className="p-3 font-medium">{m.name} {m.dosage}</td>
                          <td className="p-3 font-mono text-muted-foreground">{m.batchNumber}</td>
                          <td className="p-3 text-center font-semibold">{m.currentStock}</td>
                          <td className="p-3 text-muted-foreground">{new Date(m.expirationDate).toLocaleDateString("pt-BR")}</td>
                          <td className="p-3 font-semibold">{daysLeft < 0 ? `${Math.abs(daysLeft)}d atrás` : `${daysLeft}d`}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={cn("text-[10px]", urgency)}>{label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Relatorios;
