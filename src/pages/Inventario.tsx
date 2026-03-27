import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAudit } from "@/contexts/AuditContext";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Search, ClipboardCheck, CheckCircle2, AlertTriangle, Save, RotateCcw, Download, Package } from "lucide-react";
import type { Medicamento, Lote } from "@/types/database";

interface InventoryItem {
  medicamento_id: string;
  medicamento_nome: string;
  lote_id: string;
  numero_lote: string;
  validade: string;
  quantidade_sistema: number;
  quantidade_contada: number | null;
  diferenca: number;
  status: "pendente" | "conferido" | "divergente";
}

const Inventario = () => {
  const { log } = useAudit();
  const { user, isAdmin, can, profile } = useAuth();
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: medsData }, { data: lotesData }] = await Promise.all([
        supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
        supabase.from("lotes").select("*").eq("ativo", true).gt("quantidade_atual", 0),
      ]);
      const medsWithLotes = (medsData || []).map((m: any) => ({
        ...m,
        lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id).sort((a: any, b: any) => a.numero_lote.localeCompare(b.numero_lote)),
      })).filter((m: any) => m.lotes.length > 0);

      setMeds(medsWithLotes);

      // Initialize inventory items
      const invItems: InventoryItem[] = [];
      medsWithLotes.forEach((m: any) => {
        m.lotes.forEach((l: any) => {
          invItems.push({
            medicamento_id: m.id,
            medicamento_nome: `${m.nome} ${m.concentracao}`,
            lote_id: l.id,
            numero_lote: l.numero_lote,
            validade: l.validade,
            quantidade_sistema: l.quantidade_atual,
            quantidade_contada: null,
            diferenca: 0,
            status: "pendente",
          });
        });
      });
      setItems(invItems);
      setLoading(false);
    };
    fetch();
  }, [profile?.filial_id]);

  const updateCount = (loteId: string, value: string) => {
    const num = value === "" ? null : parseInt(value);
    setItems(prev => prev.map(item => {
      if (item.lote_id !== loteId) return item;
      const qtd = num;
      const diff = qtd !== null ? qtd - item.quantidade_sistema : 0;
      return {
        ...item,
        quantidade_contada: qtd,
        diferenca: diff,
        status: qtd === null ? "pendente" : diff === 0 ? "conferido" : "divergente",
      };
    }));
  };

  const filtered = items.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.medicamento_nome.toLowerCase().includes(s) || item.numero_lote.toLowerCase().includes(s);
  });

  const stats = useMemo(() => ({
    total: items.length,
    pendentes: items.filter(i => i.status === "pendente").length,
    conferidos: items.filter(i => i.status === "conferido").length,
    divergentes: items.filter(i => i.status === "divergente").length,
    progress: items.length > 0 ? Math.round(((items.length - items.filter(i => i.status === "pendente").length) / items.length) * 100) : 0,
  }), [items]);

  const divergentItems = items.filter(i => i.status === "divergente");

  const handleApplyAdjustments = async () => {
    if (divergentItems.length === 0) {
      toast.info("Não há divergências para ajustar");
      return;
    }
    setSaving(true);

    for (const item of divergentItems) {
      if (item.quantidade_contada === null) continue;

      await supabase.from("lotes").update({ quantidade_atual: item.quantidade_contada }).eq("id", item.lote_id);

      await supabase.from("movimentacoes").insert({
        tipo: "ajuste" as any,
        medicamento_id: item.medicamento_id,
        lote_id: item.lote_id,
        quantidade: Math.abs(item.diferenca),
        usuario_id: user?.id,
        observacao: `[Inventário Físico] Sistema: ${item.quantidade_sistema} → Contagem: ${item.quantidade_contada} (Δ${item.diferenca > 0 ? "+" : ""}${item.diferenca})`,
        filial_id: profile?.filial_id,
      });

      await log({
        acao: "Ajuste por Inventário",
        tabela: "lotes",
        registro_id: item.lote_id,
        dados_anteriores: { quantidade_atual: item.quantidade_sistema },
        dados_novos: { quantidade_atual: item.quantidade_contada },
      });
    }

    toast.success(`${divergentItems.length} ajuste(s) aplicado(s) com sucesso!`);
    setSaving(false);
    setSaved(true);
    setConfirmOpen(false);

    // Update items to reflect new system values
    setItems(prev => prev.map(item => item.status === "divergente" ? {
      ...item,
      quantidade_sistema: item.quantidade_contada!,
      diferenca: 0,
      status: "conferido" as const,
    } : item));
  };

  const resetAll = () => {
    setItems(prev => prev.map(item => ({
      ...item,
      quantidade_contada: null,
      diferenca: 0,
      status: "pendente" as const,
    })));
    setSaved(false);
  };

  const exportCSV = () => {
    const headers = ["Medicamento", "Lote", "Validade", "Qtd Sistema", "Qtd Contada", "Diferença", "Status"];
    const rows = items.map(i => [
      i.medicamento_nome,
      i.numero_lote,
      new Date(i.validade).toLocaleDateString("pt-BR"),
      i.quantidade_sistema,
      i.quantidade_contada ?? "",
      i.diferenca,
      i.status === "conferido" ? "OK" : i.status === "divergente" ? "DIVERGENTE" : "PENDENTE",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) return <AppLayout title="Inventário Físico"><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></AppLayout>;

  return (
    <AppLayout title="Inventário Físico" subtitle="Contagem e reconciliação de estoque">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Lotes", value: stats.total, icon: Package, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pendentes", value: stats.pendentes, icon: ClipboardCheck, color: "text-muted-foreground", bg: "bg-muted" },
          { label: "Conferidos", value: stats.conferidos, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
          { label: "Divergentes", value: stats.divergentes, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", s.bg)}>
                  <s.icon className={cn("h-4 w-4", s.color)} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <Card className="p-4 shadow-card mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Progresso da Contagem</p>
          <span className="text-sm font-bold text-primary">{stats.progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${stats.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar medicamento ou lote..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={resetAll}>
            <RotateCcw className="h-3.5 w-3.5" /> Limpar
          </Button>
          {divergentItems.length > 0 && (
            <Button size="sm" className="gap-1.5 text-xs gradient-primary text-primary-foreground" onClick={() => setConfirmOpen(true)}>
              <Save className="h-3.5 w-3.5" /> Aplicar {divergentItems.length} Ajuste(s)
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">Medicamento</TableHead>
              <TableHead className="text-xs font-semibold">Lote</TableHead>
              <TableHead className="text-xs font-semibold">Validade</TableHead>
              <TableHead className="text-xs font-semibold text-center">Sistema</TableHead>
              <TableHead className="text-xs font-semibold text-center w-[120px]">Contagem</TableHead>
              <TableHead className="text-xs font-semibold text-center">Diferença</TableHead>
              <TableHead className="text-xs font-semibold text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum item encontrado</TableCell></TableRow>
            ) : filtered.map(item => (
              <TableRow
                key={item.lote_id}
                className={cn(
                  "transition-colors",
                  item.status === "divergente" && "bg-warning/5",
                  item.status === "conferido" && "bg-success/5",
                )}
              >
                <TableCell className="text-sm font-medium">{item.medicamento_nome}</TableCell>
                <TableCell className="text-sm font-mono text-muted-foreground">{item.numero_lote}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(item.validade).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-center font-semibold">{item.quantidade_sistema}</TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    min={0}
                    value={item.quantidade_contada ?? ""}
                    onChange={e => updateCount(item.lote_id, e.target.value)}
                    className="w-[100px] mx-auto h-8 text-center text-sm font-semibold"
                    placeholder="—"
                  />
                </TableCell>
                <TableCell className="text-center">
                  {item.quantidade_contada !== null && (
                    <span className={cn(
                      "text-sm font-bold",
                      item.diferenca > 0 && "text-success",
                      item.diferenca < 0 && "text-destructive",
                      item.diferenca === 0 && "text-muted-foreground",
                    )}>
                      {item.diferenca > 0 ? "+" : ""}{item.diferenca}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn("text-[10px]",
                    item.status === "conferido" && "bg-success/10 text-success border-success/20",
                    item.status === "divergente" && "bg-warning/10 text-warning border-warning/20",
                    item.status === "pendente" && "bg-muted text-muted-foreground",
                  )}>
                    {item.status === "conferido" ? "✓ OK" : item.status === "divergente" ? "⚠ Divergente" : "Pendente"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      {/* Confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirmar Ajustes de Inventário
            </AlertDialogTitle>
            <AlertDialogDescription>
              Serão aplicados <strong>{divergentItems.length}</strong> ajuste(s) de estoque. Esta ação será registrada no log de auditoria e nas movimentações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-40 overflow-auto rounded-lg border bg-muted/30 p-3 space-y-1.5">
            {divergentItems.map(item => (
              <div key={item.lote_id} className="flex justify-between text-xs">
                <span>{item.medicamento_nome} (Lote {item.numero_lote})</span>
                <span className={cn("font-bold", item.diferenca > 0 ? "text-success" : "text-destructive")}>
                  {item.quantidade_sistema} → {item.quantidade_contada} ({item.diferenca > 0 ? "+" : ""}{item.diferenca})
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyAdjustments} disabled={saving} className="gradient-primary text-primary-foreground">
              {saving ? "Aplicando..." : "Confirmar Ajustes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Inventario;
