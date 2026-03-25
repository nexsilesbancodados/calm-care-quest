import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl gradient-hero shadow-lg shadow-primary/20 mb-6">
          <Activity className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-6xl font-bold text-gradient mb-2">404</h1>
        <p className="text-lg font-semibold text-foreground mb-1">Página não encontrada</p>
        <p className="text-sm text-muted-foreground mb-8">
          A página <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{location.pathname}</code> não existe.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button asChild className="gradient-primary text-primary-foreground gap-2">
            <Link to="/"><Home className="h-4 w-4" /> Ir ao Dashboard</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
