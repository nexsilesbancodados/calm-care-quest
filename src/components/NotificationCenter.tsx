import { Bell, Check, CheckCheck, Trash2, ArrowLeftRight, Package, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { AppNotification } from "@/hooks/useRealtimeNotifications";

const ICON_MAP: Record<string, any> = {
  transfer: ArrowLeftRight,
  stock: Package,
  expiry: Clock,
  system: Info,
};

const COLOR_MAP: Record<string, { text: string; bg: string }> = {
  transfer: { text: "text-info", bg: "bg-info/10" },
  stock: { text: "text-success", bg: "bg-success/10" },
  expiry: { text: "text-warning", bg: "bg-warning/10" },
  system: { text: "text-primary", bg: "bg-primary/10" },
};

interface Props {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export function NotificationCenter({ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }: Props) {
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-xl hover:bg-accent/60 transition-all">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground shadow-lg shadow-destructive/30"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 rounded-xl shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold">Notificações</h4>
            {unreadCount > 0 && (
              <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-primary/10 text-primary border-0">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={markAllAsRead}>
                <CheckCheck className="h-3 w-3" /> Ler todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive rounded-lg hover:bg-destructive/10" onClick={clearAll}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-3">
                <Bell className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground/60">Nenhuma notificação</p>
              <p className="text-[11px] text-muted-foreground/40 mt-1">Você está em dia! 🎉</p>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              <AnimatePresence>
                {notifications.map((n, i) => {
                  const Icon = ICON_MAP[n.type] || Info;
                  const colors = COLOR_MAP[n.type] || COLOR_MAP.system;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, height: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn(
                        "flex items-start gap-3 px-3 py-3 cursor-pointer rounded-xl transition-all duration-200",
                        "hover:bg-accent/50",
                        !n.read && "bg-primary/[0.04]"
                      )}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", colors.bg)}>
                        <Icon className={cn("h-4 w-4", colors.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs leading-tight", !n.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-1 font-medium">
                          {new Date(n.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!n.read && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0 ring-2 ring-primary/20"
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
