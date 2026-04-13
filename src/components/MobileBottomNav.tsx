import { memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Pill, Package, AlertTriangle, MoreHorizontal,
  ArrowDownCircle, ArrowUpCircle, ClipboardList, ArrowLeftRight, ScanLine,
  Barcode, ClipboardCheck, FileText, Users, Factory, User, Settings, Shield,
  MessageSquareText, BarChart3, Heart, Truck, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Drawer, DrawerContent, DrawerTrigger, DrawerClose,
} from "@/components/ui/drawer";

const mainTabs = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "Medicamentos", url: "/medicamentos", icon: Pill },
  { title: "Estoque", url: "/medicamentos", icon: Package },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle },
];

const moreGroups = [
  {
    label: "Farmácia",
    items: [
      { title: "Entrada", url: "/entrada", icon: ArrowDownCircle, roles: ["admin", "farmaceutico", "auxiliar_farmacia"] },
      { title: "Dispensação", url: "/dispensacao", icon: ArrowUpCircle, roles: ["admin", "farmaceutico", "enfermeiro"] },
      { title: "Movimentações", url: "/movimentacoes", icon: ClipboardList, roles: null },
    ],
  },
  {
    label: "Clínico",
    items: [
      { title: "Pacientes", url: "/pacientes", icon: User, roles: null },
      { title: "Prescrições", url: "/prescricoes", icon: FileText, roles: ["admin", "farmaceutico", "enfermeiro"] },
      { title: "Solicitações", url: "/solicitacoes", icon: MessageSquareText, roles: ["admin", "farmaceutico", "enfermeiro", "auxiliar_farmacia"] },
      { title: "Plantão", url: "/plantao", icon: ClipboardList, roles: ["admin", "enfermeiro"] },
      { title: "Atrasos", url: "/atrasos", icon: AlertTriangle, roles: ["admin", "farmaceutico", "enfermeiro"] },
    ],
  },
  {
    label: "Logística",
    items: [
      { title: "Transferências", url: "/transferencias", icon: ArrowLeftRight, roles: ["admin", "farmaceutico"] },
      { title: "Fornecedores", url: "/fornecedores", icon: Factory, roles: ["admin", "farmaceutico"] },
      { title: "Inventário", url: "/inventario", icon: ClipboardCheck, roles: ["admin", "farmaceutico"] },
      { title: "Kits", url: "/kits", icon: Package, roles: ["admin", "farmaceutico"] },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { title: "Leitor", url: "/leitor", icon: ScanLine, roles: null },
      { title: "Etiquetas", url: "/etiquetas", icon: Barcode, roles: ["admin", "farmaceutico"] },
      { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: null },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Usuários", url: "/usuarios", icon: Users, roles: ["admin"] },
      { title: "Admin", url: "/admin", icon: Shield, roles: ["admin"] },
      { title: "Configurações", url: "/configuracoes", icon: Settings, roles: ["admin"] },
    ],
  },
];

const allMoreUrls = moreGroups.flatMap((g) => g.items.map((i) => i.url));

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role;

  const isActive = (path: string) => location.pathname === path;
  const isMoreActive = allMoreUrls.some((u) => isActive(u));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl pb-safe">
      <div className="flex items-stretch justify-around h-14">
        {mainTabs.map((tab) => {
          const active = isActive(tab.url);
          return (
            <button
              key={tab.url}
              onClick={() => navigate(tab.url)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} />
              <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>{tab.title}</span>
            </button>
          );
        })}

        <Drawer>
          <DrawerTrigger asChild>
            <button
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={1.6} />
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="pb-safe max-h-[72dvh]">
            <div className="p-4 pt-2 overflow-y-auto">
              <div className="w-8 h-1 rounded-full bg-muted mx-auto mb-4" />

              {moreGroups.map((group, gi) => {
                const filtered = group.items.filter(
                  (item) => !item.roles || (role && item.roles.includes(role))
                );
                if (filtered.length === 0) return null;

                return (
                  <div key={group.label} className={cn(gi > 0 && "mt-4")}>
                    <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/50 px-1 mb-2 block">
                      {group.label}
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {filtered.map((item) => {
                        const active = isActive(item.url);
                        return (
                          <DrawerClose key={item.url} asChild>
                            <button
                              onClick={() => navigate(item.url)}
                              className={cn(
                                "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted/50"
                              )}
                            >
                              <item.icon className="h-5 w-5" strokeWidth={active ? 2 : 1.6} />
                              <span className={cn("text-[10px] leading-tight text-center", active ? "font-semibold" : "font-medium")}>
                                {item.title}
                              </span>
                            </button>
                          </DrawerClose>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
});
