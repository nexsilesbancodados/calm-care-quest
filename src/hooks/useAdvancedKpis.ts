import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdvancedKpis {
  curvaA: number;
  curvaB: number;
  curvaC: number;
  taxaAtendimento: number;
  totalSolicitacoes: number;
  devolucoesMes: number;
  quarentena: number;
}

export interface UserProductivity {
  usuario: string;
  total_movimentacoes: number;
  dispensacoes: number;
  entradas: number;
  devolucoes: number;
  total_unidades: number;
}

async function fetchAdvancedKpis(): Promise<AdvancedKpis> {
  const { data, error } = await supabase.rpc("get_advanced_kpis");
  if (error) throw error;
  const d = data as any;
  return {
    curvaA: d.curvaA || 0,
    curvaB: d.curvaB || 0,
    curvaC: d.curvaC || 0,
    taxaAtendimento: d.taxaAtendimento || 0,
    totalSolicitacoes: d.totalSolicitacoes || 0,
    devolucoesMes: d.devolucoesMes || 0,
    quarentena: d.quarentena || 0,
  };
}

async function fetchUserProductivity(days: number): Promise<UserProductivity[]> {
  const { data, error } = await supabase.rpc("get_user_productivity", { _days: days });
  if (error) throw error;
  return (data as any) || [];
}

export function useAdvancedKpis() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["advanced-kpis", profile?.filial_id],
    queryFn: fetchAdvancedKpis,
    staleTime: 3 * 60 * 1000,
  });
}

export function useUserProductivity(days = 30) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["user-productivity", days, profile?.filial_id],
    queryFn: () => fetchUserProductivity(days),
    staleTime: 3 * 60 * 1000,
  });
}
