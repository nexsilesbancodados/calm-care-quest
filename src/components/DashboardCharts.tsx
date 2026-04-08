import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell,
  CartesianGrid, Area, AreaChart,
} from "recharts";
import {
  Pill, AlertTriangle, XCircle, Clock, Package, ShieldCheck,
  ArrowLeftRight, TrendingUp, ArrowRight, Activity, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/hooks/useDashboardData";

const COLORS = ["hsl(152, 56%, 36%)", "hsl(178, 48%, 40%)", "hsl(212, 82%, 54%)", "hsl(40, 96%, 50%)", "hsl(4, 76%, 50%)", "hsl(160, 50%, 46%)", "hsl(148, 10%, 42%)"];

const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border) / 0.4)",
  borderRadius: 14,
  fontSize: 11,
  boxShadow: "var(--shadow-elevated)",
};

interface Props {
  consumoData: { day: string; qty: number }[];
  topStocked: { name: string; qty: number }[];
  catData: { name: string; value: number }[];
  period: string;
  setPeriod: (v: string) => void;
  totalAlerts: number;
  stats: DashboardStats;
  navigate: (path: string) => void;
}

export default memo(function DashboardCharts({ consumoData, topStocked, catData, period, setPeriod, totalAlerts, stats: s, navigate }: Props) {
  return (
    <>
      <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-7">
        {/* Consumo */}
        <div>
            <Card className="p-3 sm:p-6 h-full border-border/40 rounded-xl sm:rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/6 ring-1 ring-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight font-display">Consumo</h3>
                  <p className="text-[10px] text-muted-foreground/50 hidden sm:block">Saídas e dispensações no período</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-8 text-[11px] w-[110px] rounded-xl border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-[10px] font-bold bg-primary/4 border-primary/10 tabular-nums">
                  {consumoData.reduce((sum, d) => sum + d.qty, 0).toLocaleString("pt-BR")} un
                </Badge>
              </div>
            </div>
            {consumoData.every(d => d.qty === 0) ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
                <Activity className="h-8 w-8 mb-3" strokeWidth={1.2} />
                <p className="text-xs font-medium">Nenhuma saída no período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={consumoData} margin={{ left: -12, right: 4, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.5)" }} interval={Math.max(0, Math.floor(consumoData.length / 6))} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.5)" }} width={30} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "hsl(var(--primary) / 0.3)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey="qty" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorQty)" name="Unidades" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--card))" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Categories */}
        <div>
            <Card className="p-3 sm:p-6 h-full border-border/40 rounded-xl sm:rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/6 ring-1 ring-accent/10">
                <Pill className="h-4 w-4 text-accent" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight font-display">Categorias</h3>
                <p className="text-[10px] text-muted-foreground/50 hidden sm:block">Distribuição por tipo</p>
              </div>
            </div>
            {catData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
                <Pill className="h-8 w-8 mb-3" strokeWidth={1.2} />
                <p className="text-xs font-medium">Sem dados</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" stroke="hsl(var(--card))" strokeWidth={3} paddingAngle={3}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1 mt-2">
                  {catData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2.5 text-[11px] px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground/70 truncate flex-1">{c.name}</span>
                      <span className="font-bold tabular-nums text-foreground font-mono text-[10px]">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── TOP STOCK + ALERTS ── */}
      <div className="space-y-4 sm:space-y-6">
        <Card className="p-3 sm:p-6 h-full border-border/40 rounded-xl sm:rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/6 ring-1 ring-success/10">
                <Package className="h-4 w-4 text-success" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight font-display">Maiores Estoques</h3>
                <p className="text-[10px] text-muted-foreground/50 hidden sm:block">Top 6 medicamentos</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7 text-muted-foreground/50 hover:text-foreground rounded-lg" onClick={() => navigate("/estoque")}>
              Ver <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {topStocked.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground/40">
              <Package className="h-8 w-8 mb-3" strokeWidth={1.2} />
              <p className="text-xs font-medium">Nenhum medicamento</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={topStocked} layout="vertical" margin={{ left: 0, right: 4 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.5)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground) / 0.6)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="qty" fill="url(#barGrad)" radius={[0, 8, 8, 0]} barSize={14} name="Unidades" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-3 sm:p-6 h-full border-border/40 rounded-xl sm:rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/6 ring-1 ring-warning/10">
                <Zap className="h-4 w-4 text-warning" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight font-display">Alertas</h3>
                <p className="text-[10px] text-muted-foreground/50 hidden sm:block">Atenção necessária</p>
              </div>
            </div>
            {totalAlerts > 0 && (
              <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-7 text-muted-foreground/50 hover:text-foreground rounded-lg" onClick={() => navigate("/alertas")}>
                Ver <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>

          {totalAlerts === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground/40">
              <ShieldCheck className="h-8 w-8 mb-3 text-success/40" strokeWidth={1.2} />
              <p className="text-xs font-bold text-success/60">Tudo em ordem!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {s.outOfStock > 0 && (
                <AlertRow icon={XCircle} color="destructive" label={`${s.outOfStock} medicamento(s) esgotado(s)`} badge="Crítico" onClick={() => navigate("/alertas")} />
              )}
              {s.critical > 0 && (
                <AlertRow icon={AlertTriangle} color="destructive" label={`${s.critical} em estoque crítico`} badge="Crítico" onClick={() => navigate("/alertas")} />
              )}
              {s.lowStock > 0 && (
                <AlertRow icon={Package} color="warning" label={`${s.lowStock} com estoque baixo`} badge="Baixo" onClick={() => navigate("/alertas")} />
              )}
              {s.expiringSoon > 0 && (
                <AlertRow icon={Clock} color="warning" label={`${s.expiringSoon} próximo(s) do vencimento`} badge="60 dias" onClick={() => navigate("/alertas")} />
              )}
              {s.pendingTransfers > 0 && (
                <div
                  className="flex items-center gap-3 text-xs rounded-xl border border-info/8 bg-info/[0.02] p-3 cursor-pointer transition-colors hover:bg-info/[0.04]"
                  onClick={() => navigate("/transferencias")}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/6">
                    <ArrowLeftRight className="h-3.5 w-3.5 text-info" strokeWidth={1.8} />
                  </div>
                  <span className="font-bold text-foreground flex-1 text-[11px]">{s.pendingTransfers} transferência(s) pendente(s)</span>
                  <ArrowRight className="h-3.5 w-3.5 text-info/50 shrink-0" />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
});

function AlertRow({ icon: Icon, color, label, badge, onClick }: { icon: any; color: string; label: string; badge: string; onClick: () => void }) {
  return (
    <div className={cn("flex items-center gap-3 text-xs rounded-xl border p-3 cursor-pointer transition-colors", `border-${color}/8 bg-${color}/[0.02] hover:bg-${color}/[0.04]`)} onClick={onClick}>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", `bg-${color}/6`)}>
        <Icon className={cn("h-3.5 w-3.5", `text-${color}`)} strokeWidth={1.8} />
      </div>
      <span className="font-bold text-foreground truncate flex-1 text-[11px]">{label}</span>
      <Badge variant="outline" className={cn("text-[8px] uppercase tracking-wider font-bold", `bg-${color}/6 text-${color} border-${color}/10`)}>
        {badge}
      </Badge>
    </div>
  );
}
