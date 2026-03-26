import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: "default" | "warning" | "critical" | "success" | "info";
  suffix?: string;
  delay?: number;
  onClick?: () => void;
}

const variantConfig = {
  default: {
    card: "bg-card border-border/60 hover:border-primary/30",
    icon: "bg-primary/10 text-primary",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]",
    decorBg: "bg-primary",
  },
  warning: {
    card: "bg-card border-warning/20 hover:border-warning/40",
    icon: "bg-warning/12 text-warning",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--warning)/0.12)]",
    decorBg: "bg-warning",
  },
  critical: {
    card: "bg-card border-destructive/20 hover:border-destructive/40",
    icon: "bg-destructive/10 text-destructive",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--destructive)/0.12)]",
    decorBg: "bg-destructive",
  },
  success: {
    card: "bg-card border-success/20 hover:border-success/40",
    icon: "bg-success/12 text-success",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--success)/0.12)]",
    decorBg: "bg-success",
  },
  info: {
    card: "bg-card border-info/20 hover:border-info/40",
    icon: "bg-info/10 text-info",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--info)/0.12)]",
    decorBg: "bg-info",
  },
};

function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return value;
}

export function StatCard({ title, value, icon: Icon, variant = "default", suffix, delay = 0, onClick }: StatCardProps) {
  const animatedValue = useAnimatedNumber(value);
  const config = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "group relative rounded-xl border p-5 transition-all duration-300 cursor-default overflow-hidden",
        onClick && "cursor-pointer active:scale-[0.96]",
        config.card,
        config.glow,
        "shadow-card hover:shadow-card-hover"
      )}
      onClick={onClick}
    >
      {/* Decorative background pill */}
      <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] translate-x-8 -translate-y-8", config.decorBg)} />

      <div className="relative">
        {/* Header: icon + optional clickable indicator */}
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300",
            "group-hover:scale-110 group-hover:rotate-3",
            config.icon
          )}>
            <Icon className="h-[17px] w-[17px]" strokeWidth={2.2} />
          </div>
          {onClick && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Ver →
            </span>
          )}
        </div>

        {/* Value */}
        <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          {animatedValue}
          {suffix && <span className="text-xs font-medium text-muted-foreground ml-1">{suffix}</span>}
        </p>

        {/* Label */}
        <p className="text-sm text-muted-foreground mt-1 font-medium">{title}</p>
      </div>
    </motion.div>
  );
}