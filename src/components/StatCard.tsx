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
    card: "border-border/50 hover:border-primary/40",
    icon: "bg-primary/10 text-primary",
    iconGlow: "group-hover:shadow-[0_0_16px_hsl(var(--primary)/0.2)]",
    glow: "group-hover:shadow-[0_4px_24px_hsl(var(--primary)/0.08)]",
    accent: "from-primary/6 via-transparent to-transparent",
    dotColor: "bg-primary",
    line: "via-primary/30",
  },
  warning: {
    card: "border-warning/15 hover:border-warning/45",
    icon: "bg-warning/10 text-warning",
    iconGlow: "group-hover:shadow-[0_0_16px_hsl(var(--warning)/0.2)]",
    glow: "group-hover:shadow-[0_4px_24px_hsl(var(--warning)/0.08)]",
    accent: "from-warning/6 via-transparent to-transparent",
    dotColor: "bg-warning",
    line: "via-warning/30",
  },
  critical: {
    card: "border-destructive/15 hover:border-destructive/45",
    icon: "bg-destructive/10 text-destructive",
    iconGlow: "group-hover:shadow-[0_0_16px_hsl(var(--destructive)/0.2)]",
    glow: "group-hover:shadow-[0_4px_24px_hsl(var(--destructive)/0.08)]",
    accent: "from-destructive/6 via-transparent to-transparent",
    dotColor: "bg-destructive",
    line: "via-destructive/30",
  },
  success: {
    card: "border-success/15 hover:border-success/45",
    icon: "bg-success/10 text-success",
    iconGlow: "group-hover:shadow-[0_0_16px_hsl(var(--success)/0.2)]",
    glow: "group-hover:shadow-[0_4px_24px_hsl(var(--success)/0.08)]",
    accent: "from-success/6 via-transparent to-transparent",
    dotColor: "bg-success",
    line: "via-success/30",
  },
  info: {
    card: "border-info/15 hover:border-info/45",
    icon: "bg-info/10 text-info",
    iconGlow: "group-hover:shadow-[0_0_16px_hsl(var(--info)/0.2)]",
    glow: "group-hover:shadow-[0_4px_24px_hsl(var(--info)/0.08)]",
    accent: "from-info/6 via-transparent to-transparent",
    dotColor: "bg-info",
    line: "via-info/30",
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
  const isNumeric = typeof value === "number";
  const animatedValue = useAnimatedNumber(isNumeric ? value : 0);
  const config = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={cn(
        "group relative rounded-xl border bg-card p-3 sm:p-4 transition-all duration-300 cursor-default overflow-hidden",
        onClick && "cursor-pointer active:scale-[0.97]",
        config.card,
        config.glow,
        "shadow-sm hover:shadow-lg"
      )}
      onClick={onClick}
    >
      {/* Top accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        config.line,
      )} />

      {/* Accent gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        config.accent,
      )} />

      <div className="relative flex items-center gap-2.5 sm:gap-3">
        <div className={cn(
          "flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
          "group-hover:scale-105",
          config.icon,
          config.iconGlow,
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate mb-0.5">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight leading-none font-display">
            {isNumeric ? animatedValue.toLocaleString("pt-BR") : value}
            {suffix && <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>

        {onClick && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className={cn("h-2 w-2 rounded-full animate-pulse", config.dotColor)} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
