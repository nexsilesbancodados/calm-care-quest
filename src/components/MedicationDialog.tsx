import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, FORMS, type Medication, type MedicationCategory } from "@/types/medication";

interface MedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication?: Medication | null;
  onSave: (data: Omit<Medication, "id" | "lastUpdated">) => void;
  onDelete?: (id: string) => void;
}

export function MedicationDialog({ open, onOpenChange, medication, onSave, onDelete }: MedicationDialogProps) {
  const isEdit = !!medication;
  const { can } = useAuth();

  const [form, setForm] = useState(() => getDefaults(medication));

  function getDefaults(med?: Medication | null) {
    return {
      name: med?.name ?? "",
      genericName: med?.genericName ?? "",
      category: med?.category ?? ("antipsicótico" as MedicationCategory),
      dosage: med?.dosage ?? "",
      form: med?.form ?? "Comprimido",
      manufacturer: med?.manufacturer ?? "",
      batchNumber: med?.batchNumber ?? "",
      expirationDate: med?.expirationDate ?? "",
      currentStock: med?.currentStock ?? 0,
      minimumStock: med?.minimumStock ?? 0,
      location: med?.location ?? "",
      controlledSubstance: med?.controlledSubstance ?? true,
      notes: med?.notes ?? "",
    };
  }

  // Reset form when dialog opens with new data
  const handleOpenChange = (o: boolean) => {
    if (o) setForm(getDefaults(medication));
    onOpenChange(o);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Editar Medicamento" : "Novo Medicamento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome Comercial</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome Genérico</Label>
              <Input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as MedicationCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Forma Farmacêutica</Label>
              <Select value={form.form} onValueChange={(v) => setForm({ ...form, form: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Dosagem</Label>
              <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="Ex: 10mg" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Fabricante</Label>
              <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nº do Lote</Label>
              <Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Estoque Atual</Label>
              <Input type="number" min={0} value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Estoque Mínimo</Label>
              <Input type="number" min={0} value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Validade</Label>
              <Input type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Localização</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: A1-P3" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch checked={form.controlledSubstance} onCheckedChange={(v) => setForm({ ...form, controlledSubstance: v })} />
              <Label className="text-xs font-medium">Substância Controlada</Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <div className="flex justify-between pt-2">
            {isEdit && onDelete ? (
              can("delete") ? (
                <Button type="button" variant="destructive" size="sm" onClick={() => { onDelete(medication!.id); onOpenChange(false); }}>
                  Excluir
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="destructive" size="sm" disabled>Excluir</Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Apenas administradores podem excluir</p></TooltipContent>
                </Tooltip>
              )
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary text-primary-foreground">
                {isEdit ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
