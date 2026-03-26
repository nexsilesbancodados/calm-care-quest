import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Moon, Sun, LogOut, Settings, ChevronRight, Shield, User, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/database";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useEffect } from "react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/medicamentos": "Medicamentos",
  "/entrada": "Entrada de Medicamentos",
  "/dispensacao": "Dispensação",
  "/alertas": "Alertas",
  "/movimentacoes": "Movimentações",
  "/estoque": "Estoque",
  "/etiquetas": "Etiquetas",
  "/transferencias": "Transferências",
  "/fornecedores": "Fornecedores",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
  "/usuarios": "Usuários",
  "/leitor": "Leitor de Código",
  "/admin": "Painel Admin",
  "/prescricoes": "Prescrições",
  "/pacientes": "Pacientes",
  "/inventario": "Inventário Físico",
  "/perfil": "Meu Perfil",
};

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, requestPermission } = useRealtimeNotifications();
  useOnlinePresence(location.pathname);

  useEffect(() => {
    requestPermission();
  }, []);

  const breadcrumb = location.pathname !== "/" ? pageTitles[location.pathname] : null;
  const displayName = profile?.nome || "Usuário";
  const displayInitials = displayName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const displayRole = profile ? ROLE_LABELS[profile.role] : "—";

  const handleLogout = async () => {
    await logout();
    toast.success("Sessão encerrada");
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header — clean geometric */}
          <header className="h-14 flex items-center justify-between border-b border-border/50 bg-card/70 backdrop-blur-xl px-3 sm:px-5 sticky top-0 z-10">
            {/* Left */}
            <div className="flex items-center gap-2.5 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all rounded-lg h-8 w-8" />
              
              <div className="h-5 w-px bg-border/50 hidden sm:block" />
              
              <div className="min-w-0">
                {breadcrumb && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5 font-mono-ui tracking-wider uppercase">
                    <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">
                      Dashboard
                    </button>
                    <ChevronRight className="h-2.5 w-2.5 opacity-40" />
                    <span className="text-foreground/70">{breadcrumb}</span>
                  </div>
                )}
                <h1 className="text-sm font-bold text-foreground leading-tight truncate tracking-tight">{title}</h1>
                {subtitle && !breadcrumb && (
                  <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5 font-body">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5">
              {actions}
              
              {/* Search */}
              <button
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-all"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="text-[10px] font-mono-ui">Buscar</span>
                <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-border/50 bg-background/80 px-1 font-mono text-[9px] text-muted-foreground/60">
                  <Command className="h-2 w-2" />K
                </kbd>
              </button>

              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                clearAll={clearAll}
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg hover:bg-accent/60 transition-all"
              >
                <AnimatePresence mode="wait">
                  {theme === "light" ? (
                    <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Moon className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Sun className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>

              <div className="h-5 w-px bg-border/40 mx-0.5 hidden sm:block" />

              {/* User */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/40 transition-all group outline-none">
                    <div className="relative">
                      <Avatar className="h-7 w-7 ring-1.5 ring-border/50 group-hover:ring-primary/30 transition-all">
                        <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-[10px] font-bold">
                          {displayInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border-[1.5px] border-card" />
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-[11px] font-semibold text-foreground leading-tight">{displayName}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-[9px] text-muted-foreground font-mono-ui uppercase tracking-wider">{displayRole}</p>
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-lg p-1">
                  <DropdownMenuLabel className="font-normal px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 ring-1.5 ring-primary/15">
                        <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-xs font-bold">
                          {displayInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold tracking-tight">{displayName}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[8px] mt-0.5 font-bold tracking-wider uppercase",
                            profile?.role === "admin"
                              ? "border-primary/25 text-primary bg-primary/5"
                              : "border-info/25 text-info bg-info/5"
                          )}
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {displayRole}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="mx-2" />
                  <DropdownMenuItem onClick={() => navigate("/perfil")} className="gap-2.5 text-xs cursor-pointer rounded-md mx-1 py-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="gap-2.5 text-xs cursor-pointer rounded-md mx-1 py-2">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="mx-2" />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2.5 text-xs cursor-pointer rounded-md mx-1 py-2 text-destructive focus:text-destructive">
                    <LogOut className="h-3.5 w-3.5" /> Encerrar Sessão
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-5 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}