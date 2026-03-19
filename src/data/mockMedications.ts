import { Medication } from "@/types/medication";

export const mockMedications: Medication[] = [
  {
    id: "1", name: "Risperidona", genericName: "Risperidona", category: "antipsicótico",
    dosage: "2mg", form: "Comprimido", manufacturer: "EMS", batchNumber: "RP2024-001",
    expirationDate: "2026-08-15", currentStock: 450, minimumStock: 100, location: "A1-P3",
    controlledSubstance: true, notes: "Uso frequente na ala B", lastUpdated: "2026-03-18",
  },
  {
    id: "2", name: "Haloperidol", genericName: "Haloperidol", category: "antipsicótico",
    dosage: "5mg/ml", form: "Injetável", manufacturer: "Cristália", batchNumber: "HP2024-045",
    expirationDate: "2026-05-20", currentStock: 30, minimumStock: 50, location: "B2-G1",
    controlledSubstance: true, notes: "Reserva de emergência", lastUpdated: "2026-03-17",
  },
  {
    id: "3", name: "Fluoxetina", genericName: "Cloridrato de Fluoxetina", category: "antidepressivo",
    dosage: "20mg", form: "Cápsula", manufacturer: "Medley", batchNumber: "FX2024-112",
    expirationDate: "2027-01-10", currentStock: 800, minimumStock: 200, location: "A2-P1",
    controlledSubstance: true, notes: "", lastUpdated: "2026-03-15",
  },
  {
    id: "4", name: "Clonazepam", genericName: "Clonazepam", category: "ansiolítico",
    dosage: "2mg", form: "Comprimido", manufacturer: "Roche", batchNumber: "CZ2024-078",
    expirationDate: "2026-11-30", currentStock: 15, minimumStock: 80, location: "C1-P2",
    controlledSubstance: true, notes: "Controle rigoroso - Portaria 344", lastUpdated: "2026-03-18",
  },
  {
    id: "5", name: "Carbonato de Lítio", genericName: "Carbonato de Lítio", category: "estabilizador",
    dosage: "300mg", form: "Comprimido", manufacturer: "Eurofarma", batchNumber: "LT2024-033",
    expirationDate: "2026-09-25", currentStock: 320, minimumStock: 150, location: "A3-P1",
    controlledSubstance: true, notes: "Monitorar níveis séricos", lastUpdated: "2026-03-16",
  },
  {
    id: "6", name: "Carbamazepina", genericName: "Carbamazepina", category: "anticonvulsivante",
    dosage: "200mg", form: "Comprimido", manufacturer: "Novartis", batchNumber: "CB2024-090",
    expirationDate: "2027-03-01", currentStock: 500, minimumStock: 100, location: "A3-P2",
    controlledSubstance: true, notes: "", lastUpdated: "2026-03-14",
  },
  {
    id: "7", name: "Zolpidem", genericName: "Hemitartarato de Zolpidem", category: "hipnótico",
    dosage: "10mg", form: "Comprimido", manufacturer: "Sanofi", batchNumber: "ZP2024-056",
    expirationDate: "2026-07-12", currentStock: 0, minimumStock: 40, location: "C2-P1",
    controlledSubstance: true, notes: "Aguardando reposição", lastUpdated: "2026-03-18",
  },
  {
    id: "8", name: "Sertralina", genericName: "Cloridrato de Sertralina", category: "antidepressivo",
    dosage: "50mg", form: "Comprimido", manufacturer: "Pfizer", batchNumber: "SR2024-201",
    expirationDate: "2027-06-20", currentStock: 650, minimumStock: 150, location: "A2-P2",
    controlledSubstance: true, notes: "", lastUpdated: "2026-03-13",
  },
  {
    id: "9", name: "Olanzapina", genericName: "Olanzapina", category: "antipsicótico",
    dosage: "10mg", form: "Comprimido", manufacturer: "Lilly", batchNumber: "OZ2024-067",
    expirationDate: "2026-12-05", currentStock: 90, minimumStock: 80, location: "A1-P4",
    controlledSubstance: true, notes: "Alta demanda recente", lastUpdated: "2026-03-18",
  },
  {
    id: "10", name: "Diazepam", genericName: "Diazepam", category: "ansiolítico",
    dosage: "10mg", form: "Comprimido", manufacturer: "Roche", batchNumber: "DZ2024-134",
    expirationDate: "2026-06-30", currentStock: 45, minimumStock: 60, location: "C1-P3",
    controlledSubstance: true, notes: "Vencimento próximo - priorizar uso", lastUpdated: "2026-03-17",
  },
  {
    id: "11", name: "Quetiapina", genericName: "Fumarato de Quetiapina", category: "antipsicótico",
    dosage: "100mg", form: "Comprimido", manufacturer: "AstraZeneca", batchNumber: "QT2024-089",
    expirationDate: "2027-02-28", currentStock: 380, minimumStock: 120, location: "A1-P5",
    controlledSubstance: true, notes: "", lastUpdated: "2026-03-12",
  },
  {
    id: "12", name: "Clorpromazina", genericName: "Cloridrato de Clorpromazina", category: "antipsicótico",
    dosage: "25mg/5ml", form: "Gotas", manufacturer: "Cristália", batchNumber: "CP2024-023",
    expirationDate: "2026-04-15", currentStock: 12, minimumStock: 30, location: "B1-P1",
    controlledSubstance: true, notes: "⚠️ Vencimento muito próximo!", lastUpdated: "2026-03-18",
  },
];
