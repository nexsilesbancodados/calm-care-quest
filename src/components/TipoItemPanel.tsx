import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TIPO_ITEM_CONFIG, type TipoItem } from "@/types/database";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const COLORS: Record<TipoItem, string> = {
  medicamento: "hsl(var(--primary))",
  material: "hsl(var(--info))",
  epi: "hsl(var(--warning))",
  higiene: "hsl(var(--success))",
};

export default function TipoItemPanel() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-tipo-item-counts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("medicamentos")
        .select("tipo_item")
        .eq("ativo", true);
      if (error) throw error;
      const counts: Record<TipoItem, number> = { medicamento: 0, material: 0, epi: 0, higiene: 0 };
      (rows || []).forEach((r: any) => {
        const t = (r.tipo_item ?? "medicamento") as TipoItem;
        counts[t] = (counts[t] || 0) + 1;
      });
      return counts;
    },
  });

  if (isLoading) return <Skeleton className="h-44 rounded-2xl mb-4 sm:mb-7" />;

  const counts = data || { medicamento: 0, material: 0, epi: 0, higiene: 0 };
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const chartData = (Object.keys(TIPO_ITEM_CONFIG) as TipoItem[]).map((t) => ({
    name: TIPO_ITEM_CONFIG[t].label,
    value: counts[t],
    tipo: t,
  }));

  return (
    <Card className="p-4 sm:p-5 shadow-card mb-4 sm:mb-7">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Distribuição por Tipo de Item</h3>
          <p className="text-[11px] text-muted-foreground">{total} item(ns) ativos no estoque</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-4 items-center">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(TIPO_ITEM_CONFIG) as TipoItem[]).map((t) => {
            const cfg = TIPO_ITEM_CONFIG[t];
            const value = counts[t];
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <button
                key={t}
                onClick={() => navigate(`/inventario`)}
                className={cn(
                  "group rounded-xl border bg-card p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]",
                  cfg.className.replace("bg-", "hover:bg-").replace("/10", "/5"),
                )}
                style={{ borderColor: `color-mix(in oklch, ${COLORS[t]} 25%, transparent)` }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{cfg.emoji}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{pct}%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{cfg.label}</p>
                <p className="text-xl font-bold tabular-nums">{value}</p>
              </button>
            );
          })}
        </div>

        <div className="h-[140px] w-full">
          {total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={62}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.tipo} fill={COLORS[entry.tipo as TipoItem]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(value: number, name: string) => [`${value} itens`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
              Sem itens cadastrados
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
