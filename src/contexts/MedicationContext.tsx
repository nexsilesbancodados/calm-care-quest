import { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { Medication, MedicationCategory, getStockStatus } from "@/types/medication";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MedicationContextType {
  medications: Medication[];
  loading: boolean;
  addMedication: (med: Omit<Medication, "id" | "lastUpdated">) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  getMedicationById: (id: string) => Medication | undefined;
  refetch: () => void;
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

function mapRow(row: any): Medication {
  return {
    id: row.id,
    name: row.name,
    genericName: row.generic_name,
    category: row.category as MedicationCategory,
    dosage: row.dosage,
    form: row.form,
    manufacturer: row.manufacturer,
    batchNumber: row.batch_number,
    expirationDate: row.expiration_date,
    currentStock: row.current_stock,
    minimumStock: row.minimum_stock,
    location: row.location,
    controlledSubstance: row.controlled_substance,
    notes: row.notes,
    lastUpdated: row.updated_at?.split("T")[0] || "",
  };
}

export function MedicationProvider({ children }: { children: React.ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedications = useCallback(async () => {
    const { data, error } = await supabase.from("medications").select("*").order("name");
    if (error) {
      console.error("Error fetching medications:", error);
      return;
    }
    setMedications((data || []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const addMedication = useCallback(async (med: Omit<Medication, "id" | "lastUpdated">) => {
    const { data, error } = await supabase.from("medications").insert({
      name: med.name,
      generic_name: med.genericName,
      category: med.category,
      dosage: med.dosage,
      form: med.form,
      manufacturer: med.manufacturer,
      batch_number: med.batchNumber,
      expiration_date: med.expirationDate,
      current_stock: med.currentStock,
      minimum_stock: med.minimumStock,
      location: med.location,
      controlled_substance: med.controlledSubstance,
      notes: med.notes,
    }).select().single();
    if (error) { toast.error("Erro ao adicionar medicamento"); return; }
    setMedications((prev) => [mapRow(data), ...prev]);
    toast.success("Medicamento adicionado!");
  }, []);

  const updateMedication = useCallback(async (id: string, updates: Partial<Medication>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.genericName !== undefined) dbUpdates.generic_name = updates.genericName;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.dosage !== undefined) dbUpdates.dosage = updates.dosage;
    if (updates.form !== undefined) dbUpdates.form = updates.form;
    if (updates.manufacturer !== undefined) dbUpdates.manufacturer = updates.manufacturer;
    if (updates.batchNumber !== undefined) dbUpdates.batch_number = updates.batchNumber;
    if (updates.expirationDate !== undefined) dbUpdates.expiration_date = updates.expirationDate;
    if (updates.currentStock !== undefined) dbUpdates.current_stock = updates.currentStock;
    if (updates.minimumStock !== undefined) dbUpdates.minimum_stock = updates.minimumStock;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.controlledSubstance !== undefined) dbUpdates.controlled_substance = updates.controlledSubstance;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase.from("medications").update(dbUpdates).eq("id", id);
    if (error) { toast.error("Erro ao atualizar medicamento"); return; }
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates, lastUpdated: new Date().toISOString().split("T")[0] } : m))
    );
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir medicamento"); return; }
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const adjustStock = useCallback(async (id: string, delta: number) => {
    const med = medications.find((m) => m.id === id);
    if (!med) return;
    const newStock = Math.max(0, med.currentStock + delta);
    const { error } = await supabase.from("medications").update({ current_stock: newStock }).eq("id", id);
    if (error) { toast.error("Erro ao ajustar estoque"); return; }
    setMedications((prev) =>
      prev.map((m) => m.id === id ? { ...m, currentStock: newStock, lastUpdated: new Date().toISOString().split("T")[0] } : m)
    );
  }, [medications]);

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
    <MedicationContext.Provider value={{ medications, loading, addMedication, updateMedication, deleteMedication, adjustStock, getMedicationById, refetch: fetchMedications, stats, alertCount }}>
      {children}
    </MedicationContext.Provider>
  );
}

export const useMedicationContext = () => useContext(MedicationContext);
