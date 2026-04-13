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
import { pages } from "@/lib/lazyPages";

// Lazy-loaded pages using centralized imports
const Dashboard = lazy(pages["/"]);
const Medicamentos = lazy(pages["/medicamentos"]);
const Alertas = lazy(pages["/alertas"]);
const Movimentacoes = lazy(pages["/movimentacoes"]);
const Estoque = lazy(pages["/estoque"]);
const Configuracoes = lazy(pages["/configuracoes"]);
const Etiquetas = lazy(pages["/etiquetas"]);
const Transferencias = lazy(pages["/transferencias"]);
const Fornecedores = lazy(pages["/fornecedores"]);
const Relatorios = lazy(pages["/relatorios"]);
const Entrada = lazy(pages["/entrada"]);
const Dispensacao = lazy(pages["/dispensacao"]);
const LeitorBarcode = lazy(pages["/leitor"]);
const Prescricoes = lazy(pages["/prescricoes"]);
const Usuarios = lazy(pages["/usuarios"]);
const AdminPanel = lazy(pages["/admin"]);
const Pacientes = lazy(pages["/pacientes"]);
const Inventario = lazy(pages["/inventario"]);
const Perfil = lazy(pages["/perfil"]);
const Solicitacoes = lazy(pages["/solicitacoes"]);
const Login = lazy(pages["/login"]);
const ResetPassword = lazy(pages["/reset-password"]);
const AvaliacaoCssrs = lazy(pages["/cssrs"]);
const AdministracaoMar = lazy(pages["/mar"]);
const Bmpo = lazy(pages["/bmpo"]);
const Consentimento = lazy(pages["/consentimento"]);
const Alergias = lazy(pages["/alergias"]);
const SegurancaConta = lazy(pages["/seguranca"]);
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
                  <Route path="/solicitacoes" element={<P><S><Solicitacoes /></S></P>} />
                  <Route path="/cssrs" element={<P><S><AvaliacaoCssrs /></S></P>} />
                  <Route path="/mar" element={<P><S><AdministracaoMar /></S></P>} />
                  <Route path="/bmpo" element={<P><S><Bmpo /></S></P>} />
                  <Route path="/consentimento" element={<P><S><Consentimento /></S></P>} />
                  <Route path="/alergias" element={<P><S><Alergias /></S></P>} />
                  <Route path="/seguranca" element={<P><S><SegurancaConta /></S></P>} />
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
