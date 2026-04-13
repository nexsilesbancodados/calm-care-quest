import { supabase } from "@/integrations/supabase/client";

// Cast necessário até regenerar tipos do Supabase após a migration
// 20260413120000_psiquiatria_lgpd_344.sql. Remover após `supabase gen types`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type Severidade = "leve" | "moderada" | "grave" | "contraindicada" | "anafilatica";

export interface Interacao {
  principio_a: string;
  principio_b: string;
  severidade: Severidade;
  descricao: string;
}

export interface AlertaClinico {
  tipo: "alergia" | "interacao" | "duplicidade";
  severidade: Severidade;
  mensagem: string;
  bloqueante: boolean;
}

const norm = (s: string) => s.trim().toLowerCase();

export async function verificarPrescricao(input: {
  paciente_id: string;
  principios_prescritos: string[];
}): Promise<AlertaClinico[]> {
  const alertas: AlertaClinico[] = [];
  const principios = input.principios_prescritos.map(norm);

  // 1. Duplicidade
  const vistos = new Set<string>();
  for (const p of principios) {
    if (vistos.has(p)) {
      alertas.push({
        tipo: "duplicidade",
        severidade: "moderada",
        mensagem: `Princípio ativo duplicado na prescrição: ${p}`,
        bloqueante: false,
      });
    }
    vistos.add(p);
  }

  // 2. Alergias
  const { data: alergias } = await db
    .from("alergias_paciente")
    .select("principio_ativo, severidade, agente")
    .eq("paciente_id", input.paciente_id);

  for (const a of alergias ?? []) {
    const pa = a.principio_ativo ? norm(a.principio_ativo) : null;
    if (pa && principios.includes(pa)) {
      alertas.push({
        tipo: "alergia",
        severidade: a.severidade as Severidade,
        mensagem: `Paciente alérgico a ${a.agente} (${a.severidade})`,
        bloqueante: a.severidade === "anafilatica" || a.severidade === "grave",
      });
    }
  }

  // 3. Interações medicamentosas
  if (principios.length >= 2) {
    const { data: interacoes } = await db
      .from("interacoes_medicamentosas")
      .select("principio_a, principio_b, severidade, descricao")
      .or(
        principios
          .map((p) => `principio_a.eq.${p},principio_b.eq.${p}`)
          .join(","),
      );

    for (const i of interacoes ?? []) {
      const a = norm(i.principio_a);
      const b = norm(i.principio_b);
      if (principios.includes(a) && principios.includes(b)) {
        alertas.push({
          tipo: "interacao",
          severidade: i.severidade as Severidade,
          mensagem: `Interação ${i.severidade}: ${i.principio_a} × ${i.principio_b} — ${i.descricao}`,
          bloqueante: i.severidade === "contraindicada",
        });
      }
    }
  }

  return alertas;
}

export function temBloqueio(alertas: AlertaClinico[]): boolean {
  return alertas.some((a) => a.bloqueante);
}
