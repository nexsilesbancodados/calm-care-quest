import {
  LayoutDashboard, Pill, AlertTriangle, ClipboardList, Package,
  Settings, Barcode, ArrowLeftRight, Users, BarChart3, Factory,
  ScanLine, ArrowDownCircle, ArrowUpCircle, Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const allItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: null },
  { title: "Medicamentos", url: "/medicamentos", icon: Pill, roles: null },
  { title: "Entrada", url: "/entrada", icon: ArrowDownCircle, roles: ["admin", "farmaceutico", "auxiliar_farmacia"] },
  { title: "Dispensação", url: "/dispensacao", icon: ArrowUpCircle, roles: ["admin", "farmaceutico", "enfermeiro"] },
  { title: "Movimentações", url: "/movimentacoes", icon: ClipboardList, roles: null },
  { title: "Estoque", url: "/estoque", icon: Package, roles: null },
  { title: "Transferências", url: "/transferencias", icon: ArrowLeftRight, roles: ["admin", "farmaceutico"] },
  { title: "Leitor", url: "/leitor", icon: ScanLine, roles: null },
  { title: "Etiquetas", url: "/etiquetas", icon: Barcode, roles: ["admin", "farmaceutico"] },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle, roles: null, badge: true },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: null },
  { title: "Fornecedores", url: "/fornecedores", icon: Factory, roles: ["admin", "farmaceutico"] },
];

const systemItems = [
  { title: "Usuários", url: "/usuarios", icon: Users, roles: ["admin"] },
  { title: "Configurações", url: "/configuracoes", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  const role = profile?.role;
  const filterByRole = (items: typeof allItems) =>
    items.filter((item) => !item.roles || (role && item.roles.includes(role)));

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
              {filterByRole(allItems).map((item) => {
                const active = isActive(item.url);
                return (
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
                        {!collapsed && (item as any).badge && (
                          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse-soft" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
                {filterByRole(systemItems).map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink
                          to={item.url}
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
                          {!collapsed && <span className="text-[13px]">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
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
