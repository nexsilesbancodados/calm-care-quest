import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function getPeriodDates(period: string) {
  const now = new Date();
  let from: Date;
  let to = now;
  if (period === "this_month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "last_month") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    from = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);
  }
  return { from, to };
}

export interface DashboardStats {
  total: number;
  controlled: number;
  lowStock: number;
  critical: number;
  outOfStock: number;
  expiringSoon: number;
  totalUnits: number;
  totalValue: number;
  pendingTransfers: number;
  totalMovements: number;
  prescricoesAtivas: number;
  cmm: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("get_dashboard_stats");
  if (error) throw error;
  const d = data as any;
  return {
    total: d.total || 0,
    controlled: d.controlled || 0,
    lowStock: d.lowStock || 0,
    critical: d.critical || 0,
    outOfStock: d.outOfStock || 0,
    expiringSoon: d.expiringSoon || 0,
    totalUnits: d.totalUnits || 0,
    totalValue: d.totalValue || 0,
    pendingTransfers: d.pendingTransfers || 0,
    totalMovements: d.totalMovements || 0,
    prescricoesAtivas: d.prescricoesAtivas || 0,
    cmm: d.cmm || 0,
  };
}

async function fetchTopStocked() {
  const { data } = await supabase
    .from("medicamentos")
    .select("id, nome")
    .eq("ativo", true)
    .limit(200);
  
  if (!data || data.length === 0) return [];

  const { data: lotesData } = await supabase
    .from("lotes")
    .select("medicamento_id, quantidade_atual")
    .eq("ativo", true)
    .in("medicamento_id", data.map(m => m.id));

  const qtyMap: Record<string, number> = {};
  (lotesData || []).forEach((l: any) => {
    qtyMap[l.medicamento_id] = (qtyMap[l.medicamento_id] || 0) + l.quantidade_atual;
  });

  return data
    .map(m => ({ name: m.nome.length > 18 ? m.nome.slice(0, 18) + "…" : m.nome, qty: qtyMap[m.id] || 0 }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);
}

async function fetchCategoryData() {
  const { data: cats } = await supabase.from("categorias_medicamento").select("id, nome");
  if (!cats || cats.length === 0) return [];

  // Get total per category via lotes join
  const { data: meds } = await supabase
    .from("medicamentos")
    .select("id, categoria_id")
    .eq("ativo", true)
    .not("categoria_id", "is", null);

  const { data: lotes } = await supabase
    .from("lotes")
    .select("medicamento_id, quantidade_atual")
    .eq("ativo", true);

  const medCatMap: Record<string, string> = {};
  (meds || []).forEach((m: any) => { if (m.categoria_id) medCatMap[m.id] = m.categoria_id; });

  const catTotals: Record<string, number> = {};
  (lotes || []).forEach((l: any) => {
    const catId = medCatMap[l.medicamento_id];
    if (catId) catTotals[catId] = (catTotals[catId] || 0) + l.quantidade_atual;
  });

  return cats
    .map(c => ({ name: c.nome, value: catTotals[c.id] || 0 }))
    .filter(c => c.value > 0);
}

async function fetchConsumoData(period: string) {
  const { from, to } = getPeriodDates(period);
  const { data: movData } = await supabase.from("movimentacoes").select("created_at, quantidade, tipo")
    .in("tipo", ["saida", "dispensacao"])
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at");

  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 1000)) + 1;
  const dayMap: Record<string, number> = {};
  for (let i = Math.min(days, 90) - 1; i >= 0; i--) {
    const d = new Date(to.getTime() - i * 24 * 60 * 60 * 1000);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  (movData || []).forEach((m: any) => {
    const day = m.created_at.slice(0, 10);
    if (dayMap[day] !== undefined) dayMap[day] += m.quantidade;
  });

  return Object.entries(dayMap).map(([day, qty]) => ({
    day: new Date(day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    qty,
  }));
}

export function useDashboardStats() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", profile?.filial_id],
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useTopStocked() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["dashboard-top-stocked", profile?.filial_id],
    queryFn: fetchTopStocked,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategoryData() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["dashboard-category-data", profile?.filial_id],
    queryFn: fetchCategoryData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConsumoData(period: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["dashboard-consumo", period, profile?.filial_id],
    queryFn: () => fetchConsumoData(period),
    staleTime: 2 * 60 * 1000,
  });
}
