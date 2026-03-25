import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuditProvider } from "@/contexts/AuditContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Medicamentos from "./pages/Medicamentos";
import Alertas from "./pages/Alertas";
import Movimentacoes from "./pages/Movimentacoes";
import Estoque from "./pages/Estoque";
import Configuracoes from "./pages/Configuracoes";
import Etiquetas from "./pages/Etiquetas";
import Transferencias from "./pages/Transferencias";
import Fornecedores from "./pages/Fornecedores";
import Relatorios from "./pages/Relatorios";
import Entrada from "./pages/Entrada";
import Dispensacao from "./pages/Dispensacao";
import LeitorBarcode from "./pages/LeitorBarcode";
import Usuarios from "./pages/Usuarios";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AuditProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<P><Dashboard /></P>} />
                <Route path="/medicamentos" element={<P><Medicamentos /></P>} />
                <Route path="/entrada" element={<P><Entrada /></P>} />
                <Route path="/dispensacao" element={<P><Dispensacao /></P>} />
                <Route path="/alertas" element={<P><Alertas /></P>} />
                <Route path="/movimentacoes" element={<P><Movimentacoes /></P>} />
                <Route path="/estoque" element={<P><Estoque /></P>} />
                <Route path="/etiquetas" element={<P><Etiquetas /></P>} />
                <Route path="/transferencias" element={<P><Transferencias /></P>} />
                <Route path="/fornecedores" element={<P><Fornecedores /></P>} />
                <Route path="/relatorios" element={<P><Relatorios /></P>} />
                <Route path="/usuarios" element={<P><Usuarios /></P>} />
                <Route path="/configuracoes" element={<P><Configuracoes /></P>} />
                <Route path="/leitor" element={<P><LeitorBarcode /></P>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuditProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
