import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuditProvider } from "@/contexts/AuditContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoader } from "@/components/PageLoader";
import { CommandPalette } from "@/components/CommandPalette";
import { lazy, Suspense } from "react";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Medicamentos = lazy(() => import("./pages/Medicamentos"));
const Alertas = lazy(() => import("./pages/Alertas"));
const Movimentacoes = lazy(() => import("./pages/Movimentacoes"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Etiquetas = lazy(() => import("./pages/Etiquetas"));
const Transferencias = lazy(() => import("./pages/Transferencias"));
const Fornecedores = lazy(() => import("./pages/Fornecedores"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Entrada = lazy(() => import("./pages/Entrada"));
const Dispensacao = lazy(() => import("./pages/Dispensacao"));
const LeitorBarcode = lazy(() => import("./pages/LeitorBarcode"));
const Prescricoes = lazy(() => import("./pages/Prescricoes"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Pacientes = lazy(() => import("./pages/Pacientes"));
const Inventario = lazy(() => import("./pages/Inventario"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
});

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AuditProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <CommandPalette />
                <Routes>
                  <Route path="/login" element={<S><Login /></S>} />
                  <Route path="/reset-password" element={<S><ResetPassword /></S>} />
                  <Route path="/" element={<P><S><Dashboard /></S></P>} />
                  <Route path="/medicamentos" element={<P><S><Medicamentos /></S></P>} />
                  <Route path="/entrada" element={<P><S><Entrada /></S></P>} />
                  <Route path="/dispensacao" element={<P><S><Dispensacao /></S></P>} />
                  <Route path="/alertas" element={<P><S><Alertas /></S></P>} />
                  <Route path="/movimentacoes" element={<P><S><Movimentacoes /></S></P>} />
                  <Route path="/estoque" element={<P><S><Estoque /></S></P>} />
                  <Route path="/etiquetas" element={<P><S><Etiquetas /></S></P>} />
                  <Route path="/transferencias" element={<P><S><Transferencias /></S></P>} />
                  <Route path="/fornecedores" element={<P><S><Fornecedores /></S></P>} />
                  <Route path="/relatorios" element={<P><S><Relatorios /></S></P>} />
                  <Route path="/usuarios" element={<P><S><Usuarios /></S></P>} />
                  <Route path="/admin" element={<P><S><AdminPanel /></S></P>} />
                  <Route path="/configuracoes" element={<P><S><Configuracoes /></S></P>} />
                  <Route path="/leitor" element={<P><S><LeitorBarcode /></S></P>} />
                  <Route path="/prescricoes" element={<P><S><Prescricoes /></S></P>} />
                  <Route path="/pacientes" element={<P><S><Pacientes /></S></P>} />
                  <Route path="/inventario" element={<P><S><Inventario /></S></P>} />
                  <Route path="/perfil" element={<P><S><Perfil /></S></P>} />
                  <Route path="*" element={<S><NotFound /></S>} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuditProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
