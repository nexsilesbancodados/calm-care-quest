import { createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuditContextType {
  log: (entry: { acao: string; tabela: string; registro_id?: string; dados_anteriores?: any; dados_novos?: any }) => Promise<void>;
}

const AuditContext = createContext<AuditContextType>({ log: async () => {} });

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const log = useCallback(async (entry: { acao: string; tabela: string; registro_id?: string; dados_anteriores?: any; dados_novos?: any }) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({
      acao: entry.acao,
      tabela: entry.tabela,
      registro_id: entry.registro_id || null,
      dados_anteriores: entry.dados_anteriores || null,
      dados_novos: entry.dados_novos || null,
      usuario_id: user?.id || null,
    });
  }, []);

  return (
    <AuditContext.Provider value={{ log }}>
      {children}
    </AuditContext.Provider>
  );
}

export const useAudit = () => useContext(AuditContext);
