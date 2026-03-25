import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMedicationContext } from "@/contexts/MedicationContext";
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
  LayoutDashboard, Pill, Users, AlertTriangle, ClipboardList,
  Package, Barcode, ArrowLeftRight, Factory, BarChart3, Settings, Search,
} from "lucide-react";

const pages = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Medicamentos", path: "/medicamentos", icon: Pill },
  { name: "Pacientes", path: "/pacientes", icon: Users },
  { name: "Alertas", path: "/alertas", icon: AlertTriangle },
  { name: "Movimentações", path: "/movimentacoes", icon: ClipboardList },
  { name: "Estoque", path: "/estoque", icon: Package },
  { name: "Etiquetas", path: "/etiquetas", icon: Barcode },
  { name: "Transferências", path: "/transferencias", icon: ArrowLeftRight },
  { name: "Fornecedores", path: "/fornecedores", icon: Factory },
  { name: "Relatórios", path: "/relatorios", icon: BarChart3 },
  { name: "Configurações", path: "/configuracoes", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-muted-foreground text-xs hover:bg-accent/50 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Buscar...</span>
        <kbd className="ml-2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar página, medicamento..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Páginas">
            {pages.map((page) => (
              <CommandItem key={page.path} onSelect={() => goTo(page.path)} className="gap-3">
                <page.icon className="h-4 w-4 text-muted-foreground" />
                {page.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Medicamentos">
            {(() => { const { medications } = useMedicationContext(); return medications.slice(0, 8).map((med) => (
              <CommandItem key={med.id} onSelect={() => goTo("/medicamentos")} className="gap-3">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span>{med.name} {med.dosage}</span>
                  <span className="text-[11px] text-muted-foreground ml-2">Lote {med.batchNumber}</span>
                </div>
              </CommandItem>
            )); })()}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
