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
    card: "border-border/50 hover:border-primary/40",
    icon: "bg-primary/10 text-primary",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.12)]",
    accent: "from-primary/8 via-primary/3 to-transparent",
    dotColor: "bg-primary",
  },
  warning: {
    card: "border-warning/15 hover:border-warning/45",
    icon: "bg-warning/10 text-warning",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--warning)/0.12)]",
    accent: "from-warning/8 via-warning/3 to-transparent",
    dotColor: "bg-warning",
  },
  critical: {
    card: "border-destructive/15 hover:border-destructive/45",
    icon: "bg-destructive/10 text-destructive",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--destructive)/0.12)]",
    accent: "from-destructive/8 via-destructive/3 to-transparent",
    dotColor: "bg-destructive",
  },
  success: {
    card: "border-success/15 hover:border-success/45",
    icon: "bg-success/10 text-success",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--success)/0.12)]",
    accent: "from-success/8 via-success/3 to-transparent",
    dotColor: "bg-success",
  },
  info: {
    card: "border-info/15 hover:border-info/45",
    icon: "bg-info/10 text-info",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--info)/0.12)]",
    accent: "from-info/8 via-info/3 to-transparent",
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
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
      className={cn(
        "group relative rounded-xl border bg-card p-2.5 sm:p-3.5 transition-all duration-300 cursor-default overflow-hidden",
        onClick && "cursor-pointer active:scale-[0.96]",
        config.card,
        config.glow,
        "shadow-sm hover:shadow-lg"
      )}
      onClick={onClick}
    >
      {/* Accent gradient overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", config.accent)} />
      
      {/* Shimmer line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-center gap-2 sm:gap-3">
        <div className={cn(
          "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
          "group-hover:scale-110 group-hover:shadow-md",
          config.icon
        )}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{title}</p>
          <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums tracking-tight leading-tight font-display">
            {animatedValue.toLocaleString("pt-BR")}
            {suffix && <span className="text-[8px] sm:text-[10px] font-medium text-muted-foreground ml-0.5">{suffix}</span>}
          </p>
        </div>

        {onClick && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", config.dotColor)} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
