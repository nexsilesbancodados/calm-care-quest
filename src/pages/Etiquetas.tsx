import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { BarcodeCanvas } from "@/components/BarcodeCanvas";
import { QRCodeCanvas } from "@/components/QRCodeCanvas";
import { useMedicationContext } from "@/contexts/MedicationContext";
import { CATEGORIES, type Medication } from "@/types/medication";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Printer, Search, CheckSquare, Square, ScanBarcode, QrCode,
  Tags, Settings2, Eye, Download,
} from "lucide-react";
import { toast } from "sonner";

type CodeType = "barcode" | "qrcode";
type LabelSize = "small" | "medium" | "large";

const labelSizes: Record<LabelSize, { w: number; h: number; label: string }> = {
  small: { w: 200, h: 100, label: "Pequena (50×25mm)" },
  medium: { w: 280, h: 140, label: "Média (70×35mm)" },
  large: { w: 380, h: 180, label: "Grande (95×45mm)" },
};

const Etiquetas = () => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [codeType, setCodeType] = useState<CodeType>("barcode");
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const [copies, setCopies] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const filteredMeds = mockMedications.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.batchNumber.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredMeds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMeds.map((m) => m.id)));
    }
  };

  const selectedMeds = mockMedications.filter((m) => selectedIds.has(m.id));

  const generateCodeValue = (med: Medication) => {
    return `${med.batchNumber}-${med.name.replace(/\s/g, "").substring(0, 10)}`;
  };

  const generateQRData = (med: Medication) => {
    return JSON.stringify({
      id: med.id,
      name: med.name,
      batch: med.batchNumber,
      dosage: med.dosage,
      exp: med.expirationDate,
      loc: med.location,
    });
  };

  const handlePrint = useCallback(() => {
    if (selectedMeds.length === 0) {
      toast.error("Selecione pelo menos um medicamento");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup bloqueado. Permita popups para imprimir.");
      return;
    }

    const size = labelSizes[labelSize];

    // Build labels HTML with inline styles for print
    const labelsHtml = selectedMeds
      .flatMap((med) => Array.from({ length: copies }, () => med))
      .map((med) => {
        const codeId = `code-${med.id}-${Math.random().toString(36).slice(2)}`;
        const cat = CATEGORIES.find((c) => c.value === med.category);
        return `
          <div style="width:${size.w}px;height:${size.h}px;border:1px solid #ddd;border-radius:6px;padding:8px;display:inline-flex;flex-direction:column;justify-content:space-between;margin:4px;font-family:Arial,sans-serif;page-break-inside:avoid;overflow:hidden;">
            <div>
              <div style="font-size:${labelSize === "small" ? 9 : 11}px;font-weight:bold;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${med.name}</div>
              <div style="font-size:${labelSize === "small" ? 7 : 9}px;color:#666;margin-top:1px;">${med.dosage} • ${med.form} ${labelSize !== "small" ? `• ${cat?.label || ""}` : ""}</div>
            </div>
            <div style="text-align:center;" id="${codeId}"></div>
            <div style="display:flex;justify-content:space-between;font-size:${labelSize === "small" ? 7 : 8}px;color:#666;">
              <span>Lote: ${med.batchNumber}</span>
              <span>Val: ${new Date(med.expirationDate).toLocaleDateString("pt-BR")}</span>
            </div>
            ${labelSize === "large" ? `<div style="font-size:7px;color:#999;">Local: ${med.location} | ${med.controlledSubstance ? "⚠ Controlado" : ""}</div>` : ""}
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas - PsiFarma</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3/dist/JsBarcode.all.min.js"><\/script>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1/build/qrcode.min.js"><\/script>
        <style>
          @media print {
            body { margin: 0; }
            @page { margin: 8mm; }
          }
          body { display: flex; flex-wrap: wrap; align-content: flex-start; padding: 8px; }
        </style>
      </head>
      <body>${labelsHtml}</body>
      <script>
        window.onload = function() {
          ${selectedMeds.flatMap((med) =>
            Array.from({ length: copies }, (_, i) => {
              const codeVal = generateCodeValue(med);
              const qrVal = generateQRData(med);
              return codeType === "barcode"
                ? `try { JsBarcode("#code-${med.id}-" + document.querySelectorAll("[id^='code-${med.id}-']")[${i}]?.id.split("-").pop(), "${codeVal}", { format: "CODE128", width: ${labelSize === "small" ? 1 : 1.5}, height: ${labelSize === "small" ? 25 : 35}, displayValue: true, fontSize: ${labelSize === "small" ? 8 : 10}, margin: 2 }); } catch(e) {}`
                : "";
            })
          ).join("\n")}
          setTimeout(function() { window.print(); }, 800);
        };
      <\/script>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Preparando ${selectedMeds.length * copies} etiquetas para impressão`);
  }, [selectedMeds, copies, codeType, labelSize]);

  return (
    <AppLayout title="Etiquetas & Códigos" subtitle="Geração e impressão em lote de etiquetas com códigos de barras">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Medication Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search + Select All */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar medicamento ou lote..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
            </div>
            <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2 shrink-0">
              {selectedIds.size === filteredMeds.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {selectedIds.size === filteredMeds.length ? "Desmarcar" : "Selecionar"} Todos
            </Button>
          </div>

          {/* Medication Grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            {filteredMeds.map((med, i) => {
              const isSelected = selectedIds.has(med.id);
              const cat = CATEGORIES.find((c) => c.value === med.category);
              return (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => toggleSelect(med.id)}
                  className={cn(
                    "rounded-xl border p-3 cursor-pointer transition-all hover:shadow-card-hover",
                    isSelected ? "border-primary bg-primary/5 shadow-card" : "bg-card hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={isSelected} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{med.name}</p>
                        {med.controlledSubstance && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 shrink-0">Ctrl</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{med.dosage} • {med.form}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">Lote: {med.batchNumber}</span>
                        <span>Local: {med.location}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right: Settings & Preview */}
        <div className="space-y-4">
          {/* Settings */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Settings2 className="h-4 w-4 text-primary" />
                Configurações da Etiqueta
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tipo de Código</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={codeType === "barcode" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCodeType("barcode")}
                    className={cn("gap-2", codeType === "barcode" && "gradient-primary text-primary-foreground")}
                  >
                    <ScanBarcode className="h-3.5 w-3.5" /> Código de Barras
                  </Button>
                  <Button
                    variant={codeType === "qrcode" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCodeType("qrcode")}
                    className={cn("gap-2", codeType === "qrcode" && "gradient-primary text-primary-foreground")}
                  >
                    <QrCode className="h-3.5 w-3.5" /> QR Code
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tamanho da Etiqueta</Label>
                <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(labelSizes).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cópias por medicamento</Label>
                <Input type="number" min={1} max={100} value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Medicamentos selecionados</span>
                  <span className="font-semibold">{selectedMeds.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total de etiquetas</span>
                  <span className="font-semibold">{selectedMeds.length * copies}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={selectedMeds.length === 0}
                >
                  <Eye className="h-4 w-4" /> Pré-visualizar
                </Button>
                <Button
                  className="flex-1 gap-2 gradient-primary text-primary-foreground"
                  onClick={handlePrint}
                  disabled={selectedMeds.length === 0}
                >
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Scanner Simulation */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <ScannerCard />
          </motion.div>
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && selectedMeds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-6"
        >
          <Card className="p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Tags className="h-4 w-4 text-primary" /> Pré-visualização das Etiquetas
              </div>
              <Badge variant="outline" className="text-xs">{selectedMeds.length * copies} etiquetas</Badge>
            </div>
            <div ref={printRef} className="flex flex-wrap gap-3">
              {selectedMeds.map((med) => (
                <LabelPreview key={med.id} med={med} codeType={codeType} labelSize={labelSize} />
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </AppLayout>
  );
};

function LabelPreview({ med, codeType, labelSize }: { med: Medication; codeType: CodeType; labelSize: LabelSize }) {
  const size = labelSizes[labelSize];
  const cat = CATEGORIES.find((c) => c.value === med.category);
  const codeValue = `${med.batchNumber}-${med.name.replace(/\s/g, "").substring(0, 10)}`;
  const qrData = JSON.stringify({ id: med.id, name: med.name, batch: med.batchNumber, dosage: med.dosage, exp: med.expirationDate });

  return (
    <div
      style={{ width: size.w, height: size.h }}
      className="border rounded-lg p-2 flex flex-col justify-between bg-card shadow-sm"
    >
      <div>
        <p className={cn("font-bold text-foreground truncate", labelSize === "small" ? "text-[9px]" : "text-[11px]")}>
          {med.name}
        </p>
        <p className={cn("text-muted-foreground", labelSize === "small" ? "text-[7px]" : "text-[9px]")}>
          {med.dosage} • {med.form} {labelSize !== "small" && `• ${cat?.label}`}
        </p>
      </div>
      <div className="flex justify-center items-center flex-1">
        {codeType === "barcode" ? (
          <BarcodeCanvas
            value={codeValue}
            width={labelSize === "small" ? 1 : 1.3}
            height={labelSize === "small" ? 20 : 30}
            fontSize={labelSize === "small" ? 7 : 9}
          />
        ) : (
          <QRCodeCanvas value={qrData} size={labelSize === "small" ? 40 : 55} />
        )}
      </div>
      <div className={cn("flex justify-between text-muted-foreground", labelSize === "small" ? "text-[6px]" : "text-[8px]")}>
        <span>Lote: {med.batchNumber}</span>
        <span>Val: {new Date(med.expirationDate).toLocaleDateString("pt-BR")}</span>
      </div>
      {labelSize === "large" && (
        <div className="text-[7px] text-muted-foreground flex justify-between">
          <span>Local: {med.location}</span>
          {med.controlledSubstance && <span className="text-destructive font-medium">⚠ Controlado</span>}
        </div>
      )}
    </div>
  );
}

function ScannerCard() {
  const [scanInput, setScanInput] = useState("");
  const [scannedMed, setScannedMed] = useState<Medication | null>(null);

  const handleScan = () => {
    if (!scanInput.trim()) return;
    const found = mockMedications.find(
      (m) => m.batchNumber.toLowerCase() === scanInput.toLowerCase() ||
        `${m.batchNumber}-${m.name.replace(/\s/g, "").substring(0, 10)}`.toLowerCase() === scanInput.toLowerCase()
    );
    if (found) {
      setScannedMed(found);
      toast.success(`Medicamento encontrado: ${found.name}`);
    } else {
      setScannedMed(null);
      toast.error("Medicamento não encontrado");
    }
  };

  return (
    <Card className="p-5 shadow-card space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ScanBarcode className="h-4 w-4 text-primary" />
        Leitor de Código
      </div>
      <p className="text-xs text-muted-foreground">Simule a leitura inserindo o número do lote ou código de barras.</p>
      <div className="flex gap-2">
        <Input
          placeholder="Ex: RP2024-001"
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          className="font-mono text-xs"
        />
        <Button size="sm" onClick={handleScan} className="gradient-primary text-primary-foreground shrink-0">
          Buscar
        </Button>
      </div>
      {scannedMed && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-accent/30 p-3 space-y-1">
          <p className="text-sm font-semibold">{scannedMed.name}</p>
          <p className="text-xs text-muted-foreground">{scannedMed.genericName}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px]">
            <span className="text-muted-foreground">Dosagem:</span><span className="font-medium">{scannedMed.dosage}</span>
            <span className="text-muted-foreground">Forma:</span><span className="font-medium">{scannedMed.form}</span>
            <span className="text-muted-foreground">Lote:</span><span className="font-mono font-medium">{scannedMed.batchNumber}</span>
            <span className="text-muted-foreground">Estoque:</span><span className="font-medium">{scannedMed.currentStock} un.</span>
            <span className="text-muted-foreground">Local:</span><span className="font-mono font-medium">{scannedMed.location}</span>
            <span className="text-muted-foreground">Validade:</span><span className="font-medium">{new Date(scannedMed.expirationDate).toLocaleDateString("pt-BR")}</span>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

export default Etiquetas;
