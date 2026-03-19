export type MedicationCategory = 
  | "antipsicótico"
  | "antidepressivo"
  | "ansiolítico"
  | "estabilizador"
  | "anticonvulsivante"
  | "hipnótico"
  | "outro";

export type StockStatus = "normal" | "baixo" | "crítico" | "esgotado";

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  category: MedicationCategory;
  dosage: string;
  form: string; // comprimido, injetável, solução oral, etc.
  manufacturer: string;
  batchNumber: string;
  expirationDate: string;
  currentStock: number;
  minimumStock: number;
  location: string; // prateleira/armário
  controlledSubstance: boolean;
  notes: string;
  lastUpdated: string;
}

export const CATEGORIES: { value: MedicationCategory; label: string; color: string }[] = [
  { value: "antipsicótico", label: "Antipsicótico", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "antidepressivo", label: "Antidepressivo", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "ansiolítico", label: "Ansiolítico", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "estabilizador", label: "Estabilizador de Humor", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "anticonvulsivante", label: "Anticonvulsivante", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "hipnótico", label: "Hipnótico/Sedativo", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "outro", label: "Outro", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

export const FORMS = [
  "Comprimido",
  "Cápsula",
  "Solução Oral",
  "Injetável",
  "Gotas",
  "Comprimido Sublingual",
  "Adesivo Transdérmico",
  "Suspensão",
];

export function getStockStatus(current: number, minimum: number): StockStatus {
  if (current === 0) return "esgotado";
  if (current <= minimum * 0.3) return "crítico";
  if (current <= minimum) return "baixo";
  return "normal";
}

export function getStockStatusConfig(status: StockStatus) {
  const map = {
    normal: { label: "Normal", className: "bg-success/10 text-success border-success/20" },
    baixo: { label: "Baixo", className: "bg-warning/10 text-warning border-warning/20" },
    crítico: { label: "Crítico", className: "bg-destructive/10 text-destructive border-destructive/20" },
    esgotado: { label: "Esgotado", className: "bg-muted text-muted-foreground border-border" },
  };
  return map[status];
}
