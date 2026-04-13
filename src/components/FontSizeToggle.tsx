import { useEffect } from "react";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Type } from "lucide-react";

const SIZES = { compacto: 14, padrao: 16, grande: 18 } as const;
type Size = keyof typeof SIZES;

export function useAppFontSize() {
  const [size, setSize] = usePersistedState<Size>("app-font-size", "padrao");

  useEffect(() => {
    document.documentElement.style.setProperty("--app-base-font-size", `${SIZES[size]}px`);
    document.documentElement.dataset.fontSize = size;
  }, [size]);

  return { size, setSize };
}

export function FontSizeToggle() {
  const { size, setSize } = useAppFontSize();
  const order: Size[] = ["compacto", "padrao", "grande"];
  const idx = order.indexOf(size);

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1" role="group" aria-label="Tamanho da fonte">
      <Button
        size="icon" variant="ghost" className="h-7 w-7"
        disabled={idx === 0}
        onClick={() => setSize(order[idx - 1])}
        aria-label="Diminuir fonte"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Type className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {size}
      </span>
      <Button
        size="icon" variant="ghost" className="h-7 w-7"
        disabled={idx === order.length - 1}
        onClick={() => setSize(order[idx + 1])}
        aria-label="Aumentar fonte"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
