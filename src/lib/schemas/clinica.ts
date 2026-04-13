import { z } from "zod";
import { textoSeguroSchema, uuidSchema } from "./common";

export const contencaoSchema = z.object({
  paciente_id: uuidSchema,
  tipo: z.enum(["fisica", "quimica", "ambiental"]),
  motivo: textoSeguroSchema(5, 500),
  descricao_metodo: textoSeguroSchema(5, 1000),
  inicio: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida"),
  prescritor_id: uuidSchema.nullable().optional(),
  crm_prescritor: z
    .string()
    .regex(/^\d{4,7}\/[A-Z]{2}$/, "CRM deve ser NNNN/UF")
    .nullable()
    .optional(),
  medicamento_id: uuidSchema.nullable().optional(),
  dose: textoSeguroSchema(0, 50).optional().default(""),
  via: z
    .enum(["oral", "sublingual", "IM", "IV", "SC", "retal", "topica", "inalatoria", "outra"])
    .optional(),
});
export type ContencaoInput = z.infer<typeof contencaoSchema>;

export const evolucaoEnfermagemSchema = z.object({
  paciente_id: uuidSchema,
  turno: z.enum(["M", "T", "N"]),
  exame_fisico: textoSeguroSchema(0, 3000).optional().default(""),
  queixas: textoSeguroSchema(0, 2000).optional().default(""),
  sinais_vitais: z
    .object({
      pa: z.string().optional(),
      fc: z.number().int().optional(),
      fr: z.number().int().optional(),
      temp: z.number().optional(),
      spo2: z.number().int().min(0).max(100).optional(),
    })
    .default({}),
  diagnosticos_enfermagem: z.array(z.string()).max(20).default([]),
  intervencoes: z.array(z.string()).max(30).default([]),
  comportamento: textoSeguroSchema(0, 2000).optional().default(""),
  risco_suicida: z.enum(["baixo", "moderado", "alto"]).optional(),
  risco_queda: z.enum(["baixo", "moderado", "alto"]).optional(),
});
export type EvolucaoEnfermagemInput = z.infer<typeof evolucaoEnfermagemSchema>;

export const planoSegurancaSchema = z.object({
  paciente_id: uuidSchema,
  gatilhos: z.array(textoSeguroSchema(1, 200)).max(20).default([]),
  sinais_alerta: z.array(textoSeguroSchema(1, 200)).max(20).default([]),
  estrategias_internas: z.array(textoSeguroSchema(1, 300)).max(20).default([]),
  contatos_apoio: z
    .array(
      z.object({
        nome: textoSeguroSchema(1, 200),
        telefone: z.string().max(20),
        relacao: textoSeguroSchema(0, 50).optional().default(""),
      }),
    )
    .max(10)
    .default([]),
  acoes_ambiente: textoSeguroSchema(0, 1000).optional().default(""),
  revisao_em: z.string().nullable().optional(),
});
export type PlanoSegurancaInput = z.infer<typeof planoSegurancaSchema>;
