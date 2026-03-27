import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScanLine, Camera, CameraOff, Keyboard, Package, ArrowDownCircle, ArrowUpCircle, Eye, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getEstoqueTotal, getEstoqueStatus, ESTOQUE_STATUS_CONFIG } from "@/types/database";
import type { Lote } from "@/types/database";

const LeitorBarcode = () => {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const navigate = useNavigate();

  const handleSearch = async (searchCode: string) => {
    if (!searchCode.trim()) return;
    const { data } = await supabase
      .from("medicamentos")
      .select("*, lotes(*)")
      .eq("codigo_barras", searchCode.trim())
      .eq("ativo", true)
      .single();
    if (data) {
      setResult(data);
      toast.success(`Encontrado: ${data.nome}`);
    } else {
      setResult(null);
      toast.error("Medicamento não encontrado para este código");
    }
  };

  const startCamera = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;
      setCameraActive(true);
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 150 } },
        (decodedText) => {
          setCode(decodedText);
          handleSearch(decodedText);
          stopCamera();
        },
        () => {}
      );
    } catch (err: any) {
      toast.error("Não foi possível acessar a câmera: " + (err.message || err));
      setCameraActive(false);
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  };

  useEffect(() => { return () => { stopCamera(); }; }, []);

  const lotes: Lote[] = result?.lotes?.filter((l: Lote) => l.ativo) || [];
  const estoqueTotal = getEstoqueTotal(lotes);
  const status = result ? getEstoqueStatus(estoqueTotal, result.estoque_minimo) : "normal";
  const statusCfg = ESTOQUE_STATUS_CONFIG[status];

  return (
    <AppLayout title="Leitor de Código de Barras" subtitle="Escaneie ou digite o código EAN">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ScanLine className="h-5 w-5 text-primary" />
              Scanner
            </div>
            <Button variant={cameraActive ? "destructive" : "outline"} size="sm" className="gap-2 text-xs" onClick={cameraActive ? stopCamera : startCamera}>
              {cameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
              {cameraActive ? "Parar Câmera" : "Usar Câmera"}
            </Button>
          </div>
          <div id="barcode-reader" className={cn("rounded-lg overflow-hidden border bg-muted/30 transition-all", cameraActive ? "h-[240px]" : "h-0 border-0")} />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch(code)} placeholder="Digite ou escaneie o código EAN..." className="pl-10 font-mono" autoFocus />
            </div>
            <Button onClick={() => handleSearch(code)} className="gradient-primary text-primary-foreground shrink-0">Buscar</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Conecte um leitor USB, use a câmera ou digite manualmente o código de barras.</p>
        </Card>

        {result && (
          <div>
            <Card className="p-6 shadow-card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{result.nome}</h3>
                  <p className="text-sm text-muted-foreground">{result.generico} • {result.concentracao} • {result.forma_farmaceutica}</p>
                </div>
                <Badge variant="outline" className={cn("text-xs", statusCfg.className)}>{statusCfg.label}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/30 p-3 text-center"><p className="text-[11px] text-muted-foreground">Estoque Total</p><p className="text-xl font-bold">{estoqueTotal}</p></div>
                <div className="rounded-lg bg-muted/30 p-3 text-center"><p className="text-[11px] text-muted-foreground">Est. Mínimo</p><p className="text-xl font-bold">{result.estoque_minimo}</p></div>
                <div className="rounded-lg bg-muted/30 p-3 text-center"><p className="text-[11px] text-muted-foreground">Lotes Ativos</p><p className="text-xl font-bold">{lotes.length}</p></div>
                <div className="rounded-lg bg-muted/30 p-3 text-center"><p className="text-[11px] text-muted-foreground">Local</p><p className="text-lg font-bold font-mono">{result.localizacao || "—"}</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.controlado && <Badge variant="outline" className="bg-primary/10 text-primary">Controlado</Badge>}
                <Badge variant="outline" className="font-mono text-[11px]">EAN: {result.codigo_barras}</Badge>
              </div>

              {lotes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Lotes</p>
                    {lotes.map((l) => {
                      const daysLeft = Math.ceil((new Date(l.validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={l.id} className="flex items-center gap-3 text-sm rounded-lg border p-2.5">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs">{l.numero_lote}</span>
                          <span className="text-muted-foreground">|</span>
                          <span>{l.quantidade_atual} un.</span>
                          <span className="text-muted-foreground ml-auto text-xs">Val: {new Date(l.validade).toLocaleDateString("pt-BR")}</span>
                          {daysLeft <= 60 && daysLeft > 0 && <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning">{daysLeft}d</Badge>}
                          {daysLeft <= 0 && <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive">Vencido</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <Separator />
              {/* Quick Actions with query params */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate(`/dispensacao?medicamento_id=${result.id}`)}>
                  <ArrowUpCircle className="h-3.5 w-3.5" /> Dispensar
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate(`/entrada?medicamento_id=${result.id}`)}>
                  <ArrowDownCircle className="h-3.5 w-3.5" /> Entrada
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate(`/estoque?search=${result.codigo_barras || result.nome}`)}>
                  <Eye className="h-3.5 w-3.5" /> Ver Estoque
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate(`/etiquetas?medicamento_id=${result.id}`)}>
                  <Tag className="h-3.5 w-3.5" /> Etiqueta
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LeitorBarcode;
