import type { CssrsInput } from "@/lib/schemas/paciente";
import { calcularRiscoCssrs } from "@/lib/schemas/paciente";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function salvarAvaliacaoCssrs(input: CssrsInput) {
  const risco = calcularRiscoCssrs(input);
  const conduta = sugestaoConduta(risco);

  const { data, error } = await db
    .from("avaliacoes_cssrs")
    .insert({ ...input, risco, conduta })
    .select()
    .single();
  if (error) throw error;

  // Atualiza flag no paciente
  await db
    .from("pacientes")
    .update({ risco_suicida: risco })
    .eq("id", input.paciente_id);

  return data;
}

export function sugestaoConduta(risco: "baixo" | "moderado" | "alto"): string {
  switch (risco) {
    case "alto":
      return "Avaliação psiquiátrica imediata. Observação contínua (1:1). Retirar objetos de risco. Notificar responsável técnico.";
    case "moderado":
      return "Reavaliação em 24h. Monitorização de turno. Plano de segurança documentado.";
    default:
      return "Acompanhamento de rotina. Reavaliar conforme evolução clínica.";
  }
}
