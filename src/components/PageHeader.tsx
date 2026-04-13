import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  variant?: "default" | "clinical" | "security" | "analytics";
  className?: string;
}

const variantStyles = {
  default: "from-primary/10 via-primary/5 to-transparent text-primary",
  clinical: "from-success/10 via-success/5 to-transparent text-success",
  security: "from-warning/15 via-warning/5 to-transparent text-warning",
  analytics: "from-info/10 via-info/5 to-transparent text-info",
};

export function PageHeader({
  title, subtitle, icon: Icon, actions, variant = "default", className,
}: PageHeaderProps) {
  const style = variantStyles[variant];
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 sm:p-6 bg-gradient-to-br",
        style,
        className,
      )}
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background/80 ring-1 ring-border/60 shadow-sm",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div
        aria-hidden
        className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-current opacity-5 blur-3xl"
      />
    </header>
  );
}
