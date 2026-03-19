import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { mockMedications } from "@/data/mockMedications";
import { CATEGORIES, getStockStatus } from "@/types/medication";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { TrendingUp, Pill, AlertTriangle, Package, FileText, Calendar } from "lucide-react";

const COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#6366f1", "#ec4899"];

const Relatorios = () => {
  // Category distribution
  const categoryData = CATEGORIES.map((cat) => {
    const meds = mockMedications.filter((m) => m.category === cat.value);
    return { name: cat.label, total: meds.reduce((s, m) => s + m.currentStock, 0), count: meds.length };
  }).filter((c) => c.count > 0);

  // Stock status
  const stockData = [
    { name: "Normal", value: mockMedications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "normal").length, color: "#10b981" },
    { name: "Baixo", value: mockMedications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "baixo").length, color: "#f59e0b" },
    { name: "Crítico", value: mockMedications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "crítico").length, color: "#ef4444" },
    { name: "Esgotado", value: mockMedications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "esgotado").length, color: "#6b7280" },
  ];

  // Simulated monthly consumption
  const months = ["Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
  const consumptionData = months.map((m, i) => ({
    month: m,
    entradas: Math.round(800 + Math.random() * 400 + i * 50),
    saídas: Math.round(600 + Math.random() * 300 + i * 30),
    dispensações: Math.round(400 + Math.random() * 200 + i * 40),
  }));

  // Top consumed
  const topConsumed = [
    { name: "Risperidona 2mg", qty: 320 },
    { name: "Clonazepam 2mg", qty: 280 },
    { name: "Fluoxetina 20mg", qty: 245 },
    { name: "Sertralina 50mg", qty: 210 },
    { name: "Haloperidol 5mg/ml", qty: 185 },
    { name: "Olanzapina 10mg", qty: 160 },
    { name: "Diazepam 10mg", qty: 140 },
    { name: "Carbonato de Lítio", qty: 130 },
  ];

  // Expiration timeline
  const expiryData = useMemo(() => {
    const now = new Date();
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
      count: mockMedications.filter((m) => {
        const diff = (new Date(m.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= r.min && diff < r.max;
      }).length,
      color: r.color,
    }));
  }, []);

  // Summary metrics
  const totalUnits = mockMedications.reduce((s, m) => s + m.currentStock, 0);
  const avgStock = Math.round(totalUnits / mockMedications.length);
  const controlled = mockMedications.filter((m) => m.controlledSubstance).length;

  return (
    <AppLayout title="Relatórios & Análises" subtitle="Visão analítica da farmácia hospitalar">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total de Itens", value: mockMedications.length, icon: Pill },
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
            <h3 className="text-sm font-semibold mb-4">Medicamentos Mais Dispensados (último mês)</h3>
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

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
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
                      style={{ width: `${(r.count / mockMedications.length) * 100}%`, backgroundColor: r.color }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-6 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Relatorios;
