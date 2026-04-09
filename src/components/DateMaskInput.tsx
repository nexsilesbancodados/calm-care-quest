import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { parse, format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface DateMaskInputProps {
  /** Value in yyyy-MM-dd format or null */
  value: string | null;
  /** Callback with yyyy-MM-dd string or null */
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Show age after date */
  showAge?: boolean;
}

function formatDateMask(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function calcAge(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const b = new Date(dateStr);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return `${age} anos`;
}

export function DateMaskInput({ value, onChange, placeholder = "dd/mm/aaaa", className, disabled, showAge }: DateMaskInputProps) {
  const [display, setDisplay] = useState(() => {
    if (!value) return "";
    try {
      return format(parse(value, "yyyy-MM-dd", new Date()), "dd/MM/yyyy");
    } catch {
      return "";
    }
  });
  const [error, setError] = useState(false);
  const prevValue = useRef(value);

  // Sync external value changes
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      if (!value) {
        setDisplay("");
        setError(false);
      } else {
        try {
          setDisplay(format(parse(value, "yyyy-MM-dd", new Date()), "dd/MM/yyyy"));
          setError(false);
        } catch {
          setDisplay("");
        }
      }
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = formatDateMask(e.target.value);
    setDisplay(masked);

    const digits = masked.replace(/\D/g, "");
    if (digits.length === 0) {
      onChange(null);
      setError(false);
      prevValue.current = null;
      return;
    }

    if (digits.length === 8) {
      const parsed = parse(masked, "dd/MM/yyyy", new Date());
      if (isValid(parsed) && parsed.getFullYear() >= 1900 && parsed <= new Date()) {
        const iso = format(parsed, "yyyy-MM-dd");
        onChange(iso);
        setError(false);
        prevValue.current = iso;
      } else {
        setError(true);
        onChange(null);
        prevValue.current = null;
      }
    } else {
      setError(false);
    }
  }, [onChange]);

  return (
    <div className="space-y-1">
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn("pl-9", error && "border-destructive", className)}
          disabled={disabled}
          maxLength={10}
          inputMode="numeric"
        />
      </div>
      {error && <p className="text-[10px] text-destructive">Data inválida</p>}
      {showAge && value && !error && <p className="text-[10px] text-muted-foreground">{calcAge(value)}</p>}
    </div>
  );
}
