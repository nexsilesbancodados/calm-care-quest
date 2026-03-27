import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "warning" | "critical" | "success" | "info";
  suffix?: string;
  delay?: number;
  onClick?: () => void;
}

const variantConfig = {
  default: {
    card: "hover:border-primary/30",
    icon: "bg-primary/8 text-primary",
    ring: "ring-primary/10 group-hover:ring-primary/20",
    glow: "group-hover:shadow-[0_0_24px_hsl(var(--primary)/0.06)]",
    bar: "bg-primary",
  },
  warning: {
    card: "hover:border-warning/30",
    icon: "bg-warning/8 text-warning",
    ring: "ring-warning/10 group-hover:ring-warning/20",
    glow: "group-hover:shadow-[0_0_24px_hsl(var(--warning)/0.06)]",
    bar: "bg-warning",
  },
  critical: {
    card: "hover:border-destructive/30",
    icon: "bg-destructive/8 text-destructive",
    ring: "ring-destructive/10 group-hover:ring-destructive/20",
    glow: "group-hover:shadow-[0_0_24px_hsl(var(--destructive)/0.06)]",
    bar: "bg-destructive",
  },
  success: {
    card: "hover:border-success/30",
    icon: "bg-success/8 text-success",
    ring: "ring-success/10 group-hover:ring-success/20",
    glow: "group-hover:shadow-[0_0_24px_hsl(var(--success)/0.06)]",
    bar: "bg-success",
  },
  info: {
    card: "hover:border-info/30",
    icon: "bg-info/8 text-info",
    ring: "ring-info/10 group-hover:ring-info/20",
    glow: "group-hover:shadow-[0_0_24px_hsl(var(--info)/0.06)]",
    bar: "bg-info",
  },
};

function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return value;
}

export function StatCard({ title, value, icon: Icon, variant = "default", suffix, delay = 0, onClick }: StatCardProps) {
  const isNumeric = typeof value === "number";
  const animatedValue = useAnimatedNumber(isNumeric ? value : 0);
  const config = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, type: "spring", stiffness: 200, damping: 22 }}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
      className={cn(
        "group relative rounded-2xl border border-border/50 bg-card p-3.5 sm:p-4 transition-all duration-300 cursor-default overflow-hidden",
        onClick && "cursor-pointer active:scale-[0.97]",
        config.card,
        config.glow,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
      onClick={onClick}
    >
      {/* Top bar accent */}
      <div className={cn(
        "absolute top-0 left-3 right-3 h-[2px] rounded-b-full opacity-0 group-hover:opacity-100 transition-all duration-500",
        config.bar,
      )} />

      <div className="relative flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-300",
          "group-hover:scale-110 group-hover:shadow-lg",
          config.icon,
          config.ring,
        )}>
          <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70 font-semibold truncate mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums tracking-tight leading-none font-display">
            {isNumeric ? animatedValue.toLocaleString("pt-BR") : value}
            {suffix && <span className="text-[10px] font-medium text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>

        {onClick && (
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
            <div className={cn("h-1.5 w-1.5 rounded-full", config.bar)} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
