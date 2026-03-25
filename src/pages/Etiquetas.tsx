import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeCanvas } from "@/components/BarcodeCanvas";
import { QRCodeCanvas } from "@/components/QRCodeCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Printer, Search, CheckSquare, Square, ScanBarcode, QrCode, Settings2, Eye } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import JsBarcode from "jsbarcode";
import type { Medicamento, Lote } from "@/types/database";

type CodeType = "barcode" | "qrcode";
type LabelSize = "small" | "medium" | "large";
const labelSizes: Record<LabelSize, { w: number; h: number; label: string }> = {
  small: { w: 200, h: 100, label: "Pequena (50×25mm)" },
  medium: { w: 280, h: 140, label: "Média (70×35mm)" },
  large: { w: 380, h: 180, label: "Grande (95×45mm)" },
};

function generateBarcodeSvgString(value: string): string {
  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svgEl, value, { format: "CODE128", width: 1.5, height: 35, displayValue: true, fontSize: 10, margin: 2, lineColor: "#1a1a2e", background: "#ffffff" });
    return new XMLSerializer().serializeToString(svgEl);
  } catch { return ""; }
}

const Etiquetas = () => {
  const [meds, setMeds] = useState<(Medicamento & { lotes: Lote[] })[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [codeType, setCodeType] = useState<CodeType>("barcode");
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const [copies, setCopies] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: medsData }, { data: lotesData }] = await Promise.all([
        supabase.from("medicamentos").select("*").eq("ativo", true).order("nome"),
        supabase.from("lotes").select("*").eq("ativo", true),
      ]);
      setMeds((medsData || []).map((m: any) => ({ ...m, lotes: (lotesData || []).filter((l: any) => l.medicamento_id === m.id) })));
    };
    fetch();
  }, []);

  const filteredMeds = meds.filter(m => !search || m.nome.toLowerCase().includes(search.toLowerCase()) || m.codigo_barras?.includes(search));
  const selectedMeds = meds.filter(m => selectedIds.has(m.id));
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(selectedIds.size === filteredMeds.length ? new Set() : new Set(filteredMeds.map(m => m.id)));

  const handlePrint = () => {
    if (selectedMeds.length === 0) { toast.error("Selecione pelo menos um medicamento"); return; }
    const pw = window.open("", "_blank");
    if (!pw) { toast.error("Popup bloqueado"); return; }
    const size = labelSizes[labelSize];

    const labels = selectedMeds.flatMap(m => {
      const code = m.codigo_barras || m.id.substring(0, 12);
      const barcodeSvg = codeType === "barcode" ? generateBarcodeSvgString(code) : "";
      return Array.from({ length: copies }, () => `
        <div style="width:${size.w}px;height:${size.h}px;border:1px solid #ddd;border-radius:6px;padding:8px;display:inline-flex;flex-direction:column;justify-content:space-between;margin:4px;font-family:Arial,sans-serif;page-break-inside:avoid;overflow:hidden;">
          <div>
            <div style="font-size:11px;font-weight:bold;line-height:1.2;">${m.nome}</div>
            <div style="font-size:9px;color:#666;">${m.concentracao} • ${m.forma_farmaceutica}</div>
          </div>
          <div style="text-align:center;flex:1;display:flex;align-items:center;justify-content:center;">
            ${codeType === "barcode" ? barcodeSvg : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(code)}" style="height:${Math.min(size.h - 60, 80)}px;" />`}
          </div>
          <div style="font-size:8px;color:#666;display:flex;justify-content:space-between;">
            <span>${m.codigo_barras || "—"}</span>
            <span>Local: ${m.localizacao}</span>
          </div>
        </div>
      `);
    }).join("");

    pw.document.write(`<!DOCTYPE html><html><head><title>Etiquetas — PsiRumoCerto</title><style>@media print{@page{margin:8mm}}body{display:flex;flex-wrap:wrap;padding:8px;}</style></head><body>${labels}</body><script>window.onload=function(){window.print()}<\/script></html>`);
    pw.document.close();
    toast.success(`${selectedMeds.length * copies} etiquetas preparadas`);
  };

  return (
    <AppLayout title="Etiquetas & Códigos" subtitle="Geração e impressão">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
            </div>
            <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2 shrink-0">
              {selectedIds.size === filteredMeds.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {selectedIds.size === filteredMeds.length ? "Desmarcar" : "Selecionar"} Todos
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {filteredMeds.map((med, i) => (
              <motion.div key={med.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => toggleSelect(med.id)}
                className={cn("rounded-xl border p-3 cursor-pointer transition-all hover:shadow-card-hover", selectedIds.has(med.id) ? "border-primary bg-primary/5" : "bg-card")}>
                <div className="flex items-start gap-3">
                  <Checkbox checked={selectedIds.has(med.id)} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{med.nome}</p>
                    <p className="text-xs text-muted-foreground">{med.concentracao} • {med.forma_farmaceutica}</p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-1">Código: {med.codigo_barras || "—"}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Card className="p-5 shadow-card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Settings2 className="h-4 w-4 text-primary" />Configurações</div>
            <div className="space-y-1.5"><Label className="text-xs">Tipo de Código</Label>
              <Select value={codeType} onValueChange={v => setCodeType(v as CodeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="barcode"><div className="flex items-center gap-2"><ScanBarcode className="h-3.5 w-3.5" />Código de Barras</div></SelectItem>
                  <SelectItem value="qrcode"><div className="flex items-center gap-2"><QrCode className="h-3.5 w-3.5" />QR Code</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Tamanho</Label>
              <Select value={labelSize} onValueChange={v => setLabelSize(v as LabelSize)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(labelSizes).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Cópias por medicamento</Label><Input type="number" min={1} max={100} value={copies} onChange={e => setCopies(Math.max(1, Number(e.target.value)))} /></div>
            <Separator />
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Selecionados</span><span className="font-semibold">{selectedMeds.length}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total etiquetas</span><span className="font-semibold">{selectedMeds.length * copies}</span></div>
            <Button className="w-full gap-2 gradient-primary text-primary-foreground" onClick={handlePrint} disabled={selectedMeds.length === 0}><Printer className="h-4 w-4" />Imprimir</Button>
          </Card>

          {/* Preview */}
          {selectedMeds.length > 0 && (
            <Card className="p-4 shadow-card">
              <p className="text-xs font-semibold mb-3 flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-primary" />Pré-visualização</p>
              <div className="space-y-3">
                {selectedMeds.slice(0, 2).map(med => (
                  <div key={med.id} className="border rounded-lg p-3 bg-white text-black">
                    <p className="text-[11px] font-bold">{med.nome}</p>
                    <p className="text-[9px] text-gray-500">{med.concentracao} • {med.forma_farmaceutica}</p>
                    <div className="my-2 flex justify-center">
                      {codeType === "barcode" ? (
                        <BarcodeCanvas value={med.codigo_barras || med.id.substring(0, 12)} height={30} width={1.2} fontSize={9} />
                      ) : (
                        <QRCodeCanvas value={med.codigo_barras || med.id.substring(0, 12)} size={64} />
                      )}
                    </div>
                    <div className="flex justify-between text-[8px] text-gray-400">
                      <span>{med.codigo_barras || "—"}</span>
                      <span>Local: {med.localizacao}</span>
                    </div>
                  </div>
                ))}
                {selectedMeds.length > 2 && <p className="text-[10px] text-muted-foreground text-center">+{selectedMeds.length - 2} mais...</p>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Etiquetas;
