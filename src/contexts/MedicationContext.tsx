import { createContext, useContext, useState, useMemo, useCallback } from "react";
import { Medication, MedicationCategory, getStockStatus } from "@/types/medication";
import { mockMedications } from "@/data/mockMedications";

interface MedicationContextType {
  medications: Medication[];
  addMedication: (med: Omit<Medication, "id" | "lastUpdated">) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  getMedicationById: (id: string) => Medication | undefined;
  stats: {
    total: number;
    lowStock: number;
    critical: number;
    outOfStock: number;
    expiringSoon: number;
    controlled: number;
  };
  alertCount: number;
}

const MedicationContext = createContext<MedicationContextType>(null!);

export function MedicationProvider({ children }: { children: React.ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>(mockMedications);

  const addMedication = useCallback((med: Omit<Medication, "id" | "lastUpdated">) => {
    const newMed: Medication = { ...med, id: crypto.randomUUID(), lastUpdated: new Date().toISOString().split("T")[0] };
    setMedications((prev) => [newMed, ...prev]);
  }, []);

  const updateMedication = useCallback((id: string, updates: Partial<Medication>) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates, lastUpdated: new Date().toISOString().split("T")[0] } : m))
    );
  }, []);

  const deleteMedication = useCallback((id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const adjustStock = useCallback((id: string, delta: number) => {
    setMedications((prev) =>
      prev.map((m) => m.id === id ? { ...m, currentStock: Math.max(0, m.currentStock + delta), lastUpdated: new Date().toISOString().split("T")[0] } : m)
    );
  }, []);

  const getMedicationById = useCallback((id: string) => {
    return medications.find((m) => m.id === id);
  }, [medications]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: medications.length,
      lowStock: medications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "baixo").length,
      critical: medications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "crítico").length,
      outOfStock: medications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "esgotado").length,
      expiringSoon: medications.filter((m) => {
        const diff = (new Date(m.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 60 && diff > 0;
      }).length,
      controlled: medications.filter((m) => m.controlledSubstance).length,
    };
  }, [medications]);

  const alertCount = useMemo(() => {
    const now = new Date();
    let count = 0;
    medications.forEach((m) => {
      const status = getStockStatus(m.currentStock, m.minimumStock);
      if (status === "esgotado" || status === "crítico") count++;
      const diff = (new Date(m.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 60) count++;
    });
    return count;
  }, [medications]);

  return (
    <MedicationContext.Provider value={{ medications, addMedication, updateMedication, deleteMedication, adjustStock, getMedicationById, stats, alertCount }}>
      {children}
    </MedicationContext.Provider>
  );
}

export const useMedicationContext = () => useContext(MedicationContext);
