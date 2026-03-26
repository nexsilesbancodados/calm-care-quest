import { motion } from "framer-motion";
import { LucideIcon, TrendingUp } from "lucide-react";
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
    icon: "bg-primary/10 text-primary ring-primary/5",
    accent: "from-primary/6 to-transparent",
    dotColor: "bg-primary",
  },
  warning: {
    card: "border-warning/15 hover:border-warning/35",
    icon: "bg-warning/10 text-warning ring-warning/5",
    accent: "from-warning/6 to-transparent",
    dotColor: "bg-warning",
  },
  critical: {
    card: "border-destructive/15 hover:border-destructive/35",
    icon: "bg-destructive/10 text-destructive ring-destructive/5",
    accent: "from-destructive/6 to-transparent",
    dotColor: "bg-destructive",
  },
  success: {
    card: "border-success/15 hover:border-success/35",
    icon: "bg-success/10 text-success ring-success/5",
    accent: "from-success/6 to-transparent",
    dotColor: "bg-success",
  },
  info: {
    card: "border-info/15 hover:border-info/35",
    icon: "bg-info/10 text-info ring-info/5",
    accent: "from-info/6 to-transparent",
    dotColor: "bg-info",
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={cn(
        "group relative rounded-xl border bg-card p-3.5 transition-all duration-200 cursor-default overflow-hidden",
        onClick && "cursor-pointer active:scale-[0.97]",
        config.card,
        "shadow-sm hover:shadow-md"
      )}
      onClick={onClick}
    >
      {/* Accent gradient overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300", config.accent)} />

      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 transition-all duration-200",
          "group-hover:scale-105 group-hover:shadow-sm",
          config.icon
        )}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{title}</p>
          <p className="text-xl font-bold text-foreground tabular-nums tracking-tight leading-tight font-display">
            {animatedValue}
            {suffix && <span className="text-[10px] font-medium text-muted-foreground ml-0.5">{suffix}</span>}
          </p>
        </div>

        {/* Click indicator */}
        {onClick && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", config.dotColor)} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
