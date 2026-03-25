import {
  LayoutDashboard, Pill, AlertTriangle, ClipboardList, Package,
  Settings, Barcode, ArrowLeftRight, Users, BarChart3, Factory,
  ScanLine, ArrowDownCircle, ArrowUpCircle, Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const allItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: null, badgeKey: null },
  { title: "Medicamentos", url: "/medicamentos", icon: Pill, roles: null, badgeKey: null },
  { title: "Entrada", url: "/entrada", icon: ArrowDownCircle, roles: ["admin", "farmaceutico", "auxiliar_farmacia"], badgeKey: null },
  { title: "Dispensação", url: "/dispensacao", icon: ArrowUpCircle, roles: ["admin", "farmaceutico", "enfermeiro"], badgeKey: null },
  { title: "Movimentações", url: "/movimentacoes", icon: ClipboardList, roles: null, badgeKey: null },
  { title: "Estoque", url: "/estoque", icon: Package, roles: null, badgeKey: null },
  { title: "Transferências", url: "/transferencias", icon: ArrowLeftRight, roles: ["admin", "farmaceutico"], badgeKey: "transfers" as const },
  { title: "Leitor", url: "/leitor", icon: ScanLine, roles: null, badgeKey: null },
  { title: "Etiquetas", url: "/etiquetas", icon: Barcode, roles: ["admin", "farmaceutico"], badgeKey: null },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle, roles: null, badgeKey: "alerts" as const },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: null, badgeKey: null },
  { title: "Fornecedores", url: "/fornecedores", icon: Factory, roles: ["admin", "farmaceutico"], badgeKey: null },
];

const systemItems = [
  { title: "Usuários", url: "/usuarios", icon: Users, roles: ["admin"], badgeKey: null },
  { title: "Configurações", url: "/configuracoes", icon: Settings, roles: ["admin"], badgeKey: null },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile } = useAuth();
  const isActive = (path: string) => location.pathname === path;
  const [badgeCounts, setBadgeCounts] = useState<{ alerts: number; transfers: number }>({ alerts: 0, transfers: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const [{ data: medsData }, { data: lotesData }, { count: transCount }] = await Promise.all([
        supabase.from("medicamentos").select("id, estoque_minimo").eq("ativo", true),
        supabase.from("lotes").select("id, medicamento_id, quantidade_atual, validade").eq("ativo", true),
        supabase.from("transferencias").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      ]);

      const now = new Date();
      let alertCount = 0;
      (medsData || []).forEach((m: any) => {
        const mLotes = (lotesData || []).filter((l: any) => l.medicamento_id === m.id);
        const total = mLotes.reduce((s: number, l: any) => s + l.quantidade_atual, 0);
        if (total === 0) alertCount++;
        else if (m.estoque_minimo > 0 && total <= m.estoque_minimo * 0.25) alertCount++;
        mLotes.forEach((l: any) => {
          const diff = (new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (diff <= 0 || (diff > 0 && diff <= 60)) alertCount++;
        });
      });

      setBadgeCounts({ alerts: alertCount, transfers: transCount || 0 });
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const role = profile?.role;
  const filterByRole = (items: typeof allItems) =>
    items.filter((item) => !item.roles || (role && item.roles.includes(role)));

  const getBadgeCount = (key: string | null) => {
    if (key === "alerts") return badgeCounts.alerts;
    if (key === "transfers") return badgeCounts.transfers;
    return 0;
  };

  const renderMenuItem = (item: typeof allItems[0], active: boolean) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
        <NavLink
          to={item.url}
          end={item.url === "/"}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 transition-all duration-200 group relative",
            "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
            active && "bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
          )}
          activeClassName=""
        >
          {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
          )}
          <item.icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground")} />
          {!collapsed && (
            <span className="text-[13px] flex-1">{item.title}</span>
          )}
          {!collapsed && item.badgeKey && getBadgeCount(item.badgeKey) > 0 && (
            <Badge variant="outline" className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-destructive/15 text-destructive border-destructive/20 tabular-nums">
              {getBadgeCount(item.badgeKey)}
            </Badge>
          )}
          {collapsed && item.badgeKey && getBadgeCount(item.badgeKey) > 0 && (
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-hero shadow-lg shadow-primary/20">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">PsiRumoCerto</span>
              <span className="text-[10px] text-sidebar-foreground/50 font-medium">Farmácia Hospitalar</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/35 px-3 mb-1 font-semibold">
            Operações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(allItems).map((item) => renderMenuItem(item, isActive(item.url)))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filterByRole(systemItems).length > 0 && (
          <SidebarGroup className="mt-2">
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/35 px-3 mb-1 font-semibold">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByRole(systemItems).map((item) => renderMenuItem(item as any, isActive(item.url)))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="rounded-xl bg-sidebar-accent/40 border border-sidebar-border/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-medium text-sidebar-foreground/70">Sistema Online</span>
            </div>
            <p className="text-[10px] text-sidebar-foreground/40">PsiRumoCerto v2.1</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}