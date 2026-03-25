import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Moon, Sun, LogOut, Settings, ChevronRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/database";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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
          <header className="h-[56px] flex items-center justify-between border-b bg-card/60 backdrop-blur-xl px-3 sm:px-5 sticky top-0 z-10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <div className="h-5 w-px bg-border/60 hidden sm:block" />
              <div className="min-w-0">
                {breadcrumb && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                    <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors font-medium">Dashboard</button>
                    <ChevronRight className="h-3 w-3 opacity-50" />
                    <span className="text-foreground/80 font-medium">{breadcrumb}</span>
                  </div>
                )}
                <h1 className="text-sm font-semibold text-foreground leading-tight truncate">{title}</h1>
                {subtitle && !breadcrumb && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {actions}
              <button
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
                className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                <span>Buscar...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={() => navigate("/alertas")}>
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground h-8 w-8">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-accent/60 transition-all ml-0.5 group">
                    <Avatar className="h-8 w-8 ring-2 ring-primary/10 group-hover:ring-primary/25 transition-all">
                      <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-[11px] font-bold">{displayInitials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold text-foreground leading-tight">{displayName}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] text-muted-foreground font-medium">{displayRole}</p>
                        {profile?.role === "admin" && <Shield className="h-2.5 w-2.5 text-primary" />}
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-sm font-bold">{displayInitials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{displayName}</p>
                        <Badge variant="outline" className={cn("text-[9px] mt-0.5", profile?.role === "admin" ? "border-primary/30 text-primary bg-primary/5" : "border-info/30 text-info bg-info/5")}>
                          {displayRole}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="gap-2 text-xs cursor-pointer">
                    <Settings className="h-3.5 w-3.5" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-xs cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-6 overflow-auto">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
