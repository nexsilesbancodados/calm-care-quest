import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Moon, Sun, AlertTriangle, ArrowDownCircle, Repeat, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { CommandPalette } from "@/components/CommandPalette";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const notifications = [
  { id: 1, icon: XCircle, text: "Zolpidem 10mg esgotado", time: "Há 12 min", className: "bg-destructive/10 text-destructive", unread: true },
  { id: 2, icon: AlertTriangle, text: "Clorpromazina vence em 27 dias", time: "Há 1h", className: "bg-warning/10 text-warning", unread: true },
  { id: 3, icon: ArrowDownCircle, text: "Entrada: 100 un. Haloperidol", time: "Há 2h", className: "bg-success/10 text-success", unread: true },
  { id: 4, icon: Truck, text: "Transferência concluída — Un. Norte", time: "Há 3h", className: "bg-primary/10 text-primary", unread: false },
  { id: 5, icon: Repeat, text: "Dispensação Clonazepam — Pac. #0987", time: "Há 4h", className: "bg-info/10 text-info", unread: false },
];

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card/50 backdrop-blur-sm px-3 sm:px-4 sticky top-0 z-10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground" />
              <div className="h-5 w-px bg-border hidden sm:block" />
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground leading-tight truncate">{title}</h1>
                {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <CommandPalette />
              {actions}
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="p-3 border-b">
                    <h4 className="text-sm font-semibold">Notificações</h4>
                    <p className="text-[11px] text-muted-foreground">{unreadCount} não lida{unreadCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "flex items-start gap-3 px-3 py-3 hover:bg-accent/30 transition-colors border-b last:border-0",
                          n.unread && "bg-accent/10"
                        )}
                      >
                        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", n.className)}>
                          <n.icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs leading-snug", n.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                            {n.text}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{n.time}</p>
                        </div>
                        {n.unread && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t">
                    <a href="/alertas" className="block text-center text-xs text-primary hover:underline font-medium py-1">
                      Ver todos os alertas
                    </a>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
