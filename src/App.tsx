import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import Medicamentos from "./pages/Medicamentos";
import Alertas from "./pages/Alertas";
import Movimentacoes from "./pages/Movimentacoes";
import Estoque from "./pages/Estoque";
import Configuracoes from "./pages/Configuracoes";
import Etiquetas from "./pages/Etiquetas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/medicamentos" element={<Medicamentos />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/movimentacoes" element={<Movimentacoes />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
