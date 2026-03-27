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
import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const isActive = (path: string) => location.pathname === path;
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
    const interval = setInterval(fetchCounts, 120000); // 2 min instead of 1 min
    return () => clearInterval(interval);
  }, []);

  const role = profile?.role;
  const filterByRole = (items: MenuItem[]) =>
    items.filter((item) => !item.roles || (role && item.roles.includes(role)));

  const getBadgeCount = (key: string | null) => {
    if (key === "alerts") return badgeCounts.alerts;
    if (key === "transfers") return badgeCounts.transfers;
    if (key === "prescricoes") return badgeCounts.prescricoes;
    return 0;
  };

  const displayName = profile?.nome || "Usuário";
  const displayInitials = displayName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const displayRole = profile ? ROLE_LABELS[profile.role] : "—";

  const handleLogout = async () => {
    await logout();
    toast.success("Sessão encerrada");
    navigate("/login");
  };

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
              "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              "text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50",
              active && [
                "bg-sidebar-primary/12 text-sidebar-accent-foreground",
                "shadow-[inset_0_0_0_1px_hsl(var(--sidebar-primary)/0.2),0_0_16px_hsl(var(--sidebar-primary)/0.08)]",
              ]
            )}
            activeClassName=""
          >
            {/* Active indicator bar */}
            {active && (
              <motion.div
                layoutId="sidebar-active-bar"
                className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-sidebar-primary"
                style={{ boxShadow: "0 0 8px hsl(var(--sidebar-primary) / 0.5)" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}

            <div className="relative">
              <item.icon className={cn(
                "h-[17px] w-[17px] shrink-0 transition-all duration-200",
                active
                  ? "text-sidebar-primary drop-shadow-[0_0_6px_hsl(var(--sidebar-primary)/0.4)]"
                  : "text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground"
              )} strokeWidth={active ? 2 : 1.6} />
              {collapsed && count > 0 && (
                <div className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar-background animate-pulse" />
              )}
            </div>
            {!collapsed && (
              <>
                <span className={cn(
                  "text-[13px] flex-1 transition-all duration-200",
                  active ? "font-bold" : "font-medium"
                )}>
                  {item.title}
                </span>
                {count > 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 min-w-[22px] px-1.5 text-[10px] font-bold tabular-nums border-0",
                      item.badgeKey === "alerts"
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
            <SidebarMenu>
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
            <CollapsibleTrigger className="flex items-center w-full text-[9px] uppercase tracking-[0.16em] text-sidebar-foreground/25 px-3 mb-1 font-bold hover:text-sidebar-foreground/40 transition-colors cursor-pointer">
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header with logo */}
      <SidebarHeader className="p-4 pb-5">
        <div className="flex items-center gap-3">
          <motion.div
            className="relative shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <img
              src={logoImg}
              alt="PsiRumoCerto"
              className="h-11 w-11 rounded-2xl object-cover shadow-md shadow-primary/15 ring-1 ring-primary/10"
            />
          </motion.div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-extrabold text-foreground tracking-tight flex items-center gap-1.5 font-display">
                PsiRumoCerto
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </span>
              <span className="text-[11px] text-muted-foreground font-medium tracking-wide truncate max-w-[140px]">{profile?.filial?.nome || "Farmácia Hospitalar"}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2.5 space-y-0.5">
        {renderGroup("Gestão", mainItems)}
        {renderGroup("Ferramentas & Cadastros", toolItems)}
        {renderGroup("Administração", systemItems, false)}
      </SidebarContent>

      {/* Footer with user info */}
      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="rounded-xl bg-sidebar-accent/40 border border-sidebar-border/50 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-sidebar-primary/20 to-sidebar-accent text-sidebar-primary text-[11px] font-bold">
                    {displayInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-sidebar-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-sidebar-accent-foreground truncate leading-tight">{displayName}</p>
                <p className="text-[10px] text-sidebar-foreground/35 font-medium truncate">{displayRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sidebar-foreground/25 hover:text-destructive hover:bg-destructive/10 transition-all"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="h-8 w-8 ring-2 ring-sidebar-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-sidebar-primary/20 to-sidebar-accent text-sidebar-primary text-[10px] font-bold">
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
}
