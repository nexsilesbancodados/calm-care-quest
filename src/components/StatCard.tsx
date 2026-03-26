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
    card: "border-border/50 hover:border-primary/30",
    icon: "bg-primary/8 text-primary",
    bar: "bg-primary",
    glow: "group-hover:shadow-[0_0_16px_hsl(var(--primary)/0.08)]",
  },
  warning: {
    card: "border-warning/15 hover:border-warning/35",
    icon: "bg-warning/8 text-warning",
    bar: "bg-warning",
    glow: "group-hover:shadow-[0_0_16px_hsl(var(--warning)/0.1)]",
  },
  critical: {
    card: "border-destructive/15 hover:border-destructive/35",
    icon: "bg-destructive/8 text-destructive",
    bar: "bg-destructive",
    glow: "group-hover:shadow-[0_0_16px_hsl(var(--destructive)/0.1)]",
  },
  success: {
    card: "border-success/15 hover:border-success/35",
    icon: "bg-success/8 text-success",
    bar: "bg-success",
    glow: "group-hover:shadow-[0_0_16px_hsl(var(--success)/0.1)]",
  },
  info: {
    card: "border-info/15 hover:border-info/35",
    icon: "bg-info/8 text-info",
    bar: "bg-info",
    glow: "group-hover:shadow-[0_0_16px_hsl(var(--info)/0.1)]",
  },
};

function useAnimatedNumber(target: number, duration = 500) {
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
  const animatedValue = useAnimatedNumber(value);
  const config = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, type: "spring", stiffness: 250, damping: 22 }}
      whileHover={{ y: -1 }}
      className={cn(
        "group relative rounded-lg border bg-card p-3.5 transition-all duration-200 cursor-default overflow-hidden",
        onClick && "cursor-pointer active:scale-[0.97]",
        config.card,
        config.glow,
        "shadow-card hover:shadow-card-hover"
      )}
      onClick={onClick}
    >
      {/* Left accent bar */}
      <div className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full opacity-60 group-hover:opacity-100 transition-opacity", config.bar)} />

      <div className="relative pl-2 flex items-start justify-between">
        <div className="space-y-1">
          <p className="metric-label">{title}</p>
          <p className="text-xl font-bold text-foreground tabular-nums tracking-tight leading-none">
            {animatedValue}
            {suffix && <span className="text-[10px] font-medium text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200",
          "group-hover:scale-105",
          config.icon
        )}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>
    </motion.div>
  );
}