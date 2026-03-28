import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  severidade: string;
  lida: boolean;
  resolvida: boolean;
  usuario_id: string | null;
  medicamento_id: string | null;
  lote_id: string | null;
  prescricao_id: string | null;
  link: string | null;
  metadata: any;
  created_at: string;
}

export interface AutomacaoConfig {
  id: string;
  tipo: string;
  ativo: boolean;
  parametros: any;
  ultima_execucao: string | null;
  updated_at: string;
}

export function useAutomations() {
  const { user, isAdmin } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [configs, setConfigs] = useState<AutomacaoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchNotificacoes = useCallback(async () => {
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("resolvida", false)
      .order("created_at", { ascending: false })
      .limit(100);
    setNotificacoes((data as Notificacao[]) || []);
  }, []);

  const fetchConfigs = useCallback(async () => {
    const { data } = await supabase
      .from("automacao_config")
      .select("*")
      .order("tipo");
    setConfigs((data as AutomacaoConfig[]) || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchNotificacoes(), fetchConfigs()]);
    setLoading(false);
  }, [fetchNotificacoes, fetchConfigs]);

  useEffect(() => {
    if (!user) return;
    loadAll();

    // Realtime subscriptions for notifications, solicitações, movimentações and lotes
    const channel = supabase
      .channel("realtime-farmacia")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes" }, (payload) => {
        const n = payload.new as Notificacao;
        setNotificacoes((prev) => [n, ...prev]);
        toast.info(n.titulo, { description: n.mensagem });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "solicitacoes_medicamentos" }, (payload) => {
        toast.info("Nova solicitação de medicamento", { description: `Quantidade: ${(payload.new as any).quantidade}` });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "solicitacoes_medicamentos" }, (payload) => {
        const s = payload.new as any;
        if (s.status === "aprovada") toast.success("Solicitação aprovada!");
        else if (s.status === "recusada") toast.error("Solicitação recusada");
        else if (s.status === "atendida") toast.info("Solicitação atendida");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "movimentacoes" }, () => {
        // Silently trigger refetch of related queries
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lotes" }, (payload) => {
        const l = payload.new as any;
        if (l.ativo === false && l.quantidade_atual > 0) {
          toast.warning("Lote bloqueado por vencimento", { description: `Lote ${l.numero_lote} entrou em quarentena` });
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user?.id, loadAll]);

  const markAsRead = async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  };

  const markAsResolved = async (id: string) => {
    await supabase.from("notificacoes").update({ resolvida: true }).eq("id", id);
    setNotificacoes((prev) => prev.filter((n) => n.id !== id));
    toast.success("Alerta resolvido");
  };

  const markAllRead = async () => {
    const ids = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notificacoes").update({ lida: true }).in("id", ids);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const toggleConfig = async (tipo: string, ativo: boolean) => {
    await supabase.from("automacao_config").update({ ativo, updated_at: new Date().toISOString() }).eq("tipo", tipo);
    setConfigs((prev) => prev.map((c) => (c.tipo === tipo ? { ...c, ativo } : c)));
    toast.success(`Automação ${ativo ? "ativada" : "desativada"}`);
  };

  const runAutomations = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-automations");
      if (error) throw error;
      toast.success("Automações executadas com sucesso", {
        description: `Estoque: ${data?.results?.estoque_baixo?.alerts || 0} alertas | Vencimento: ${data?.results?.vencimento?.alerts || 0} alertas`,
      });
      await fetchNotificacoes();
    } catch (e: any) {
      toast.error("Erro ao executar automações", { description: e.message });
    } finally {
      setRunning(false);
    }
  };

  const dispensarPrescricao = async (prescricaoId: string) => {
    try {
      const { data, error } = await supabase.rpc("dispensar_prescricao", {
        _prescricao_id: prescricaoId,
        _usuario_id: user?.id,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success) {
        toast.success("Dispensação automática concluída", {
          description: `${result.total_dispensado} unidades dispensadas`,
        });
      } else {
        toast.error(result?.error || "Erro na dispensação");
      }
      return result;
    } catch (e: any) {
      toast.error("Erro na dispensação automática", { description: e.message });
      return null;
    }
  };

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  return {
    notificacoes,
    configs,
    loading,
    running,
    unreadCount,
    markAsRead,
    markAsResolved,
    markAllRead,
    toggleConfig,
    runAutomations,
    dispensarPrescricao,
    refresh: loadAll,
  };
}
