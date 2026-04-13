import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Pill, ArrowDownCircle, ArrowUpCircle, ClipboardList,
  Package, ArrowLeftRight, ScanLine, Barcode, AlertTriangle, BarChart3,
  Factory, Users, Settings, Search, HeartPulse, ClipboardCheck, Shield,
  Lock, FileText, User as UserIcon,
} from "lucide-react";

const pages = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Medicamentos", icon: Pill, path: "/medicamentos" },
  { title: "Entrada de Medicamentos", icon: ArrowDownCircle, path: "/entrada" },
  { title: "Dispensação", icon: ArrowUpCircle, path: "/dispensacao" },
  { title: "Movimentações", icon: ClipboardList, path: "/movimentacoes" },
  { title: "Estoque", icon: Package, path: "/estoque" },
  { title: "Transferências", icon: ArrowLeftRight, path: "/transferencias" },
  { title: "Leitor de Código", icon: ScanLine, path: "/leitor" },
  { title: "Etiquetas", icon: Barcode, path: "/etiquetas" },
  { title: "Alertas", icon: AlertTriangle, path: "/alertas" },
  { title: "Relatórios", icon: BarChart3, path: "/relatorios" },
  { title: "Fornecedores", icon: Factory, path: "/fornecedores" },
  { title: "Usuários", icon: Users, path: "/usuarios" },
  { title: "Configurações", icon: Settings, path: "/configuracoes" },
  { title: "Pacientes", icon: UserIcon, path: "/pacientes" },
  { title: "Prescrições", icon: FileText, path: "/prescricoes" },
  { title: "Avaliação C-SSRS", icon: HeartPulse, path: "/cssrs" },
  { title: "Administração MAR", icon: ClipboardCheck, path: "/mar" },
  { title: "BMPO — Controlados", icon: BarChart3, path: "/bmpo" },
  { title: "Alergias", icon: AlertTriangle, path: "/alergias" },
  { title: "Consentimento LGPD", icon: Shield, path: "/consentimento" },
  { title: "Segurança da Conta", icon: Lock, path: "/seguranca" },
  { title: "Contenção", icon: Lock, path: "/contencao" },
  { title: "Escalas Psiquiátricas", icon: BarChart3, path: "/escalas" },
  { title: "Evolução Enfermagem", icon: ClipboardCheck, path: "/evolucao" },
  { title: "Plano de Segurança", icon: HeartPulse, path: "/plano-seguranca" },
  { title: "Reconciliação Medicamentosa", icon: ArrowLeftRight, path: "/reconciliacao" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [meds, setMeds] = useState<{ id: string; nome: string; concentracao: string }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open && meds.length === 0) {
      supabase
        .from("medicamentos")
        .select("id, nome, concentracao")
        .eq("ativo", true)
        .order("nome")
        .limit(100)
        .then(({ data }) => setMeds(data || []));
    }
  }, [open]);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar páginas, medicamentos, ações..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        <CommandGroup heading="Páginas">
          {pages.map((p) => (
            <CommandItem key={p.path} onSelect={() => go(p.path)} className="gap-3 cursor-pointer">
              <p.icon className="h-4 w-4 text-muted-foreground" />
              <span>{p.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ações Rápidas">
          <CommandItem onSelect={() => go("/entrada")} className="gap-3 cursor-pointer">
            <ArrowDownCircle className="h-4 w-4 text-success" />
            <span>Registrar entrada de medicamento</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/dispensacao")} className="gap-3 cursor-pointer">
            <ArrowUpCircle className="h-4 w-4 text-info" />
            <span>Realizar dispensação</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/leitor")} className="gap-3 cursor-pointer">
            <ScanLine className="h-4 w-4 text-primary" />
            <span>Escanear código de barras</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/etiquetas")} className="gap-3 cursor-pointer">
            <Barcode className="h-4 w-4 text-primary" />
            <span>Imprimir etiquetas</span>
          </CommandItem>
        </CommandGroup>

        {meds.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Medicamentos">
              {meds.map((m) => (
                <CommandItem
                  key={m.id}
                  onSelect={() => go("/medicamentos")}
                  className="gap-3 cursor-pointer"
                >
                  <Pill className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {m.nome} <span className="text-muted-foreground text-xs">{m.concentracao}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
