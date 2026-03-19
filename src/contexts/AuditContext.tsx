import { createContext, useContext, useState, useCallback } from "react";

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  severity: "info" | "warning" | "critical";
}

interface AuditContextType {
  entries: AuditEntry[];
  log: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;
}

const AuditContext = createContext<AuditContextType>({ entries: [], log: () => {} });

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<AuditEntry[]>([
    { id: "a1", timestamp: "2026-03-19T08:12:00", userId: "u1", userName: "Dr. Carlos Mendes", action: "Login", module: "Autenticação", details: "Login realizado com sucesso", severity: "info" },
    { id: "a2", timestamp: "2026-03-19T08:15:00", userId: "u1", userName: "Dr. Carlos Mendes", action: "Dispensação", module: "Movimentações", details: "30 un. Risperidona 2mg para Paciente #1042", severity: "info" },
    { id: "a3", timestamp: "2026-03-18T14:30:00", userId: "u2", userName: "Farm. João Santos", action: "Entrada de Estoque", module: "Movimentações", details: "100 un. Haloperidol 5mg/ml — NF 45892", severity: "info" },
    { id: "a4", timestamp: "2026-03-18T10:00:00", userId: "u1", userName: "Dr. Carlos Mendes", action: "Edição de Medicamento", module: "Medicamentos", details: "Atualização de estoque mínimo Clonazepam 2mg", severity: "warning" },
    { id: "a5", timestamp: "2026-03-17T16:45:00", userId: "u2", userName: "Farm. João Santos", action: "Transferência", module: "Transferências", details: "40 un. Zolpidem 10mg → Farmácia Central", severity: "info" },
    { id: "a6", timestamp: "2026-03-17T09:20:00", userId: "u1", userName: "Dr. Carlos Mendes", action: "Exclusão", module: "Fornecedores", details: "Fornecedor Sanofi-Aventis desativado", severity: "critical" },
    { id: "a7", timestamp: "2026-03-16T11:00:00", userId: "u1", userName: "Dr. Carlos Mendes", action: "Convite de Usuário", module: "Configurações", details: "Enf. Ana Costa convidada como Farmacêutica", severity: "warning" },
  ]);

  const log = useCallback((entry: Omit<AuditEntry, "id" | "timestamp">) => {
    setEntries((prev) => [{
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  return (
    <AuditContext.Provider value={{ entries, log }}>
      {children}
    </AuditContext.Provider>
  );
}

export const useAudit = () => useContext(AuditContext);
