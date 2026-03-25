import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Moon, Sun, LogOut, User, Settings, ChevronRight, Shield } from "lucide-react";
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
  "/pacientes": "Pacientes",
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
          <header className="h-14 flex items-center justify-between border-b bg-card/50 backdrop-blur-sm px-3 sm:px-4 sticky top-0 z-10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground" />
              <div className="h-5 w-px bg-border hidden sm:block" />
              <div className="min-w-0">
                {breadcrumb && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                    <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">Dashboard</button>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground font-medium">{breadcrumb}</span>
                  </div>
                )}
                <h1 className="text-sm font-semibold text-foreground leading-tight truncate">{title}</h1>
                {subtitle && !breadcrumb && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {actions}
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent/50 transition-colors ml-1">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-bold">{displayInitials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-medium text-foreground leading-tight">{displayName}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] text-muted-foreground">{displayRole}</p>
                        {profile?.role === "admin" && <Shield className="h-2.5 w-2.5 text-primary" />}
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{displayInitials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{displayName}</p>
                        <Badge variant="outline" className={cn("text-[9px] mt-0.5", profile?.role === "admin" ? "border-primary/30 text-primary" : "border-info/30 text-info")}>
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
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
