import { z } from "zod";
import { dataISOSchema, quantidadePositivaSchema, textoSeguroSchema, uuidSchema } from "./common";

export const itemPrescricaoSchema = z.object({
  medicamento_id: uuidSchema,
  quantidade_prescrita: quantidadePositivaSchema.max(10_000, "Quantidade fora da faixa segura"),
  posologia: textoSeguroSchema(3, 500),
  dose: textoSeguroSchema(1, 50),
  via: z.enum(["oral", "sublingual", "IM", "IV", "SC", "retal", "topica", "inalatoria", "outra"]),
  frequencia_horas: z.number().int().positive().max(48),
  duracao_dias: z.number().int().positive().max(365),
  se_necessario: z.boolean().default(false),
});

export type ItemPrescricaoInput = z.infer<typeof itemPrescricaoSchema>;

export const prescricaoSchema = z.object({
  numero_receita: textoSeguroSchema(1, 50),
  paciente_id: uuidSchema,
  medico: textoSeguroSchema(3, 200),
  crm: z
    .string()
    .trim()
    .regex(/^\d{4,7}\/[A-Z]{2}$/, "CRM deve ser NNNN/UF (ex: 12345/SP)"),
  setor: textoSeguroSchema(1, 100),
  data_prescricao: dataISOSchema,
  validade_dias: z.number().int().positive().max(180),
  observacao: textoSeguroSchema(0, 2000).optional().default(""),
  itens: z.array(itemPrescricaoSchema).min(1, "Prescrição precisa de ao menos 1 item").max(50),
});

export type PrescricaoInput = z.infer<typeof prescricaoSchema>;

// Dispensação exige double-check (2 profissionais) para controlados
export const dispensacaoSchema = z
  .object({
    prescricao_id: uuidSchema,
    item_id: uuidSchema,
    lote_id: uuidSchema,
    quantidade: quantidadePositivaSchema,
    farmaceutico_id: uuidSchema,
    conferente_id: uuidSchema.nullable().optional(),
    requer_double_check: z.boolean().default(false),
    observacao: textoSeguroSchema(0, 1000).optional().default(""),
  })
  .refine((v) => !v.requer_double_check || (!!v.conferente_id && v.conferente_id !== v.farmaceutico_id), {
    message: "Dispensação de controlado exige 2º profissional distinto como conferente",
    path: ["conferente_id"],
  });

export type DispensacaoInput = z.infer<typeof dispensacaoSchema>;
