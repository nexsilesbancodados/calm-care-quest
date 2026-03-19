import { useState, useMemo } from "react";
import { Medication, MedicationCategory, getStockStatus } from "@/types/medication";
import { mockMedications } from "@/data/mockMedications";

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>(mockMedications);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MedicationCategory | "all">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "normal" | "baixo" | "crítico" | "esgotado">("all");

  const filtered = useMemo(() => {
    return medications.filter((med) => {
      const matchesSearch =
        !searchQuery ||
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || med.category === categoryFilter;
      const matchesStock = stockFilter === "all" || getStockStatus(med.currentStock, med.minimumStock) === stockFilter;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [medications, searchQuery, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const total = medications.length;
    const lowStock = medications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "baixo").length;
    const critical = medications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "crítico").length;
    const outOfStock = medications.filter((m) => getStockStatus(m.currentStock, m.minimumStock) === "esgotado").length;
    const expiringSoon = medications.filter((m) => {
      const exp = new Date(m.expirationDate);
      const now = new Date();
      const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 60 && diff > 0;
    }).length;
    const controlled = medications.filter((m) => m.controlledSubstance).length;
    return { total, lowStock, critical, outOfStock, expiringSoon, controlled };
  }, [medications]);

  const addMedication = (med: Omit<Medication, "id" | "lastUpdated">) => {
    const newMed: Medication = { ...med, id: crypto.randomUUID(), lastUpdated: new Date().toISOString().split("T")[0] };
    setMedications((prev) => [newMed, ...prev]);
  };

  const updateMedication = (id: string, updates: Partial<Medication>) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates, lastUpdated: new Date().toISOString().split("T")[0] } : m))
    );
  };

  const deleteMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  return {
    medications: filtered,
    allMedications: medications,
    stats,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    stockFilter, setStockFilter,
    addMedication, updateMedication, deleteMedication,
  };
}
