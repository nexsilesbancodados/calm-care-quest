import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  type: "transfer" | "stock" | "expiry" | "system";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export function useRealtimeNotifications() {
  const { user, isAdmin, can } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((n: Omit<AppNotification, "id" | "read" | "created_at">) => {
    const notification: AppNotification = {
      ...n,
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    
    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(n.title, { body: n.message, icon: "/pwa-192x192.png" });
    }
    
    toast.info(n.title, { description: n.message });
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to new transfers
    const transferChannel = supabase
      .channel("realtime-transfers")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transferencias" },
        (payload) => {
          if (isAdmin || can("approve_transfers")) {
            addNotification({
              type: "transfer",
              title: "Nova transferência solicitada",
              message: `Transferência de ${payload.new.quantidade} unidades pendente de aprovação`,
              link: "/transferencias",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transferencias" },
        (payload) => {
          const status = payload.new.status;
          if (status === "aprovado" || status === "cancelado") {
            addNotification({
              type: "transfer",
              title: `Transferência ${status}`,
              message: `Uma transferência foi ${status === "aprovado" ? "aprovada" : "cancelada"}`,
              link: "/transferencias",
            });
          }
        }
      )
      .subscribe();

    // Listen to stock changes (low stock via movimentacoes)
    const movChannel = supabase
      .channel("realtime-movimentacoes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "movimentacoes" },
        (payload) => {
          if (payload.new.tipo === "entrada") {
            addNotification({
              type: "stock",
              title: "Entrada registrada",
              message: `${payload.new.quantidade} unidades recebidas`,
              link: "/movimentacoes",
            });
          }
        }
      )
      .subscribe();

    return () => {
      transferChannel.unsubscribe();
      movChannel.unsubscribe();
    };
  }, [user?.id, isAdmin]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => setNotifications([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const requestPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestPermission,
  };
}
