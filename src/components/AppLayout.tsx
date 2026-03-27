import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Moon, Sun, LogOut, Settings, ChevronRight, Shield, User, Search, Command } from "lucide-react";
import logoImg from "@/assets/logo.jpg";
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
import { FilialSwitcher } from "@/components/FilialSwitcher";
import { useAutomations } from "@/hooks/useAutomations";
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
  const { notificacoes: notifications, unreadCount, markAsRead, markAllRead, markAsResolved } = useAutomations();
  useOnlinePresence(location.pathname);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
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
          {/* Header */}
          <header className="h-[56px] sm:h-[60px] flex items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-xl px-3 sm:px-5 sticky top-0 z-10">
            {/* Left */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all rounded-xl h-8 w-8" />
              
              <div className="h-5 w-px bg-border/60 hidden sm:block" />

              {/* Filial Switcher (admin only) */}
              <FilialSwitcher />
              
              <div className="min-w-0">
                {breadcrumb && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mb-0.5">
                    <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors font-medium">
                      Dashboard
                    </button>
                    <ChevronRight className="h-2.5 w-2.5 opacity-40" />
                    <span className="text-foreground/70 font-semibold">{breadcrumb}</span>
                  </div>
                )}
                <h1 className="text-[13px] sm:text-sm font-extrabold text-foreground leading-tight truncate tracking-tight font-display">{title}</h1>
                {subtitle && !breadcrumb && (
                  <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {actions}
              
              {/* Search */}
              <button
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
                className="hidden sm:flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-all group"
              >
                <Search className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
                <span className="text-[11px]">Buscar...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded-lg border border-border/40 bg-background/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/50">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </button>

              {/* Notifications */}
              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                markAllRead={markAllRead}
                markAsResolved={markAsResolved}
              />

              {/* Theme */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-xl hover:bg-muted/40 transition-all"
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

              <div className="h-5 w-px bg-border/40 mx-0.5 hidden sm:block" />

              {/* User */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/30 transition-all group outline-none">
                    <div className="relative">
                      <Avatar className="h-8 w-8 ring-2 ring-border/40 group-hover:ring-primary/30 transition-all">
                        <AvatarFallback className="bg-gradient-to-br from-primary/15 to-accent/10 text-primary text-[11px] font-bold">
                          {displayInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-background" />
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-bold text-foreground leading-tight">{displayName}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] text-muted-foreground/60 font-medium">{displayRole}</p>
                        {profile?.role === "admin" && <Shield className="h-2.5 w-2.5 text-primary/60" />}
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5 shadow-elevated">
                  <DropdownMenuLabel className="font-normal px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/15">
                          <AvatarFallback className="bg-gradient-to-br from-primary/15 to-accent/10 text-primary text-sm font-bold">
                            {displayInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-popover" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold font-display">{displayName}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] mt-1 font-bold",
                            profile?.role === "admin"
                              ? "border-primary/20 text-primary bg-primary/5"
                              : "border-accent/20 text-accent bg-accent/5"
                          )}
                        >
                          {displayRole}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="mx-2" />
                  <DropdownMenuItem onClick={() => navigate("/perfil")} className="gap-2.5 text-xs cursor-pointer rounded-xl mx-1 py-2.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="gap-2.5 text-xs cursor-pointer rounded-xl mx-1 py-2.5">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="mx-2" />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2.5 text-xs cursor-pointer rounded-xl mx-1 py-2.5 text-destructive focus:text-destructive">
                    <LogOut className="h-3.5 w-3.5" /> Encerrar Sessão
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-auto">
            <div className="page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
