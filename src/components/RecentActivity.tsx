import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownCircle, ArrowUpCircle, Clock, User, Package, ChevronRight, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const RecentActivity = () => {
  const navigate = useNavigate();

  const { data: activities, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["recent-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select(`
          id,
          tipo,
          quantidade,
          created_at,
          medicamento_id,
          usuario_id,
          medicamentos (nome, concentracao)
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });


  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6 border-border/40 bg-card">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm shadow-sm group">
      <div className="p-4 sm:p-6 border-b border-border/10 flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary/70" />
            Atividades Recentes
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">Últimas movimentações registradas</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              "p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-all",
              isFetching && "animate-spin text-primary/70"
            )}
            title="Atualizar"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={() => navigate("/movimentacoes")}
            className="text-[10px] sm:text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
          >
            Ver todas
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

      </div>

      <div className="divide-y divide-border/5">
        {activities?.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-muted-foreground">Nenhuma atividade recente encontrada.</p>
          </div>
        ) : (
          activities?.map((activity) => (
            <div 
              key={activity.id} 
              className="p-4 sm:p-5 hover:bg-muted/30 transition-all duration-200 cursor-default group/item flex items-start gap-3 sm:gap-4"
            >
              <div className={cn(
                "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover/item:scale-105",
                activity.tipo === "entrada" ? "bg-success/8 text-success" : "bg-info/8 text-info"
              )}>
                {activity.tipo === "entrada" ? (
                  <ArrowDownCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <ArrowUpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] sm:text-[13px] font-bold text-foreground truncate block">
                    {activity.medicamentos?.nome || "Medicamento não identificado"}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[9px] font-bold h-4 px-1.5 border-none",
                      activity.tipo === "entrada" ? "bg-success/10 text-success" : "bg-info/10 text-info"
                    )}
                  >
                    {activity.tipo === "entrada" ? "ENTRADA" : "SAÍDA"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground/60 font-medium">
                    <Package className="h-3 w-3" />
                    <span>{activity.quantidade} un</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground/60 font-medium">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
