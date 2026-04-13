import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Input universal que aceita digitação + scan via câmera (html5-qrcode).
 * Usar onde quer que entre código de barras de medicamento ou pulseira.
 */
export function ScanInput({
  value, onChange, onScan, placeholder = "Escanear ou digitar", className, autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onScan?: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const readerRef = useRef<Html5Qrcode | null>(null);

  async function start() {
    if (scanning) return;
    setScanning(true);
    try {
      await new Promise((r) => setTimeout(r, 50)); // deixa o <div> aparecer
      const reader = new Html5Qrcode("scan-reader");
      readerRef.current = reader;
      await reader.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 120 } },
        (decoded) => {
          onChange(decoded);
          onScan?.(decoded);
          void stop();
        },
        () => {
          // ignora frames sem leitura
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Câmera indisponível");
      setScanning(false);
    }
  }

  async function stop() {
    if (readerRef.current) {
      try {
        await readerRef.current.stop();
        await readerRef.current.clear();
      } catch {
        // noop
      }
      readerRef.current = null;
    }
    setScanning(false);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
        <Button
          type="button"
          variant={scanning ? "destructive" : "outline"}
          size="icon"
          onClick={() => (scanning ? stop() : start())}
          aria-label={scanning ? "Parar scan" : "Abrir câmera"}
          data-no-lift
        >
          {scanning ? <X className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
        </Button>
      </div>
      {scanning && (
        <div
          id="scan-reader"
          className="overflow-hidden rounded-xl border"
          style={{ width: "100%" }}
        />
      )}
    </div>
  );
}
