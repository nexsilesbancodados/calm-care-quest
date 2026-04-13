import { describe, expect, it } from "vitest";
import { maskCpf, maskEmail, maskNome, maskTelefone, sanitizeForLog } from "@/lib/security/pii";
import { consumeToken, resetRateLimit } from "@/lib/security/rateLimit";

describe("pii masking", () => {
  it("mascara CPF mantendo dígitos centrais", () => {
    expect(maskCpf("529.982.247-25")).toBe("***.982.247-**");
  });
  it("mascara email preservando domínio", () => {
    expect(maskEmail("paulo.souza@hospital.com.br")).toMatch(/^pa\*+@hospital\.com\.br$/);
  });
  it("mascara nome preservando primeiro e último", () => {
    expect(maskNome("João Pedro Almeida Souza")).toBe("João P. A. Souza");
  });
  it("mascara telefone DDD e últimos 4", () => {
    expect(maskTelefone("11987654321")).toBe("(11) *****-4321");
  });
  it("sanitiza chaves sensíveis em objetos aninhados", () => {
    const out = sanitizeForLog({
      nome: "Ana",
      cpf: "12345678901",
      nested: { email: "a@b.com", ok: 1 },
    });
    expect(out).toEqual({ nome: "Ana", cpf: "[REDACTED]", nested: { email: "[REDACTED]", ok: 1 } });
  });
});

describe("rate limit", () => {
  it("bloqueia após exceder cota", () => {
    resetRateLimit();
    for (let i = 0; i < 3; i++) expect(consumeToken("t1", 3)).toBe(true);
    expect(consumeToken("t1", 3)).toBe(false);
  });
});
