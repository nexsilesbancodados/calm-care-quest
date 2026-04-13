import { describe, expect, it } from "vitest";
import { cnpjSchema, cpfSchema, senhaSchema } from "@/lib/schemas/common";
import { medicamentoSchema } from "@/lib/schemas/medicamento";
import { calcularRiscoCssrs, pacienteSchema } from "@/lib/schemas/paciente";
import { dispensacaoSchema, prescricaoSchema } from "@/lib/schemas/prescricao";

describe("schemas/common", () => {
  it("aceita CPF válido e rejeita inválido", () => {
    expect(cpfSchema.safeParse("529.982.247-25").success).toBe(true);
    expect(cpfSchema.safeParse("111.111.111-11").success).toBe(false);
    expect(cpfSchema.safeParse("123").success).toBe(false);
  });

  it("aceita CNPJ válido e rejeita inválido", () => {
    expect(cnpjSchema.safeParse("11.222.333/0001-81").success).toBe(true);
    expect(cnpjSchema.safeParse("00.000.000/0000-00").success).toBe(false);
  });

  it("exige senha forte (12+ com maiúscula, número, especial)", () => {
    expect(senhaSchema.safeParse("senha123").success).toBe(false);
    expect(senhaSchema.safeParse("SenhaForte@2026").success).toBe(true);
  });
});

describe("schemas/medicamento", () => {
  const base = {
    nome: "Clozapina",
    generico: "Clozapina",
    principio_ativo: "Clozapina",
    concentracao: "100mg",
    forma_farmaceutica: "Comprimido",
    estoque_minimo: 10,
    estoque_maximo: 100,
    preco_unitario: 2.5,
  };

  it("aceita medicamento válido", () => {
    expect(medicamentoSchema.safeParse(base).success).toBe(true);
  });

  it("controlado exige lista 344/98", () => {
    const r = medicamentoSchema.safeParse({ ...base, controlado: true });
    expect(r.success).toBe(false);
    const ok = medicamentoSchema.safeParse({ ...base, controlado: true, lista_controlada: "C1" });
    expect(ok.success).toBe(true);
  });

  it("estoque máximo não pode ser menor que mínimo", () => {
    const r = medicamentoSchema.safeParse({ ...base, estoque_minimo: 50, estoque_maximo: 10 });
    expect(r.success).toBe(false);
  });
});

describe("schemas/paciente + C-SSRS", () => {
  it("exige consentimento LGPD", () => {
    const r = pacienteSchema.safeParse({
      nome: "Teste",
      prontuario: "123",
      data_nascimento: "1990-01-01",
      sexo: "M",
      setor: "UPI",
      filial_id: "00000000-0000-0000-0000-000000000001",
      consentimento_lgpd: false,
    });
    expect(r.success).toBe(false);
  });

  it("classifica risco suicida (alto quando plano)", () => {
    const risco = calcularRiscoCssrs({
      paciente_id: "00000000-0000-0000-0000-000000000001",
      data_avaliacao: new Date().toISOString(),
      q1_desejo_morto: true,
      q2_ideacao_suicida: true,
      q3_ideacao_com_metodo: true,
      q4_ideacao_com_intencao: true,
      q5_ideacao_com_plano: true,
      q6_comportamento_30d: false,
      q6_comportamento_vida: false,
      avaliador_id: "00000000-0000-0000-0000-000000000002",
      observacao: "",
    });
    expect(risco).toBe("alto");
  });
});

describe("schemas/prescricao", () => {
  it("dispensação de controlado exige conferente distinto", () => {
    const farm = "00000000-0000-0000-0000-000000000001";
    const mesmoFarm = {
      prescricao_id: "00000000-0000-0000-0000-000000000010",
      item_id: "00000000-0000-0000-0000-000000000011",
      lote_id: "00000000-0000-0000-0000-000000000012",
      quantidade: 1,
      farmaceutico_id: farm,
      conferente_id: farm,
      requer_double_check: true,
    };
    expect(dispensacaoSchema.safeParse(mesmoFarm).success).toBe(false);

    const conferenteOk = dispensacaoSchema.safeParse({
      ...mesmoFarm,
      conferente_id: "00000000-0000-0000-0000-000000000002",
    });
    expect(conferenteOk.success).toBe(true);
  });

  it("prescrição exige ao menos 1 item", () => {
    const r = prescricaoSchema.safeParse({
      numero_receita: "R-001",
      paciente_id: "00000000-0000-0000-0000-000000000001",
      medico: "Dr House",
      crm: "12345/SP",
      setor: "UPI",
      data_prescricao: new Date().toISOString(),
      validade_dias: 30,
      itens: [],
    });
    expect(r.success).toBe(false);
  });
});
