import { z } from "zod";
import {
  precoSchema,
  quantidadePositivaSchema,
  textoSeguroSchema,
  uuidSchema,
} from "./common";

export const medicamentoSchema = z
  .object({
    nome: textoSeguroSchema(2, 200),
    generico: textoSeguroSchema(2, 200),
    principio_ativo: textoSeguroSchema(2, 200),
    concentracao: textoSeguroSchema(1, 50),
    forma_farmaceutica: textoSeguroSchema(1, 100),
    codigo_barras: z
      .string()
      .trim()
      .regex(/^\d{8,14}$/, "Código de barras deve ter 8 a 14 dígitos")
      .nullable()
      .optional(),
    categoria_id: uuidSchema.nullable().optional(),
    controlado: z.boolean().default(false),
    lista_controlada: z
      .enum(["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C3", "C4", "C5"])
      .nullable()
      .optional(),
    fornecedor_id: uuidSchema.nullable().optional(),
    estoque_minimo: z.number().int().nonnegative().max(1_000_000),
    estoque_maximo: z.number().int().nonnegative().max(1_000_000),
    localizacao: textoSeguroSchema(0, 100).optional().default(""),
    preco_unitario: precoSchema,
    ativo: z.boolean().default(true),
  })
  .refine((v) => v.estoque_maximo >= v.estoque_minimo, {
    message: "Estoque máximo deve ser ≥ mínimo",
    path: ["estoque_maximo"],
  })
  .refine((v) => !v.controlado || !!v.lista_controlada, {
    message: "Medicamento controlado exige classificação (Portaria 344/98)",
    path: ["lista_controlada"],
  });

export type MedicamentoInput = z.infer<typeof medicamentoSchema>;

export const loteSchema = z
  .object({
    medicamento_id: uuidSchema,
    numero_lote: textoSeguroSchema(1, 50),
    validade: z.string().refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
    }, "Validade deve ser futura"),
    quantidade_atual: quantidadePositivaSchema,
    preco_unitario: precoSchema,
  });

export type LoteInput = z.infer<typeof loteSchema>;
