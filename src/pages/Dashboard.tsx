import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardStats, useConsumoData, useTopStocked, useCategoryData } from "@/hooks/useDashboardData";
import { useQuery } from "@tanstack/react-query";
import {
  Pill, AlertTriangle, XCircle, Clock, Package, ShieldCheck,
  Barcode, ArrowLeftRight, TrendingUp, ArrowRight,
  ArrowDownCircle, ArrowUpCircle, FileText, Activity, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Lazy load heavy components
const DashboardCharts = lazy(() => import("@/components/DashboardCharts"));
const AdvancedKpisPanel = lazy(() => import("@/components/AdvancedKpisPanel"));
const PainelAtrasos = lazy(() => import("@/components/PainelAtrasos"));
const TipoItemPanel = lazy(() => import("@/components/TipoItemPanel"));

const PERIOD_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês anterior" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [now, setNow] = useState(new Date());
  const [period, setPeriod] = useState("30");

  const { data: stats, isLoading } = useDashboardStats();
  const { data: consumoData = [] } = useConsumoData(period);
  const { data: topStocked = [] } = useTopStocked();
  const { data: catData = [] } = useCategoryData();

  const { data: dispensacoesHoje = 0 } = useQuery({
    queryKey: ["dashboard-dispensacoes-hoje"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("movimentacoes").select("id", { count: "exact", head: true })
        .eq("tipo", "dispensacao")
        .gte("created_at", today.toISOString());
      return count || 0;
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const s = stats || {
    total: 0, controlled: 0, lowStock: 0, critical: 0, outOfStock: 0,
    expiringSoon: 0, totalUnits: 0, totalValue: 0, pendingTransfers: 0,
    totalMovements: 0, prescricoesAtivas: 0, cmm: 0,
  };

  const totalAlerts = s.outOfStock + s.critical + s.expiringSoon + (s.pendingTransfers > 0 ? 1 : 0);

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, [now]);

  const quickActions = useMemo(() => [
    { label: "Entrada", desc: "Receber medicamentos", icon: ArrowDownCircle, path: "/entrada", color: "text-success", bg: "bg-success/6", badge: s.outOfStock > 0 ? `${s.outOfStock} em falta` : null },
    { label: "Dispensar", desc: "Saída de estoque", icon: ArrowUpCircle, path: "/dispensacao", color: "text-info", bg: "bg-info/6", badge: dispensacoesHoje > 0 ? `${dispensacoesHoje} hoje` : null },
    { label: "Etiquetas", desc: "Imprimir etiquetas", icon: Barcode, path: "/etiquetas", color: "text-primary", bg: "bg-primary/6", badge: null },
    { label: "Transferir", desc: "Entre clínicas", icon: ArrowLeftRight, path: "/transferencias", color: "text-warning", bg: "bg-warning/6", badge: s.pendingTransfers > 0 ? `${s.pendingTransfers} pendentes` : null },
  ], [s.outOfStock, dispensacoesHoje, s.pendingTransfers]);

  if (isLoading)
    return (
      <AppLayout title="Dashboard" subtitle="Carregando...">
        <div className="space-y-4">
          <Skeleton className="h-28 sm:h-32 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </AppLayout>
    );

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da farmácia hospitalar">
      {/* ── HERO BANNER ── */}
      <div className="mb-4 sm:mb-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl gradient-hero text-white p-4 sm:p-7 lg:p-8 border border-white/[0.06]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(ellipse at 10% 60%, hsla(152,55%,45%,0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 90% 20%, hsla(178,48%,42%,0.1) 0%, transparent 50%)`,
          }} />
          <div className="absolute top-0 right-0 w-40 sm:w-80 h-40 sm:h-80 bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/4" />

          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2 min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] font-mono">
                {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-display leading-none">
                {greeting}, <span className="text-white/85">{profile?.nome?.split(" ")[0] || "Usuário"}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-[11px] text-white/40 font-medium">
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {s.totalUnits.toLocaleString("pt-BR")} un
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {s.totalMovements} mov
                </span>
                {totalAlerts > 0 && (
                  <span className="flex items-center gap-1 text-warning/80">
                    <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {totalAlerts} alerta{totalAlerts > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-3xl sm:text-5xl font-extrabold tabular-nums tracking-tighter font-display leading-none" style={{ textShadow: '0 0 40px hsla(152,55%,48%,0.25)' }}>
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="mb-4 sm:mb-7">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="group relative flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-border/40 bg-card p-3 sm:p-4 hover:border-primary/25 transition-all duration-200 active:scale-[0.97] text-left overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className={cn("relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-transform duration-200 group-hover:scale-110", a.bg)}>
                <a.icon className={cn("h-4 w-4 sm:h-[18px] sm:w-[18px]", a.color)} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-[13px] font-bold text-foreground leading-tight">{a.label}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 mt-0.5 hidden sm:block">{a.desc}</p>
                {a.badge && (
                  <span className="text-[8px] sm:hidden font-bold text-destructive mt-0.5 block truncate">
                    {a.badge}
                  </span>
                )}
              </div>
              {a.badge && (
                <span className="text-[9px] font-bold bg-destructive/10 text-destructive rounded-full px-2 py-0.5 shrink-0 hidden sm:inline">
                  {a.badge}
                </span>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all hidden sm:block" />
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-7">
        <StatCard title="Medicamentos" value={s.total} icon={Pill} variant="info" onClick={() => navigate("/medicamentos")} />
        <StatCard title="Controlados" value={s.controlled} icon={ShieldCheck} variant="default" />
        <StatCard title="Estoque Baixo" value={s.lowStock} icon={Package} variant="warning" onClick={() => navigate("/alertas")} />
        <StatCard title="Crítico" value={s.critical} icon={AlertTriangle} variant="critical" onClick={() => navigate("/alertas")} />
        <StatCard title="Esgotado" value={s.outOfStock} icon={XCircle} variant="critical" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-7">
        <StatCard title="Vence 60d" value={s.expiringSoon} icon={Clock} variant="warning" />
        <StatCard title="Transferências" value={s.pendingTransfers} icon={ArrowLeftRight} variant="info" onClick={() => navigate("/transferencias")} />
        <StatCard title="CMM" value={s.cmm} icon={TrendingUp} variant="default" />
        <StatCard title="Prescrições" value={s.prescricoesAtivas} icon={FileText} variant="info" onClick={() => navigate("/prescricoes")} />
      </div>

      {/* ── DISTRIBUIÇÃO POR TIPO DE ITEM ── */}
      <Suspense fallback={<Skeleton className="h-44 rounded-2xl mb-4 sm:mb-7" />}>
        <TipoItemPanel />
      </Suspense>

      {/* ── ADVANCED KPIs (lazy loaded) ── */}
      <Suspense fallback={<Skeleton className="h-28 rounded-2xl" />}>
        <AdvancedKpisPanel />
      </Suspense>

      {/* ── PAINEL DE ATRASOS MAR ── */}
      <div className="my-4 sm:my-7">
        <Suspense fallback={<Skeleton className="h-48 rounded-2xl" />}>
          <PainelAtrasos />
        </Suspense>
      </div>

      {/* ── CHARTS (lazy loaded) ── */}
      <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
        <DashboardCharts
          consumoData={consumoData}
          topStocked={topStocked}
          catData={catData}
          period={period}
          setPeriod={setPeriod}
          totalAlerts={totalAlerts}
          stats={s}
          navigate={navigate}
        />
      </Suspense>
    </AppLayout>
  );
};

export default Dashboard;
