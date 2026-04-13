// Mascaramento de PII para logs, exports e visualização restrita.
// Nunca logar PII em claro — usar mask* antes de enviar a Sentry, console, etc.

export function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***";
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function maskCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return "***";
  return `**.***.${d.slice(5, 8)}/${d.slice(8, 12)}-**`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  const head = user.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export function maskNome(nome: string | null | undefined): string {
  if (!nome) return "";
  const parts = nome.trim().split(/\s+/);
  return parts.map((p, i) => (i === 0 || i === parts.length - 1 ? p : `${p[0]}.`)).join(" ");
}

export function maskTelefone(tel: string | null | undefined): string {
  if (!tel) return "";
  const d = tel.replace(/\D/g, "");
  if (d.length < 10) return "***";
  return `(${d.slice(0, 2)}) *****-${d.slice(-4)}`;
}

// Remove campos sensíveis de objetos antes de logar
const PII_KEYS = new Set([
  "cpf", "cnpj", "rg", "passaporte", "email", "telefone", "celular",
  "senha", "password", "token", "authorization", "cookie",
  "endereco", "cep", "diagnostico", "cid10", "prontuario_numero",
  "responsavel_cpf", "concedido_por_cpf",
]);

export function sanitizeForLog<T>(value: T): T {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitizeForLog) as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = PII_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : sanitizeForLog(v);
    }
    return out as T;
  }
  return value;
}
