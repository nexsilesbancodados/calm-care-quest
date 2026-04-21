import {
  LayoutDashboard, Pill, AlertTriangle, ClipboardList, Package,
  Settings, Barcode, ArrowLeftRight, Users, BarChart3, Factory,
  ScanLine, ArrowDownCircle, ArrowUpCircle, Shield, FileText,
  User, ClipboardCheck, ChevronDown, LogOut, MessageSquareText,
  Heart, Truck, Wrench, Activity, HelpCircle, LucideIcon,
} from "lucide-react";

import logoImg from "@/assets/logo.jpg";
import { NavLink } from "@/components/NavLink";
import { prefetchPage } from "@/lib/lazyPages";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: string[] | null;
  badgeKey: "alerts" | "transfers" | "prescricoes" | null;
}

interface MenuGroup {
  label: string;
  icon: LucideIcon;
  defaultOpen: boolean;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Principal",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: null, badgeKey: null },
      { title: "Alertas", url: "/alertas", icon: AlertTriangle, roles: null, badgeKey: "alerts" },
    ],
  },
  {
    label: "Farmácia",
    icon: Pill,
    defaultOpen: true,
    items: [
      { title: "Itens / Estoque", url: "/medicamentos", icon: Package, roles: null, badgeKey: null },
      { title: "Entrada", url: "/entrada", icon: ArrowDownCircle, roles: ["admin", "farmaceutico", "auxiliar_farmacia"], badgeKey: null },
      { title: "Dispensação", url: "/dispensacao", icon: ArrowUpCircle, roles: ["admin", "farmaceutico", "enfermeiro"], badgeKey: null },
      { title: "Movimentações", url: "/movimentacoes", icon: ClipboardList, roles: null, badgeKey: null },
    ],
  },
  {
    label: "Clínico",
    icon: Heart,
    defaultOpen: true,
    items: [
      { title: "Pacientes", url: "/pacientes", icon: User, roles: null, badgeKey: null },
      { title: "Prescrições", url: "/prescricoes", icon: FileText, roles: ["admin", "farmaceutico", "enfermeiro"], badgeKey: "prescricoes" },
      { title: "Administração MAR", url: "/mar", icon: ClipboardCheck, roles: ["admin", "farmaceutico", "enfermeiro"], badgeKey: null },
      { title: "Solicitações", url: "/solicitacoes", icon: MessageSquareText, roles: ["admin", "farmaceutico", "enfermeiro", "auxiliar_farmacia"], badgeKey: null },
      { title: "Passagem de Plantão", url: "/plantao", icon: ClipboardList, roles: ["admin", "enfermeiro"], badgeKey: null },
      { title: "Atrasos e Próximas", url: "/atrasos", icon: Activity, roles: ["admin", "farmaceutico", "enfermeiro"], badgeKey: null },
    ],
  },
  {
    label: "Logística",
    icon: Truck,
    defaultOpen: false,
    items: [
      { title: "Transferências", url: "/transferencias", icon: ArrowLeftRight, roles: ["admin", "farmaceutico"], badgeKey: "transfers" },
      { title: "Fornecedores", url: "/fornecedores", icon: Factory, roles: ["admin", "farmaceutico"], badgeKey: null },
      { title: "Inventário", url: "/inventario", icon: ClipboardCheck, roles: ["admin", "farmaceutico"], badgeKey: null },
      
    ],
  },
  {
    label: "Ferramentas",
    icon: Wrench,
    defaultOpen: false,
    items: [
      { title: "Leitor", url: "/leitor", icon: ScanLine, roles: null, badgeKey: null },
      { title: "Etiquetas", url: "/etiquetas", icon: Barcode, roles: ["admin", "farmaceutico"], badgeKey: null },
      { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: null, badgeKey: null },
    ],
  },
  {
    label: "Administração",
    icon: Shield,
    defaultOpen: false,
    items: [
      { title: "Usuários", url: "/usuarios", icon: Users, roles: ["admin"], badgeKey: null },
      { title: "Painel Admin", url: "/admin", icon: Shield, roles: ["admin"], badgeKey: null },
      { title: "Configurações", url: "/configuracoes", icon: Settings, roles: ["admin"], badgeKey: null },
    ],
  },
];

export const AppSidebar = memo(function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [badgeCounts, setBadgeCounts] = useState({ alerts: 0, transfers: 0, prescricoes: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase.rpc("get_sidebar_counts");
      if (data) {
        const d = data as Record<string, number>;
        setBadgeCounts({ alerts: d.alerts || 0, transfers: d.transfers || 0, prescricoes: d.prescricoes || 0 });
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 120_000);
    return () => clearInterval(interval);
  }, [profile?.filial_id]);

  const role = profile?.role;

  const filterByRole = useCallback(
    (items: MenuItem[]) => items.filter((i) => !i.roles || (role && i.roles.includes(role))),
    [role]
  );

  const getBadgeCount = useCallback(
    (key: string | null) => {
      if (!key) return 0;
      return badgeCounts[key as keyof typeof badgeCounts] || 0;
    },
    [badgeCounts]
  );

  const { displayName, displayInitials, displayRole } = useMemo(() => {
    const name = profile?.nome || "Usuário";
    return {
      displayName: name,
      displayInitials: name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase(),
      displayRole: profile ? ROLE_LABELS[profile.role] : "—",
    };
  }, [profile?.nome, profile?.role]);

  const handleLogout = useCallback(async () => {
    await logout();
    toast.success("Sessão encerrada");
    navigate("/login");
  }, [logout, navigate]);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/40 hidden sm:flex">
      {/* Header */}
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="PsiRumoCerto"
            className="h-8 w-8 rounded-lg object-cover shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-sidebar-accent-foreground tracking-tight font-display">
                PsiRumoCerto
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 font-medium truncate">
                {profile?.filial?.nome || "Farmácia Hospitalar"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Menu */}
      <SidebarContent className="px-3 overflow-y-auto scrollbar-thin">
        {menuGroups.map((group) => {
          const filtered = filterByRole(group.items);
          if (filtered.length === 0) return null;
          const hasActiveItem = filtered.some((i) => isActive(i.url));

          if (collapsed) {
            return (
              <SidebarGroup key={group.label} className="py-1">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {filtered.map((item) => {
                      const active = isActive(item.url);
                      const count = getBadgeCount(item.badgeKey);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                            <NavLink
                              to={item.url}
                              end={item.url === "/"}
                              onMouseEnter={() => prefetchPage(item.url)}
                              className={cn(
                                "relative flex items-center justify-center p-2 rounded-lg transition-colors",
                                active
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                  : "text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
                              )}
                              activeClassName=""
                            >
                              <item.icon className="h-4 w-4" strokeWidth={active ? 2.2 : 1.7} />
                              {count > 0 && (
                                <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <Collapsible key={group.label} defaultOpen={group.defaultOpen || hasActiveItem} className="group/collapsible">
              <SidebarGroup className="py-0">
                <CollapsibleTrigger className="flex items-center w-full gap-2 px-2 py-2 text-[11px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold hover:text-sidebar-foreground/70 transition-colors cursor-pointer select-none">
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90 opacity-40" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-px">
                      {filtered.map((item) => {
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
                                  "group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all duration-150",
                                  active
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground font-medium"
                                )}
                                activeClassName=""
                              >
                                <item.icon
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
                                  )}
                                  strokeWidth={active ? 2.1 : 1.7}
                                />
                                <span className="flex-1 truncate">{item.title}</span>
                                {count > 0 && (
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold tabular-nums min-w-[18px] h-[18px] flex items-center justify-center rounded-full",
                                      active
                                        ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                                        : item.badgeKey === "alerts"
                                          ? "bg-destructive/10 text-destructive"
                                          : "bg-sidebar-primary/10 text-sidebar-primary"
                                    )}
                                  >
                                    {count}
                                  </span>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3">
        <div className={cn(
          "flex items-center rounded-lg transition-colors",
          collapsed ? "justify-center p-1" : "gap-2.5 p-2 bg-sidebar-accent/30"
        )}>
          <Avatar className={cn("shrink-0", collapsed ? "h-7 w-7" : "h-8 w-8")}>
            <AvatarFallback className="bg-sidebar-primary/15 text-sidebar-primary text-[10px] font-bold">
              {displayInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-sidebar-accent-foreground truncate">{displayName}</p>
                <p className="text-[10px] text-sidebar-foreground/45 font-medium truncate">{displayRole}</p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/35 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Atalhos"
                aria-label="Atalhos de teclado"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/35 hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Sair"
                aria-label="Sair do sistema"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>

            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
});
