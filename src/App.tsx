import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Dashboard from "./pages/Dashboard";
import Medicamentos from "./pages/Medicamentos";
import Pacientes from "./pages/Pacientes";
import Alertas from "./pages/Alertas";
import Movimentacoes from "./pages/Movimentacoes";
import Estoque from "./pages/Estoque";
import Configuracoes from "./pages/Configuracoes";
import Etiquetas from "./pages/Etiquetas";
import Transferencias from "./pages/Transferencias";
import Fornecedores from "./pages/Fornecedores";
import Relatorios from "./pages/Relatorios";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/medicamentos" element={<Medicamentos />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/movimentacoes" element={<Movimentacoes />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/etiquetas" element={<Etiquetas />} />
            <Route path="/transferencias" element={<Transferencias />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
