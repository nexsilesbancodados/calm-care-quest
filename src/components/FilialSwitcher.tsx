import { useState, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Filial {
  id: string;
  nome: string;
}

export function FilialSwitcher() {
  const { profile, isAdmin, refreshProfile } = useAuth();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { data } = await supabase
        .from("filiais")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (data) setFiliais(data);
    };
    load();
  }, [isAdmin]);

  if (!isAdmin || filiais.length === 0) return null;

  const currentFilial = filiais.find((f) => f.id === profile?.filial_id);

  const handleSwitch = async (filialId: string) => {
    if (filialId === profile?.filial_id) return;
    setSwitching(true);
    const { error } = await supabase.rpc("set_active_filial", { _filial_id: filialId });
    if (error) {
      toast.error("Erro ao trocar unidade");
      setSwitching(false);
      return;
    }
    await refreshProfile();
    setSwitching(false);
    toast.success(`Unidade alterada para ${filiais.find((f) => f.id === filialId)?.nome}`);
    // Force page data refresh
    window.dispatchEvent(new Event("filial-changed"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={switching}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 px-2.5 py-1.5 text-xs transition-all group outline-none",
            switching && "opacity-50 pointer-events-none"
          )}
        >
          <Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
          <span className="text-[11px] font-semibold text-foreground/80 truncate max-w-[140px]">
            {currentFilial?.nome || "Unidade"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-2xl p-1.5 shadow-elevated">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold px-3 py-1.5">
          Trocar Unidade
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-2" />
        {filiais.map((f) => {
          const active = f.id === profile?.filial_id;
          return (
            <DropdownMenuItem
              key={f.id}
              onClick={() => handleSwitch(f.id)}
              className={cn(
                "gap-2.5 text-xs cursor-pointer rounded-xl mx-1 py-2.5",
                active && "bg-primary/8 text-primary font-semibold"
              )}
            >
              <Building2 className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
              <span className="flex-1 truncate">{f.nome}</span>
              {active && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
