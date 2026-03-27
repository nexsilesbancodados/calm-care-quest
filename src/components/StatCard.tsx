import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";

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

export const StatCard = memo(function StatCard({ title, value, icon: Icon, variant = "default", suffix, onClick }: StatCardProps) {
  const config = variantConfig[variant];
  const displayValue = typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  return (
    <div
      className={cn(
        "group relative rounded-xl sm:rounded-2xl border border-border/50 bg-card p-3 sm:p-4 transition-all duration-200 cursor-default overflow-hidden hover:-translate-y-1",
        onClick && "cursor-pointer active:scale-[0.97]",
        config.card,
        config.glow,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
      onClick={onClick}
    >
      <div className={cn(
        "absolute top-0 left-3 right-3 h-[2px] rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        config.bar,
      )} />

      <div className="relative flex items-center gap-2.5 sm:gap-3">
        <div className={cn(
          "flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ring-1 transition-transform duration-200",
          "group-hover:scale-110",
          config.icon,
          config.ring,
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70 font-semibold truncate mb-0.5 sm:mb-1">{title}</p>
          <p className="text-lg sm:text-2xl font-extrabold text-foreground tabular-nums tracking-tight leading-none font-display">
            {displayValue}
            {suffix && <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>

        {onClick && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className={cn("h-1.5 w-1.5 rounded-full", config.bar)} />
          </div>
        )}
      </div>
    </div>
  );
});
