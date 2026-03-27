import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Activity } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-lg shadow-primary/20"
        >
          <Activity className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">Carregando PsiRumoCerto...</p>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
