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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { FilialSwitcher } from "@/components/FilialSwitcher";
import { useAutomations } from "@/hooks/useAutomations";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { memo, useMemo } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";

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

export const AppLayout = memo(function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notificacoes: notifications, unreadCount, markAsRead, markAllRead, markAsResolved } = useAutomations();
  useOnlinePresence(location.pathname);

  const breadcrumb = location.pathname !== "/" ? pageTitles[location.pathname] : null;

  const { displayName, displayInitials, displayRole } = useMemo(() => {
    const name = profile?.nome || "Usuário";
    return {
      displayName: name,
      displayInitials: name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase(),
      displayRole: profile ? ROLE_LABELS[profile.role] : "—",
    };
  }, [profile?.nome, profile?.role]);

  const handleLogout = async () => {
    await logout();
    toast.success("Sessão encerrada");
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-[52px] sm:h-14 flex items-center border-b border-border/30 bg-background/70 backdrop-blur-2xl px-3 sm:px-4 lg:px-5 sticky top-0 z-10">
            {/* Left section */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <SidebarTrigger className="text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all rounded-lg h-8 w-8 shrink-0" />

              <img
                src={logoImg}
                alt="PsiRumoCerto"
                className="h-6 w-6 rounded-md object-cover ring-1 ring-primary/10 sm:hidden shrink-0"
              />

              <div className="h-6 w-px bg-border/40 hidden sm:block shrink-0" />

              <div className="shrink-0">
                <FilialSwitcher />
              </div>

              <div className="h-6 w-px bg-border/40 hidden sm:block shrink-0" />

              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-sm sm:text-[15px] font-bold text-foreground leading-tight truncate tracking-tight">{title}</h1>
                {breadcrumb && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 leading-none mt-0.5">
                    <button onClick={() => navigate("/")} className="hover:text-foreground/80 transition-colors font-medium">
                      Dashboard
                    </button>
                    <ChevronRight className="h-2.5 w-2.5 opacity-40" />
                    <span className="text-foreground/60 font-semibold truncate">{breadcrumb}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {actions}

              <button
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-border/30 bg-muted/15 hover:bg-muted/30 px-2.5 py-1.5 text-muted-foreground/50 hover:text-foreground/70 transition-all group"
              >
                <Search className="h-3.5 w-3.5 group-hover:text-primary/70 transition-colors" />
                <span className="text-[11px] font-medium">Buscar...</span>
                <kbd className="pointer-events-none inline-flex h-[18px] select-none items-center gap-0.5 rounded border border-border/30 bg-background/50 px-1 font-mono text-[9px] font-medium text-muted-foreground/40">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </button>

              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                markAllRead={markAllRead}
                markAsResolved={markAsResolved}
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground/50 hover:text-foreground h-8 w-8 rounded-lg hover:bg-muted/30 transition-all"
              >
                {theme === "light" ? <Moon className="h-[15px] w-[15px]" /> : <Sun className="h-[15px] w-[15px]" />}
              </Button>

              <div className="h-6 w-px bg-border/30 mx-0.5 hidden sm:block" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-muted/20 transition-all group outline-none">
                    <div className="relative">
                      <Avatar className="h-[30px] w-[30px] ring-[1.5px] ring-primary/20 group-hover:ring-primary/40 transition-all">
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary text-[10px] font-bold">
                          {displayInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-px -right-px h-2 w-2 rounded-full bg-success border-[1.5px] border-background" />
                    </div>
                    <div className="hidden sm:flex flex-col text-left leading-none">
                      <span className="text-[12px] font-semibold text-foreground/90 leading-tight">{displayName}</span>
                      <span className="text-[10px] text-muted-foreground/50 font-medium flex items-center gap-1 mt-px">
                        {displayRole}
                        {profile?.role === "admin" && <Shield className="h-2.5 w-2.5 text-primary/50" />}
                      </span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 shadow-lg border-border/40">
                  <DropdownMenuLabel className="font-normal px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Avatar className="h-9 w-9 ring-[1.5px] ring-primary/15">
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary text-xs font-bold">
                            {displayInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full bg-success border-[1.5px] border-popover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold truncate">{displayName}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] mt-0.5 font-semibold h-4",
                            profile?.role === "admin"
                              ? "border-primary/15 text-primary/80 bg-primary/5"
                              : "border-muted-foreground/15 text-muted-foreground/60 bg-muted/30"
                          )}
                        >
                          {displayRole}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="mx-2 bg-border/30" />
                  <DropdownMenuItem onClick={() => navigate("/perfil")} className="gap-2 text-[12px] cursor-pointer rounded-lg mx-0.5 py-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground/60" /> Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="gap-2 text-[12px] cursor-pointer rounded-lg mx-0.5 py-2">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground/60" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="mx-2 bg-border/30" />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-[12px] cursor-pointer rounded-lg mx-0.5 py-2 text-destructive focus:text-destructive">
                    <LogOut className="h-3.5 w-3.5" /> Encerrar Sessão
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-2.5 sm:p-5 lg:p-6 overflow-auto pb-20 sm:pb-6">
            <div className="page-enter">
              {children}
            </div>
          </main>

          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
});
