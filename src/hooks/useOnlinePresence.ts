import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OnlineUser {
  user_id: string;
  nome: string;
  role: string;
  last_seen: string;
  current_page: string;
}

export function useOnlinePresence(currentPage?: string) {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel("online-presence", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        Object.entries(state).forEach(([key, presences]: [string, any]) => {
          if (presences.length > 0) {
            users.push({
              user_id: key,
              nome: presences[0].nome || "Usuário",
              role: presences[0].role || "visualizador",
              last_seen: presences[0].online_at || new Date().toISOString(),
              current_page: presences[0].current_page || "/",
            });
          }
        });
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            nome: profile.nome,
            role: profile.role,
            online_at: new Date().toISOString(),
            current_page: currentPage || window.location.pathname,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, profile?.nome, profile?.role]);

  // Update current page
  useEffect(() => {
    if (!channelRef.current || !user || !profile) return;
    channelRef.current.track({
      nome: profile.nome,
      role: profile.role,
      online_at: new Date().toISOString(),
      current_page: currentPage || window.location.pathname,
    });
  }, [currentPage]);

  return { onlineUsers, onlineCount: onlineUsers.length };
}
