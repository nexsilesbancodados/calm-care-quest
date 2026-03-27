import {
  LayoutDashboard, Pill, AlertTriangle, ClipboardList, Package,
  Settings, Barcode, ArrowLeftRight, Users, BarChart3, Factory,
  ScanLine, ArrowDownCircle, ArrowUpCircle, Shield, FileText,
  User, ClipboardCheck, ChevronRight, LogOut, Sparkles,
} from "lucide-react";
import logoImg from "@/assets/logo-new.png";
import { NavLink } from "@/components/NavLink";
import { prefetchPage } from "@/lib/lazyPages";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  roles: string[] | null;
  badgeKey: "alerts" | "transfers" | "prescricoes" | null;
};

const mainItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: null, badgeKey: null },
  { title: "Medicamentos", url: "/medicamentos", icon: Pill, roles: null, badgeKey: null },
  { title: "Estoque", url: "/estoque", icon: Package, roles: null, badgeKey: null },
  { title: "Entrada", url: "/entrada", icon: ArrowDownCircle, roles: ["admin", "farmaceutico", "auxiliar_farmacia"], badgeKey: null },
  { title: "Dispensação", url: "/dispensacao", icon: ArrowUpCircle, roles: ["admin", "farmaceutico", "enfermeiro"], badgeKey: null },
  { title: "Movimentações", url: "/movimentacoes", icon: ClipboardList, roles: null, badgeKey: null },
  { title: "Transferências", url: "/transferencias", icon: ArrowLeftRight, roles: ["admin", "farmaceutico"], badgeKey: "transfers" },
  { title: "Prescrições", url: "/prescricoes", icon: FileText, roles: ["admin", "farmaceutico", "enfermeiro"], badgeKey: "prescricoes" },
];

const toolItems: MenuItem[] = [
  { title: "Leitor", url: "/leitor", icon: ScanLine, roles: null, badgeKey: null },
  { title: "Etiquetas", url: "/etiquetas", icon: Barcode, roles: ["admin", "farmaceutico"], badgeKey: null },
  { title: "Inventário", url: "/inventario", icon: ClipboardCheck, roles: ["admin", "farmaceutico"], badgeKey: null },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle, roles: null, badgeKey: "alerts" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: null, badgeKey: null },
  { title: "Pacientes", url: "/pacientes", icon: User, roles: null, badgeKey: null },
  { title: "Fornecedores", url: "/fornecedores", icon: Factory, roles: ["admin", "farmaceutico"], badgeKey: null },
];

const systemItems: MenuItem[] = [
  { title: "Usuários", url: "/usuarios", icon: Users, roles: ["admin"], badgeKey: null },
  { title: "Painel Admin", url: "/admin", icon: Shield, roles: ["admin"], badgeKey: null },
  { title: "Configurações", url: "/configuracoes", icon: Settings, roles: ["admin"], badgeKey: null },
];

export const AppSidebar = memo(function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [badgeCounts, setBadgeCounts] = useState<{ alerts: number; transfers: number; prescricoes: number }>({ alerts: 0, transfers: 0, prescricoes: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase.rpc("get_sidebar_counts");
      if (data) {
        setBadgeCounts({
          alerts: (data as any).alerts || 0,
          transfers: (data as any).transfers || 0,
          prescricoes: (data as any).prescricoes || 0,
        });
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 120000);
    return () => clearInterval(interval);
  }, [profile?.filial_id]);

  const role = profile?.role;
  const filterByRole = useCallback((items: MenuItem[]) =>
    items.filter((item) => !item.roles || (role && item.roles.includes(role))),
  [role]);

  const getBadgeCount = useCallback((key: string | null) => {
    if (key === "alerts") return badgeCounts.alerts;
    if (key === "transfers") return badgeCounts.transfers;
    if (key === "prescricoes") return badgeCounts.prescricoes;
    return 0;
  }, [badgeCounts]);

  const { displayName, displayInitials, displayRole } = useMemo(() => {
    const name = profile?.nome || "Usuário";
    return {
      displayName: name,
      displayInitials: name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase(),
      displayRole: profile ? ROLE_LABELS[profile.role] : "—",
    };
  }, [profile?.nome, profile?.role]);

  const handleLogout = useCallback(async () => {
    await logout();
    toast.success("Sessão encerrada");
    navigate("/login");
  }, [logout, navigate]);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.url);
    const count = getBadgeCount(item.badgeKey);

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            onMouseEnter={() => prefetchPage(item.url)}
            onFocus={() => prefetchPage(item.url)}
            className={cn(
              "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground hover:text-sidebar-accent-foreground",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "hover:bg-sidebar-accent/70"
            )}
            activeClassName=""
          >
            <div className="relative z-10">
              <item.icon className={cn(
                "h-5 w-5 shrink-0 transition-colors duration-200",
                active
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
              )} strokeWidth={active ? 2 : 1.8} />
              {collapsed && count > 0 && (
                <div className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-sidebar-background animate-pulse" />
              )}
            </div>
            {!collapsed && (
              <>
                <span className={cn(
                  "text-sm flex-1 relative z-10 leading-snug",
                  active ? "font-semibold text-sidebar-primary-foreground" : "font-medium"
                )}>
                  {item.title}
                </span>
                {count > 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 min-w-[22px] px-1.5 text-[10px] font-bold tabular-nums border-0 relative z-10",
                      active
                        ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                        : item.badgeKey === "alerts"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-sidebar-primary/15 text-sidebar-primary"
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderGroup = (label: string, items: MenuItem[], defaultOpen = true) => {
    const filtered = filterByRole(items);
    if (filtered.length === 0) return null;

    const hasActiveItem = filtered.some((i) => isActive(i.url));

    if (collapsed) {
      return (
        <SidebarGroup key={label}>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {filtered.map((item) => renderMenuItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <Collapsible key={label} defaultOpen={defaultOpen || hasActiveItem} className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex items-center w-full text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/30 px-3 mb-0.5 font-bold hover:text-sidebar-foreground/50 transition-colors cursor-pointer">
              <span className="flex-1 text-left">{label}</span>
              <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 opacity-40" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent className="transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {filtered.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/60 hidden sm:flex">
      <SidebarHeader className="p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={logoImg}
              alt="PsiRumoCerto"
              className="h-10 w-10 rounded-2xl object-cover shadow-lg shadow-primary/20 ring-1 ring-primary/15 shrink-0 hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-sidebar-background" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-extrabold text-foreground tracking-tight flex items-center gap-1.5 font-display">
                PsiRumoCerto
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              </span>
              <span className="text-[11px] text-muted-foreground/70 font-medium tracking-wide truncate max-w-[140px]">
                {profile?.filial?.nome || "Farmácia Hospitalar"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {!collapsed && (
        <div className="px-5 mb-1">
          <Separator className="bg-sidebar-border/40" />
        </div>
      )}

      <SidebarContent className="px-2.5 space-y-0">
        {renderGroup("Gestão", mainItems)}
        {renderGroup("Ferramentas", toolItems)}
        {renderGroup("Sistema", systemItems, false)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="rounded-2xl bg-gradient-to-br from-sidebar-accent/50 to-sidebar-accent/30 border border-sidebar-border/40 p-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/25 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 text-sidebar-primary-foreground text-[11px] font-bold">
                    {displayInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-sidebar-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-sidebar-accent-foreground truncate leading-tight">{displayName}</p>
                <p className="text-[10px] text-sidebar-foreground/40 font-medium truncate">{displayRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-sidebar-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="h-8 w-8 ring-2 ring-sidebar-primary/25">
                <AvatarFallback className="bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 text-sidebar-primary-foreground text-[10px] font-bold">
                  {displayInitials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border-2 border-sidebar-background" />
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
});
