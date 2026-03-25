import { Bell, Check, CheckCheck, Trash2, ArrowLeftRight, Package, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { AppNotification } from "@/hooks/useRealtimeNotifications";

const ICON_MAP: Record<string, any> = {
  transfer: ArrowLeftRight,
  stock: Package,
  expiry: Clock,
  system: Info,
};

const COLOR_MAP: Record<string, string> = {
  transfer: "text-info",
  stock: "text-success",
  expiry: "text-warning",
  system: "text-primary",
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
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notificações</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={markAllAsRead}>
                <CheckCheck className="h-3 w-3" /> Ler todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive" onClick={clearAll}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = ICON_MAP[n.type] || Info;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      !n.read && "bg-primary/5"
                    )}
                    onClick={() => {
                      markAsRead(n.id);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", COLOR_MAP[n.type])} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium", !n.read && "text-foreground")}>{n.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(n.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
