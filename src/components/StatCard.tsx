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
    accent: "from-primary/5 to-transparent",
  },
  warning: {
    card: "bg-card border-warning/20 hover:border-warning/40",
    icon: "bg-warning/12 text-warning",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--warning)/0.12)]",
    accent: "from-warning/5 to-transparent",
  },
  critical: {
    card: "bg-card border-destructive/20 hover:border-destructive/40",
    icon: "bg-destructive/10 text-destructive",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--destructive)/0.12)]",
    accent: "from-destructive/5 to-transparent",
  },
  success: {
    card: "bg-card border-success/20 hover:border-success/40",
    icon: "bg-success/12 text-success",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--success)/0.12)]",
    accent: "from-success/5 to-transparent",
  },
  info: {
    card: "bg-card border-info/20 hover:border-info/40",
    icon: "bg-info/10 text-info",
    glow: "group-hover:shadow-[0_0_20px_hsl(var(--info)/0.12)]",
    accent: "from-info/5 to-transparent",
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
        "group relative rounded-2xl border p-4 transition-all duration-300 cursor-default overflow-hidden",
        onClick && "cursor-pointer active:scale-[0.96]",
        config.card,
        config.glow,
        "shadow-card hover:shadow-card-hover"
      )}
      onClick={onClick}
    >
      {/* Subtle gradient accent */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", config.accent)} />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">{title}</p>
          <p className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight">
            {animatedValue}
            {suffix && <span className="text-xs font-medium text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
          "group-hover:scale-110 group-hover:rotate-3",
          config.icon
        )}>
          <Icon className="h-[17px] w-[17px]" strokeWidth={2.2} />
        </div>
      </div>

      {/* Bottom highlight line */}
      <div className={cn(
        "absolute bottom-0 left-3 right-3 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        variant === "warning" ? "bg-warning/40" :
        variant === "critical" ? "bg-destructive/40" :
        variant === "success" ? "bg-success/40" :
        variant === "info" ? "bg-info/40" :
        "bg-primary/30"
      )} />
    </motion.div>
  );
}
