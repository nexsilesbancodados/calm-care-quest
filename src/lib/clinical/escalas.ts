// Definição compacta das escalas psiquiátricas suportadas.
// Em produção, revisar com equipe clínica. Estas definições são resumos
// clinicamente aceitos mas simplificados — validar com psiquiatra antes do uso real.

export type EscalaKey = "PANSS" | "HAMD" | "BDI" | "YMRS" | "AIMS" | "HAMA" | "MMSE";

export interface EscalaItem {
  id: string;
  label: string;
  max: number;
  min?: number;
}

export interface EscalaDef {
  key: EscalaKey;
  nome: string;
  descricao: string;
  itens: EscalaItem[];
  min: number;
  max: number;
  classificar: (escore: number) => string;
}

const r0a7 = (n: number, label: string): EscalaItem => ({ id: `q${n}`, label, max: 7, min: 1 });
const r0a4 = (n: number, label: string): EscalaItem => ({ id: `q${n}`, label, max: 4, min: 0 });
const r0a6 = (n: number, label: string): EscalaItem => ({ id: `q${n}`, label, max: 6, min: 0 });
const r0a3 = (n: number, label: string): EscalaItem => ({ id: `q${n}`, label, max: 3, min: 0 });

// PANSS — subescala positiva (7 itens, 1-7). Versão reduzida.
const PANSS: EscalaDef = {
  key: "PANSS",
  nome: "PANSS (subescala positiva)",
  descricao: "Sintomas positivos da esquizofrenia — 7 itens (1=ausente, 7=extremo)",
  itens: [
    r0a7(1, "Delírios"),
    r0a7(2, "Desorganização conceitual"),
    r0a7(3, "Comportamento alucinatório"),
    r0a7(4, "Excitação"),
    r0a7(5, "Grandiosidade"),
    r0a7(6, "Desconfiança/perseguição"),
    r0a7(7, "Hostilidade"),
  ],
  min: 7,
  max: 49,
  classificar: (e) =>
    e <= 14 ? "mínimo" : e <= 21 ? "leve" : e <= 28 ? "moderado" : e <= 35 ? "marcado" : "grave",
};

// HAM-D 17 itens — depressão
const HAMD: EscalaDef = {
  key: "HAMD",
  nome: "Hamilton Depression Rating (HAM-D 17)",
  descricao: "Escore 0–52 · <7 remissão · 8–13 leve · 14–18 moderada · 19–22 grave · ≥23 muito grave",
  itens: [
    r0a4(1, "Humor deprimido"),
    r0a4(2, "Sentimentos de culpa"),
    r0a4(3, "Suicídio"),
    { id: "q4", label: "Insônia inicial", max: 2, min: 0 },
    { id: "q5", label: "Insônia intermediária", max: 2, min: 0 },
    { id: "q6", label: "Insônia tardia", max: 2, min: 0 },
    r0a4(7, "Trabalho e atividades"),
    r0a4(8, "Retardo psicomotor"),
    r0a4(9, "Agitação"),
    r0a4(10, "Ansiedade psíquica"),
    r0a4(11, "Ansiedade somática"),
    { id: "q12", label: "Sintomas somáticos (GI)", max: 2, min: 0 },
    r0a4(13, "Sintomas somáticos gerais"),
    { id: "q14", label: "Sintomas genitais", max: 2, min: 0 },
    r0a4(15, "Hipocondria"),
    { id: "q16", label: "Perda de peso", max: 2, min: 0 },
    { id: "q17", label: "Insight", max: 2, min: 0 },
  ],
  min: 0,
  max: 52,
  classificar: (e) =>
    e < 8 ? "remissão" : e <= 13 ? "leve" : e <= 18 ? "moderada" : e <= 22 ? "grave" : "muito grave",
};

// BDI-II simplificado (21 itens, 0-3)
const BDI: EscalaDef = {
  key: "BDI",
  nome: "Beck Depression Inventory (BDI-II)",
  descricao: "Escore 0–63 · 0–13 mínima · 14–19 leve · 20–28 moderada · 29–63 grave",
  itens: Array.from({ length: 21 }).map((_, i) => r0a3(i + 1, `Item ${i + 1}`)),
  min: 0,
  max: 63,
  classificar: (e) =>
    e <= 13 ? "mínima" : e <= 19 ? "leve" : e <= 28 ? "moderada" : "grave",
};

// YMRS — mania (11 itens)
const YMRS: EscalaDef = {
  key: "YMRS",
  nome: "Young Mania Rating Scale (YMRS)",
  descricao: "Escore 0–60 · <12 eutimia · 12–20 hipomania · 21–30 mania · >30 mania grave",
  itens: [
    r0a4(1, "Humor elevado"),
    r0a4(2, "Atividade motora/energia aumentada"),
    r0a4(3, "Interesse sexual"),
    r0a4(4, "Sono"),
    r0a4(5, "Irritabilidade"),
    { id: "q6", label: "Fala (velocidade e quantidade)", max: 8, min: 0 },
    r0a4(7, "Linguagem/distúrbios do pensamento"),
    { id: "q8", label: "Conteúdo do pensamento", max: 8, min: 0 },
    { id: "q9", label: "Comportamento disruptivo/agressivo", max: 8, min: 0 },
    r0a4(10, "Aparência"),
    r0a4(11, "Insight"),
  ],
  min: 0,
  max: 60,
  classificar: (e) =>
    e < 12 ? "eutimia" : e <= 20 ? "hipomania" : e <= 30 ? "mania" : "mania grave",
};

// AIMS — discinesia tardia (12 itens, 0-4)
const AIMS: EscalaDef = {
  key: "AIMS",
  nome: "Abnormal Involuntary Movement Scale (AIMS)",
  descricao: "Avaliação de movimentos involuntários (discinesia tardia)",
  itens: [
    r0a4(1, "Músculos da face"),
    r0a4(2, "Lábios e área perioral"),
    r0a4(3, "Mandíbula"),
    r0a4(4, "Língua"),
    r0a4(5, "MMSS (braços, mãos, dedos)"),
    r0a4(6, "MMII (pernas, joelhos, pés)"),
    r0a4(7, "Tronco (pescoço, ombros, quadris)"),
    r0a4(8, "Gravidade global"),
    r0a4(9, "Incapacitação pelos movimentos"),
    r0a4(10, "Consciência do paciente"),
    r0a4(11, "Dentição atual"),
    r0a4(12, "Usa prótese dentária"),
  ],
  min: 0,
  max: 40,
  classificar: (e) => (e < 2 ? "normal" : e <= 4 ? "leve" : e <= 8 ? "moderada" : "grave"),
};

// HAM-A — ansiedade (14 itens, 0-4)
const HAMA: EscalaDef = {
  key: "HAMA",
  nome: "Hamilton Anxiety Rating (HAM-A)",
  descricao: "Escore 0–56 · <17 leve · 18–24 moderada · 25–30 grave · >30 muito grave",
  itens: Array.from({ length: 14 }).map((_, i) => r0a4(i + 1, `Item ${i + 1}`)),
  min: 0,
  max: 56,
  classificar: (e) =>
    e < 18 ? "leve" : e <= 24 ? "moderada" : e <= 30 ? "grave" : "muito grave",
};

// MMSE simplificado (0-30)
const MMSE: EscalaDef = {
  key: "MMSE",
  nome: "Mini Exame do Estado Mental (MMSE)",
  descricao: "Escore 0–30 · ajustar por escolaridade · <24 sugere déficit",
  itens: [
    r0a6(1, "Orientação temporal (5)"),
    r0a6(2, "Orientação espacial (5)"),
    r0a3(3, "Registro (3)"),
    r0a6(4, "Atenção e cálculo (5)"),
    r0a3(5, "Evocação (3)"),
    r0a6(6, "Linguagem (8)"),
    r0a3(7, "Cópia de desenho (1)"),
  ],
  min: 0,
  max: 30,
  classificar: (e) => (e < 24 ? "sugere déficit" : "dentro da normalidade"),
};

export const ESCALAS: Record<EscalaKey, EscalaDef> = {
  PANSS, HAMD, BDI, YMRS, AIMS, HAMA, MMSE,
};

export function calcularEscore(defKey: EscalaKey, respostas: Record<string, number>): number {
  const def = ESCALAS[defKey];
  return def.itens.reduce((sum, it) => sum + (respostas[it.id] ?? 0), 0);
}
