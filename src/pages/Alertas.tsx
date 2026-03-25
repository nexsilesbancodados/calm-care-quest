import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, XCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Medicamento, Lote } from "@/types/database";
import { getEstoqueTotal } from "@/types/database";

type AlertType = "esgotado" | "critico" | "validade" | "vencido";

const Alertas = () => {
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetch = async () => {
      const [{ data: medsData }, { data: lotesData }] = await Promise.all([
        supabase.from("medicamentos").select("*").eq("ativo", true),
        supabase.from("lotes").select("*").eq("ativo", true),
      ]);
      setMeds((medsData || []).map((m: any) => ({ ...m, lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id) })));
    };
    fetch();
  }, []);

  const now = new Date();
  const alerts = meds.flatMap(m => {
    const total = getEstoqueTotal(m.lotes);
    const items: { id: string; type: AlertType; title: string; desc: string; icon: any }[] = [];
    if (total === 0) items.push({ id: `${m.id}-esg`, type: "esgotado", title: `${m.nome} esgotado`, desc: "Sem estoque disponível", icon: XCircle });
    else if (m.estoque_minimo > 0 && total <= m.estoque_minimo * 0.25) items.push({ id: `${m.id}-crit`, type: "critico", title: `${m.nome} crítico`, desc: `Estoque: ${total}/${m.estoque_minimo}`, icon: AlertTriangle });
    m.lotes.forEach(l => {
      const diff = (new Date(l.validade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 0) items.push({ id: `${l.id}-venc`, type: "vencido", title: `${m.nome} VENCIDO`, desc: `Lote ${l.numero_lote} venceu em ${new Date(l.validade).toLocaleDateString("pt-BR")}`, icon: ShieldAlert });
      else if (diff <= 60) items.push({ id: `${l.id}-val`, type: "validade", title: `${m.nome} vence em breve`, desc: `Lote ${l.numero_lote} — ${Math.ceil(diff)} dias`, icon: Clock });
    });
    return items;
  }).filter(a => !resolvedIds.has(a.id));

  const typeCfg: Record<AlertType, { label: string; className: string }> = {
    esgotado: { label: "Esgotado", className: "bg-muted text-muted-foreground" },
    critico: { label: "Crítico", className: "bg-destructive/10 text-destructive" },
    validade: { label: "Validade", className: "bg-warning/10 text-warning" },
    vencido: { label: "Vencido", className: "bg-destructive/10 text-destructive" },
  };

  return (
    <AppLayout title="Alertas" subtitle={`${alerts.length} alertas ativos`}>
      <div className="space-y-3 max-w-3xl">
        {alerts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Nenhum alerta no momento ✓</div>
        ) : alerts.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-card">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", typeCfg[a.type].className)}>
              <a.icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{a.title}</p>
                <Badge variant="outline" className={cn("text-[10px]", typeCfg[a.type].className)}>{typeCfg[a.type].label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => { setResolvedIds(p => new Set([...p, a.id])); toast.success("Alerta resolvido"); }}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
            </Button>
          </motion.div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Alertas;
