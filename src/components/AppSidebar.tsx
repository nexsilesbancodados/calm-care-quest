import {
  LayoutDashboard, Pill, AlertTriangle, ClipboardList, Package,
  Settings, Barcode, ArrowLeftRight, Users, BarChart3, Factory,
  ScanLine, ArrowDownCircle, ArrowUpCircle, Activity, Shield, FileText,
  User, ClipboardCheck, ChevronRight, LogOut,
} from "lucide-react";
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
];

const operationItems: MenuItem[] = [
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
];

const reportItems: MenuItem[] = [
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
      const [{ data: medsData }, { data: lotesData }, { count: transCount }, { count: prescCount }] = await Promise.all([
        supabase.from("medicamentos").select("id, estoque_minimo").eq("ativo", true),
        supabase.from("lotes").select("id, medicamento_id, quantidade_atual, validade").eq("ativo", true),
        supabase.from("transferencias").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("prescricoes").select("id", { count: "exact", head: true }).eq("status", "ativa"),
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

      setBadgeCounts({ alerts: alertCount, transfers: transCount || 0, prescricoes: prescCount || 0 });
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
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
              "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sidebar-foreground/65 transition-all duration-100",
              "hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50",
              active && "bg-sidebar-primary/12 text-sidebar-accent-foreground border border-sidebar-primary/20"
            )}
            activeClassName=""
          >
            <div className="relative">
              <item.icon className={cn(
                "h-4 w-4 shrink-0 transition-colors duration-100",
                active
                  ? "text-sidebar-ring"
                  : "text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground"
              )} />
              {collapsed && count > 0 && (
                <div className="absolute -top-1 -right-1.5 h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              )}
            </div>
            {!collapsed && (
              <>
                <span className={cn(
                  "text-[12px] flex-1 transition-colors duration-100",
                  active ? "font-semibold text-sidebar-accent-foreground" : "font-medium"
                )}>
                  {item.title}
                </span>
                {count > 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4.5 min-w-[18px] px-1 text-[9px] font-bold tabular-nums border-0 rounded-md",
                      item.badgeKey === "alerts"
                        ? "bg-destructive/20 text-destructive"
                        : "bg-sidebar-primary/18 text-sidebar-ring"
                    )}
                    style={{ fontFamily: "var(--font-mono)" }}
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
            <CollapsibleTrigger className="flex items-center w-full text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/25 px-2.5 mb-0.5 font-bold hover:text-sidebar-foreground/45 transition-colors cursor-pointer"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <span className="flex-1 text-left">{label}</span>
              <ChevronRight className="h-2.5 w-2.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-primary">
            <Activity className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-sidebar-accent-foreground tracking-tight">
                PsiRumoCerto
              </span>
              <span className="text-[9px] text-sidebar-foreground/30 font-bold uppercase tracking-[0.12em]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Farmácia Hospitalar
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 space-y-0.5">
        {renderGroup("Principal", mainItems)}
        {renderGroup("Operações", operationItems)}
        {renderGroup("Ferramentas", toolItems)}
        {renderGroup("Cadastros", reportItems)}
        {renderGroup("Sistema", systemItems, false)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="rounded-lg bg-sidebar-accent/40 border border-sidebar-border/30 p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Avatar className="h-8 w-8 ring-1.5 ring-sidebar-primary/15">
                  <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-ring text-[10px] font-bold">
                    {displayInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border-[1.5px] border-sidebar-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-sidebar-accent-foreground truncate leading-tight">{displayName}</p>
                <p className="text-[9px] text-sidebar-foreground/35 font-bold uppercase tracking-[0.1em] truncate"
                  style={{ fontFamily: "var(--font-mono)" }}
                >{displayRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-6 w-6 items-center justify-center rounded-md text-sidebar-foreground/25 hover:text-destructive hover:bg-destructive/10 transition-all"
                title="Sair"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="h-7 w-7 ring-1.5 ring-sidebar-primary/15">
                <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-ring text-[9px] font-bold">
                  {displayInitials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-success border-[1.5px] border-sidebar-background" />
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}