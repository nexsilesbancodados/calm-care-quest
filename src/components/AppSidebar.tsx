import {
  LayoutDashboard, Pill, AlertTriangle, ClipboardList, Package,
  Settings, Barcode, ArrowLeftRight, Users, BarChart3, Factory,
  ScanLine, ArrowDownCircle, ArrowUpCircle, Activity, Shield, FileText,
  User, ClipboardCheck, ChevronRight, Sparkles, LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
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

  const renderMenuItem = (item: MenuItem, index: number) => {
    const active = isActive(item.url);
    const count = getBadgeCount(item.badgeKey);

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className={cn(
              "group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sidebar-foreground/70 transition-all duration-200",
              "hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60",
              active && "bg-sidebar-primary/15 text-sidebar-primary-foreground border border-sidebar-primary/25 shadow-[0_0_12px_hsl(var(--sidebar-primary)/0.15)]"
            )}
            activeClassName=""
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="relative">
              <item.icon className={cn(
                "h-[17px] w-[17px] shrink-0 transition-all duration-200",
                active
                  ? "text-sidebar-ring drop-shadow-[0_0_4px_hsl(var(--sidebar-primary)/0.5)]"
                  : "text-sidebar-foreground/45 group-hover:text-sidebar-accent-foreground"
              )} />
              {collapsed && count > 0 && (
                <div className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar-background animate-pulse" />
              )}
            </div>
            {!collapsed && (
              <>
                <span className={cn(
                  "text-[13px] flex-1 transition-colors duration-200",
                  active ? "font-semibold text-sidebar-accent-foreground" : "font-medium"
                )}>
                  {item.title}
                </span>
                {count > 0 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 min-w-[22px] px-1.5 text-[10px] font-bold tabular-nums border-0 shadow-sm",
                      item.badgeKey === "alerts"
                        ? "bg-destructive/20 text-destructive"
                        : "bg-sidebar-primary/20 text-sidebar-ring"
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
              {filtered.map((item, i) => renderMenuItem(item, i))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <Collapsible key={label} defaultOpen={defaultOpen || hasActiveItem} className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex items-center w-full text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/30 px-3 mb-0.5 font-semibold hover:text-sidebar-foreground/50 transition-colors cursor-pointer">
              <span className="flex-1 text-left">{label}</span>
              <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent className="transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {filtered.map((item, i) => renderMenuItem(item, i))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 pb-5">
        <div className="flex items-center gap-3">
          <motion.div
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-hero shadow-lg shadow-primary/25"
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Activity className="h-5 w-5 text-primary-foreground" />
            <div className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" style={{ animationDuration: '3s' }} />
          </motion.div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-accent-foreground tracking-tight flex items-center gap-1.5">
                PsiRumoCerto
                <Sparkles className="h-3 w-3 text-sidebar-ring" />
              </span>
              <span className="text-[10px] text-sidebar-foreground/40 font-medium">Farmácia Hospitalar</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 space-y-1">
        {renderGroup("Principal", mainItems)}
        {renderGroup("Operações", operationItems)}
        {renderGroup("Ferramentas", toolItems)}
        {renderGroup("Cadastros & Relatórios", reportItems)}
        {renderGroup("Administração", systemItems, false)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="rounded-xl bg-gradient-to-br from-sidebar-accent/60 to-sidebar-accent/20 border border-sidebar-border/40 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-sidebar-primary/25 to-sidebar-primary/10 text-sidebar-ring text-[11px] font-bold">
                    {displayInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-sidebar-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-sidebar-accent-foreground truncate leading-tight">{displayName}</p>
                <p className="text-[10px] text-sidebar-foreground/40 font-medium truncate">{displayRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sidebar-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all"
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
                <AvatarFallback className="bg-gradient-to-br from-sidebar-primary/25 to-sidebar-primary/10 text-sidebar-ring text-[10px] font-bold">
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
