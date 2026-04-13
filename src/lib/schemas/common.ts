import { z } from "zod";

export const uuidSchema = z.string().uuid("ID inválido");

export const cnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 14, "CNPJ deve ter 14 dígitos")
  .refine(isValidCnpj, "CNPJ inválido");

export const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 11, "CPF deve ter 11 dígitos")
  .refine(isValidCpf, "CPF inválido");

export const cnesSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 7, "CNES deve ter 7 dígitos");

export const telefoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length >= 10 && v.length <= 11, "Telefone inválido");

export const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido");

export const senhaSchema = z
  .string()
  .min(12, "Mínimo 12 caracteres")
  .regex(/[A-Z]/, "Precisa de letra maiúscula")
  .regex(/[a-z]/, "Precisa de letra minúscula")
  .regex(/[0-9]/, "Precisa de número")
  .regex(/[^A-Za-z0-9]/, "Precisa de caractere especial");

export const dataISOSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida");

export const dataFuturaSchema = dataISOSchema.refine(
  (v) => new Date(v).getTime() > Date.now(),
  "Data deve ser futura",
);

export const quantidadePositivaSchema = z
  .number({ invalid_type_error: "Quantidade inválida" })
  .int("Quantidade deve ser inteira")
  .positive("Quantidade deve ser maior que zero");

export const precoSchema = z
  .number({ invalid_type_error: "Preço inválido" })
  .nonnegative("Preço não pode ser negativo")
  .max(1_000_000, "Preço fora da faixa aceitável");

// PII sanitization — remove caracteres de controle e normaliza whitespace
export const textoSeguroSchema = (min = 1, max = 500) =>
  z
    .string()
    .trim()
    .min(min, `Mínimo ${min} caractere(s)`)
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " "));

function isValidCpf(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(cpf[i]) * (slice + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (slice: number) => {
    const weights =
      slice === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(cnpj[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}
