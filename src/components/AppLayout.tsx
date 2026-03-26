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

const pageIcons: Record<string, string> = {
  "/": "📊",
  "/medicamentos": "💊",
  "/entrada": "📥",
  "/dispensacao": "📤",
  "/alertas": "⚠️",
  "/movimentacoes": "📋",
  "/estoque": "📦",
  "/etiquetas": "🏷️",
  "/transferencias": "🔄",
  "/fornecedores": "🏭",
  "/relatorios": "📈",
  "/configuracoes": "⚙️",
  "/usuarios": "👥",
  "/leitor": "📱",
  "/admin": "🛡️",
  "/prescricoes": "📝",
  "/pacientes": "🧑‍⚕️",
  "/inventario": "📑",
  "/perfil": "👤",
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
  const pageIcon = pageIcons[location.pathname] || "📄";
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
          {/* Premium Header */}
          <header className="h-[60px] flex items-center justify-between border-b border-border/40 bg-card/50 backdrop-blur-2xl px-3 sm:px-5 sticky top-0 z-10">
            {/* Left side */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all rounded-lg h-8 w-8" />
              
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent hidden sm:block" />
              
              <div className="min-w-0">
                {breadcrumb && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                    <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors font-medium">
                      Dashboard
                    </button>
                    <ChevronRight className="h-3 w-3 opacity-40" />
                    <span className="text-foreground/80 font-semibold">{breadcrumb}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{pageIcon}</span>
                  <h1 className="text-sm font-bold text-foreground leading-tight truncate">{title}</h1>
                </div>
                {subtitle && !breadcrumb && (
                  <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {actions}
              
              {/* Search button */}
              <button
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
                className="hidden sm:flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-all group"
              >
                <Search className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
                <span className="text-[11px]">Buscar...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </button>

              {/* Notifications */}
              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                clearAll={clearAll}
              />

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-xl hover:bg-accent/60 transition-all"
              >
                <AnimatePresence mode="wait">
                  {theme === "light" ? (
                    <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Moon className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Sun className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>

              <div className="h-6 w-px bg-gradient-to-b from-transparent via-border/50 to-transparent mx-0.5 hidden sm:block" />

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-accent/50 transition-all group outline-none">
                    <div className="relative">
                      <Avatar className="h-8 w-8 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/10 to-info/10 text-primary text-[11px] font-bold">
                          {displayInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold text-foreground leading-tight">{displayName}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] text-muted-foreground font-medium">{displayRole}</p>
                        {profile?.role === "admin" && <Shield className="h-2.5 w-2.5 text-primary" />}
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                  <DropdownMenuLabel className="font-normal px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/15">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/10 to-info/10 text-primary text-sm font-bold">
                            {displayInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-popover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{displayName}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] mt-1 font-semibold",
                            profile?.role === "admin"
                              ? "border-primary/30 text-primary bg-primary/5"
                              : "border-info/30 text-info bg-info/5"
                          )}
                        >
                          {displayRole}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="mx-2" />
                  <DropdownMenuItem onClick={() => navigate("/perfil")} className="gap-2.5 text-xs cursor-pointer rounded-lg mx-1 py-2.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="gap-2.5 text-xs cursor-pointer rounded-lg mx-1 py-2.5">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="mx-2" />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2.5 text-xs cursor-pointer rounded-lg mx-1 py-2.5 text-destructive focus:text-destructive">
                    <LogOut className="h-3.5 w-3.5" /> Encerrar Sessão
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main content with page transition */}
          <main className="flex-1 p-3 sm:p-6 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
