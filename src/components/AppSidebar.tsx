import {
  LayoutDashboard, Pill, AlertTriangle, ClipboardList, Package,
  Settings, Barcode, ArrowLeftRight, Users, BarChart3, Factory,
  ScanLine, ArrowDownCircle, ArrowUpCircle, Shield, FileText,
  User, ClipboardCheck, ChevronRight, LogOut, Sparkles, MessageSquareText,
  Heart, Truck, Wrench, LucideIcon,
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

/* ─── Menu Structure ─── */

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
      { title: "Medicamentos", url: "/medicamentos", icon: Pill, roles: null, badgeKey: null },
      { title: "Estoque", url: "/estoque", icon: Package, roles: null, badgeKey: null },
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
      { title: "Solicitações", url: "/solicitacoes", icon: MessageSquareText, roles: ["admin", "farmaceutico", "enfermeiro", "auxiliar_farmacia"], badgeKey: null },
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

/* ─── Component ─── */

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

  const renderMenuItem = useCallback(
    (item: MenuItem) => {
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
                "group relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                "text-sidebar-foreground hover:text-sidebar-accent-foreground",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
                  : "hover:bg-sidebar-accent/60"
              )}
              activeClassName=""
            >
              <item.icon
                className={cn(
                  "h-[17px] w-[17px] shrink-0 transition-colors",
                  active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
                )}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {collapsed && count > 0 && (
                <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar-background animate-pulse" />
              )}
              {!collapsed && (
                <>
                  <span
                    className={cn(
                      "text-[13px] flex-1 leading-snug tracking-[-0.01em]",
                      active ? "font-bold text-sidebar-primary-foreground" : "font-medium"
                    )}
                  >
                    {item.title}
                  </span>
                  {count > 0 && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 min-w-[20px] px-1.5 text-[10px] font-bold tabular-nums border-0",
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
    },
    [isActive, getBadgeCount, collapsed]
  );

  const renderGroup = useCallback(
    (group: MenuGroup) => {
      const filtered = filterByRole(group.items);
      if (filtered.length === 0) return null;

      const hasActiveItem = filtered.some((i) => isActive(i.url));

      if (collapsed) {
        return (
          <SidebarGroup key={group.label}>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {filtered.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      }

      return (
        <Collapsible key={group.label} defaultOpen={group.defaultOpen || hasActiveItem} className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex items-center w-full gap-2 text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/50 px-3 mb-1 mt-3 font-bold hover:text-sidebar-foreground/80 transition-colors cursor-pointer">
                <group.icon className="h-3 w-3 opacity-40" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 opacity-30" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent className="transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {filtered.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      );
    },
    [filterByRole, isActive, collapsed, renderMenuItem]
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50 hidden sm:flex">
      {/* Header */}
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={logoImg}
              alt="PsiRumoCerto"
              className="h-9 w-9 rounded-xl object-cover shadow-md shadow-primary/15 ring-1 ring-primary/10 shrink-0 hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-sidebar-background" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-extrabold text-foreground tracking-tight flex items-center gap-1.5 font-display">
                PsiRumoCerto
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wide truncate max-w-[140px]">
                {profile?.filial?.nome || "Farmácia Hospitalar"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {!collapsed && (
        <div className="px-5 mb-0.5">
          <Separator className="bg-sidebar-border/30" />
        </div>
      )}

      {/* Menu */}
      <SidebarContent className="px-2.5 overflow-y-auto scrollbar-thin">
        {menuGroups.map(renderGroup)}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 pt-1">
        {!collapsed && (
          <div className="px-2 mb-2">
            <Separator className="bg-sidebar-border/30" />
          </div>
        )}
        {!collapsed ? (
          <div className="rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30 p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Avatar className="h-8 w-8 ring-2 ring-sidebar-primary/20 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 text-sidebar-primary-foreground text-[10px] font-bold">
                    {displayInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border-2 border-sidebar-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-sidebar-accent-foreground truncate leading-tight">{displayName}</p>
                <p className="text-[9px] text-sidebar-foreground/50 font-medium truncate">{displayRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="h-7 w-7 ring-2 ring-sidebar-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 text-sidebar-primary-foreground text-[9px] font-bold">
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
