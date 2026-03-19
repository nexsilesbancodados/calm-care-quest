import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { motion } from "framer-motion";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { CATEGORIES, getStockStatus, getStockStatusConfig } from "@/types/medication";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Package, TrendingDown, AlertTriangle, CheckCircle, ClipboardCheck, Filter, Wrench } from "lucide-react";
import { toast } from "sonner";

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#6b7280"];

const Estoque = () => {
  const { medications, adjustStock } = useMedicationContext();
  const { user } = useAuth();
  const { log } = useAudit();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustMedId, setAdjustMedId] = useState("");
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  const filteredMeds = useMemo(() => {
    return medications.filter((m) => {
      const matchCat = categoryFilter === "all" || m.category === categoryFilter;
      const shelf = m.location.split("-")[0] || m.location;
      const matchLoc = locationFilter === "all" || shelf === locationFilter;
      return matchCat && matchLoc;
    });
  }, [medications, categoryFilter, locationFilter]);

  const categoryData = useMemo(() =>
    CATEGORIES.map((cat) => {
      const meds = filteredMeds.filter((m) => m.category === cat.value);
      const totalStock = meds.reduce((sum, m) => sum + m.currentStock, 0);
      return { name: cat.label, value: totalStock, count: meds.length };
    }).filter((c) => c.count > 0), [filteredMeds]);

  const statusBreakdown = useMemo(() => [
    { status: "normal", count: filteredMeds.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "normal").length },
    { status: "baixo", count: filteredMeds.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "baixo").length },
    { status: "crítico", count: filteredMeds.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "crítico").length },
    { status: "esgotado", count: filteredMeds.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "esgotado").length },
  ], [filteredMeds]);

  const topStock = useMemo(() =>
    [...filteredMeds].sort((a, b) => b.currentStock - a.currentStock).slice(0, 8)
      .map((m) => ({ name: m.name, stock: m.currentStock, min: m.minimumStock })),
  [filteredMeds]);

  const locationGroups = useMemo(() => {
    return filteredMeds.reduce((acc, m) => {
      const shelf = m.location.split("-")[0] || m.location;
      if (!acc[shelf]) acc[shelf] = [];
      acc[shelf].push(m);
      return acc;
    }, {} as Record<string, typeof medications>);
  }, [filteredMeds]);

  const allLocations = useMemo(() => {
    const locs = new Set(medications.map((m) => m.location.split("-")[0] || m.location));
    return Array.from(locs).sort();
  }, [medications]);

  const totalUnits = filteredMeds.reduce((s, m) => s + m.currentStock, 0);

  const handleAdjust = () => {
    if (!adjustMedId || adjustQty === 0) {
      toast.error("Selecione um medicamento e informe a quantidade");
      return;
    }
    adjustStock(adjustMedId, adjustQty);
    const med = medications.find((m) => m.id === adjustMedId);
    log({
      userId: user?.id || "",
      userName: user?.name || "",
      action: "Ajuste de Inventário",
      module: "Estoque",
      details: `${adjustQty > 0 ? "+" : ""}${adjustQty} un. ${med?.name || ""} — ${adjustReason || "sem motivo"}`,
      severity: "warning",
    });
    toast.success(`Estoque ajustado: ${adjustQty > 0 ? "+" : ""}${adjustQty} un. de ${med?.name}`);
    setAdjustDialogOpen(false);
    setAdjustMedId("");
    setAdjustQty(0);
    setAdjustReason("");
  };

  return (
    <AppLayout title="Estoque" subtitle={`${totalUnits.toLocaleString("pt-BR")} unidades em ${filteredMeds.length} itens`}>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[140px] bg-card"><SelectValue placeholder="Local" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos locais</SelectItem>
              {allLocations.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setAdjustDialogOpen(true)} variant="outline" className="gap-2 ml-auto">
          <Wrench className="h-4 w-4" /> Ajuste de Inventário
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statusBreakdown.map((s, i) => {
          const config = getStockStatusConfig(s.status as any);
          const icons = [CheckCircle, TrendingDown, AlertTriangle, Package];
          const Icon = icons[i];
          return (
            <motion.div key={s.status} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", config.className)}><Icon className="h-4 w-4" /></div>
                <div><p className="text-xs text-muted-foreground">{config.label}</p><p className="text-xl font-bold">{s.count}</p></div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-4">Maiores Estoques</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topStock} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`${value} un.`, "Estoque"]} />
              <Bar dataKey="stock" fill="hsl(174, 62%, 38%)" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-4">Distribuição por Categoria</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={240}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" stroke="none">
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`${value} un.`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {categoryData.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground truncate">{cat.name}</span>
                  <span className="ml-auto font-medium">{cat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Location Map */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-5 shadow-card">
        <h3 className="text-sm font-semibold mb-4">Mapa de Localização</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(locationGroups).sort().map(([location, meds]) => (
            <div key={location} className="rounded-lg border p-3 space-y-2 hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">{location}</Badge>
                <span className="text-xs text-muted-foreground">{meds.length} itens</span>
              </div>
              {meds.map((med) => {
                const status = getStockStatus(med.currentStock, med.minimumStock);
                const percent = med.minimumStock > 0 ? Math.min(100, (med.currentStock / (med.minimumStock * 2)) * 100) : 100;
                return (
                  <div key={med.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate pr-2">{med.name}</span>
                      <span className="font-medium shrink-0">{med.currentStock}</span>
                    </div>
                    <Progress value={percent} className={cn("h-1.5", {
                      "[&>div]:bg-success": status === "normal",
                      "[&>div]:bg-warning": status === "baixo",
                      "[&>div]:bg-destructive": status === "crítico" || status === "esgotado",
                    })} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Ajuste de Inventário</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Medicamento</Label>
              <Select value={adjustMedId} onValueChange={setAdjustMedId}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {medications.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name} {m.dosage} (atual: {m.currentStock})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Ajuste (positivo = adicionar, negativo = remover)</Label>
              <Input type="number" value={adjustQty || ""} onChange={(e) => setAdjustQty(Number(e.target.value))} placeholder="Ex: +50 ou -10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Motivo</Label>
              <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Contagem física, avaria, etc." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAdjust} className="gradient-primary text-primary-foreground">Ajustar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Estoque;
