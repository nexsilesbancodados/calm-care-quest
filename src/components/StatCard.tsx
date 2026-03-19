import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: "default" | "warning" | "critical" | "success" | "info";
  suffix?: string;
  delay?: number;
}

const variantStyles = {
  default: "bg-card shadow-card",
  warning: "bg-warning/5 border-warning/20",
  critical: "bg-destructive/5 border-destructive/20",
  success: "bg-success/5 border-success/20",
  info: "bg-info/5 border-info/20",
};

const iconStyles = {
  default: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/15 text-destructive",
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
};

export function StatCard({ title, value, icon: Icon, variant = "default", suffix, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn("rounded-xl border p-4 transition-shadow hover:shadow-card-hover", variantStyles[variant])}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {value}
            {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );
}
