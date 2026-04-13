import { z } from "zod";
import { cpfSchema, dataISOSchema, telefoneSchema, textoSeguroSchema, uuidSchema } from "./common";

export const pacienteSchema = z.object({
  nome: textoSeguroSchema(2, 200),
  prontuario: textoSeguroSchema(1, 50),
  cpf: cpfSchema.nullable().optional(),
  data_nascimento: dataISOSchema.refine(
    (v) => new Date(v).getTime() < Date.now(),
    "Data de nascimento deve ser passada",
  ),
  sexo: z.enum(["M", "F", "outro"]),
  setor: textoSeguroSchema(1, 100),
  leito: textoSeguroSchema(0, 20).optional().default(""),
  diagnostico_cid10: z
    .string()
    .trim()
    .regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, "CID-10 inválido (ex: F20.0)")
    .nullable()
    .optional(),
  alergias: z.array(textoSeguroSchema(1, 200)).max(50).default([]),
  responsavel_nome: textoSeguroSchema(0, 200).optional().default(""),
  responsavel_telefone: telefoneSchema.nullable().optional(),
  filial_id: uuidSchema,
  ativo: z.boolean().default(true),
  consentimento_lgpd: z.boolean().refine((v) => v === true, {
    message: "Consentimento LGPD obrigatório",
  }),
});

export type PacienteInput = z.infer<typeof pacienteSchema>;

// Escala Columbia para risco suicida (C-SSRS) — screener simplificado
export const cssrsSchema = z.object({
  paciente_id: uuidSchema,
  data_avaliacao: dataISOSchema,
  q1_desejo_morto: z.boolean(),
  q2_ideacao_suicida: z.boolean(),
  q3_ideacao_com_metodo: z.boolean(),
  q4_ideacao_com_intencao: z.boolean(),
  q5_ideacao_com_plano: z.boolean(),
  q6_comportamento_30d: z.boolean(),
  q6_comportamento_vida: z.boolean(),
  avaliador_id: uuidSchema,
  observacao: textoSeguroSchema(0, 2000).optional().default(""),
});

export type CssrsInput = z.infer<typeof cssrsSchema>;

export function calcularRiscoCssrs(input: CssrsInput): "baixo" | "moderado" | "alto" {
  if (input.q6_comportamento_30d || input.q5_ideacao_com_plano || input.q4_ideacao_com_intencao)
    return "alto";
  if (input.q3_ideacao_com_metodo || input.q6_comportamento_vida) return "moderado";
  return "baixo";
}
