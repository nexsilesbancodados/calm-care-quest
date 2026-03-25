import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  loading: boolean;
}

const AuditContext = createContext<AuditContextType>({ entries: [], log: () => {}, loading: true });

function mapRow(row: any): AuditEntry {
  return {
    id: row.id,
    timestamp: row.created_at,
    userId: row.user_name || "",
    userName: row.user_name,
    action: row.action,
    module: row.entity,
    details: row.details,
    severity: "info",
  };
}

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100);
      if (data) setEntries(data.map(mapRow));
      setLoading(false);
    };
    fetch();
  }, []);

  const log = useCallback(async (entry: Omit<AuditEntry, "id" | "timestamp">) => {
    const row = {
      action: entry.action,
      entity: entry.module,
      details: entry.details,
      user_name: entry.userName,
      user_email: "",
    };
    const { data, error } = await supabase.from("audit_log").insert(row).select().single();
    if (!error && data) {
      setEntries((prev) => [mapRow(data), ...prev]);
    }
  }, []);

  return (
    <AuditContext.Provider value={{ entries, log, loading }}>
      {children}
    </AuditContext.Provider>
  );
}

export const useAudit = () => useContext(AuditContext);
