import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Medicamento, Lote } from "@/types/database";

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

async function fetchDashboardCore() {
  const [{ data: medsData }, { data: lotesData }, { data: catsData }, { data: transData }, { count }, { count: prescCount }] =
    await Promise.all([
      supabase.from("medicamentos").select("*").eq("ativo", true),
      supabase.from("lotes").select("*").eq("ativo", true),
      supabase.from("categorias_medicamento").select("*"),
      supabase.from("transferencias").select("id", { count: "exact" }).eq("status", "pendente"),
      supabase.from("movimentacoes").select("id", { count: "exact", head: true }),
      supabase.from("prescricoes").select("id", { count: "exact", head: true }).eq("status", "ativa"),
    ]);

  const medsWithLotes = (medsData || []).map((m: any) => ({
    ...m,
    lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id),
  })) as (Medicamento & { lotes: Lote[] })[];

  const catData = (catsData || []).map((c: any) => ({
    name: c.nome,
    value: medsWithLotes
      .filter((m) => m.categoria_id === c.id)
      .reduce((s, m) => s + m.lotes.reduce((sl, l) => sl + l.quantidade_atual, 0), 0),
  })).filter((c) => c.value > 0);

  // CMM: average of last 3 months
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const { data: cmmData } = await supabase.from("movimentacoes").select("quantidade")
    .in("tipo", ["saida", "dispensacao"])
    .gte("created_at", threeMonthsAgo.toISOString());
  const cmm = Math.round((cmmData || []).reduce((s: number, m: any) => s + m.quantidade, 0) / 3);

  return {
    meds: medsWithLotes,
    catData,
    pendingTransfers: transData?.length || 0,
    totalMovements: count || 0,
    prescricoesAtivas: prescCount || 0,
    cmm,
  };
}

async function fetchConsumoData(period: string) {
  const { from, to } = getPeriodDates(period);
  const { data: movData } = await supabase.from("movimentacoes").select("created_at, quantidade, tipo")
    .in("tipo", ["saida", "dispensacao"])
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at");

  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dayMap: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
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

export function useDashboardCore() {
  return useQuery({
    queryKey: ["dashboard-core"],
    queryFn: fetchDashboardCore,
    staleTime: 2 * 60 * 1000, // 2 min
    refetchOnWindowFocus: true,
  });
}

export function useConsumoData(period: string) {
  return useQuery({
    queryKey: ["dashboard-consumo", period],
    queryFn: () => fetchConsumoData(period),
    staleTime: 2 * 60 * 1000,
  });
}
