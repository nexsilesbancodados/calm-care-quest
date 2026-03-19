import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES, getStockStatus, getStockStatusConfig, type Medication } from "@/types/medication";
import { cn } from "@/lib/utils";
import { Edit, Trash2, Pill, MapPin, Factory, Calendar, Package, FileText, ShieldCheck } from "lucide-react";

interface MedicationDetailProps {
  medication: Medication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (med: Medication) => void;
  onDelete: (id: string) => void;
}

export function MedicationDetail({ medication, open, onOpenChange, onEdit, onDelete }: MedicationDetailProps) {
  if (!medication) return null;

  const status = getStockStatus(medication.currentStock, medication.minimumStock);
  const statusConfig = getStockStatusConfig(status);
  const cat = CATEGORIES.find((c) => c.value === medication.category);
  const isExpired = new Date(medication.expirationDate) < new Date();
  const daysUntilExpiry = Math.ceil((new Date(medication.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const stockPercent = medication.minimumStock > 0
    ? Math.min(100, Math.round((medication.currentStock / (medication.minimumStock * 2)) * 100))
    : 100;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[440px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl font-bold">{medication.name}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{medication.genericName}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className={cn("text-xs", cat?.color)}>{cat?.label}</Badge>
            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>{statusConfig.label}</Badge>
            {medication.controlledSubstance && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                <ShieldCheck className="h-3 w-3 mr-1" /> Controlado
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator />

        <div className="space-y-5 py-5">
          {/* Stock Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nível de Estoque</span>
              <span className="font-semibold">{medication.currentStock} <span className="text-muted-foreground font-normal">/ {medication.minimumStock} mín.</span></span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", {
                  "bg-success": status === "normal",
                  "bg-warning": status === "baixo",
                  "bg-destructive": status === "crítico" || status === "esgotado",
                })}
                style={{ width: `${stockPercent}%` }}
              />
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={Pill} label="Forma" value={`${medication.form} • ${medication.dosage}`} />
            <InfoItem icon={Factory} label="Fabricante" value={medication.manufacturer} />
            <InfoItem icon={Package} label="Lote" value={medication.batchNumber} mono />
            <InfoItem icon={MapPin} label="Localização" value={medication.location} mono />
            <InfoItem
              icon={Calendar}
              label="Validade"
              value={new Date(medication.expirationDate).toLocaleDateString("pt-BR")}
              highlight={isExpired ? "destructive" : daysUntilExpiry <= 60 ? "warning" : undefined}
              sublabel={isExpired ? "VENCIDO" : daysUntilExpiry <= 60 ? `${daysUntilExpiry} dias restantes` : undefined}
            />
            <InfoItem icon={Calendar} label="Última Atualização" value={new Date(medication.lastUpdated).toLocaleDateString("pt-BR")} />
          </div>

          {/* Notes */}
          {medication.notes && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>Observações</span>
              </div>
              <p className="text-sm bg-muted/50 rounded-lg p-3 leading-relaxed">{medication.notes}</p>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(medication)}>
            <Edit className="h-4 w-4" /> Editar
          </Button>
          <Button variant="destructive" size="icon" onClick={() => onDelete(medication.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({ icon: Icon, label, value, mono, highlight, sublabel }: {
  icon: any; label: string; value: string; mono?: boolean;
  highlight?: "destructive" | "warning"; sublabel?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={cn("text-sm font-medium", mono && "font-mono text-xs", {
        "text-destructive": highlight === "destructive",
        "text-warning": highlight === "warning",
      })}>
        {value}
      </p>
      {sublabel && <p className={cn("text-[11px]", {
        "text-destructive": highlight === "destructive",
        "text-warning": highlight === "warning",
      })}>{sublabel}</p>}
    </div>
  );
}
