import { describe, expect, it } from "vitest";
import { temBloqueio, type AlertaClinico } from "@/lib/clinical/interacoes";

describe("temBloqueio", () => {
  it("bloqueia quando há alerta bloqueante", () => {
    const alertas: AlertaClinico[] = [
      { tipo: "alergia", severidade: "anafilatica", mensagem: "x", bloqueante: true },
    ];
    expect(temBloqueio(alertas)).toBe(true);
  });

  it("não bloqueia quando só há alertas leves", () => {
    const alertas: AlertaClinico[] = [
      { tipo: "interacao", severidade: "moderada", mensagem: "x", bloqueante: false },
      { tipo: "duplicidade", severidade: "leve", mensagem: "x", bloqueante: false },
    ];
    expect(temBloqueio(alertas)).toBe(false);
  });

  it("lista vazia não bloqueia", () => {
    expect(temBloqueio([])).toBe(false);
  });
});
