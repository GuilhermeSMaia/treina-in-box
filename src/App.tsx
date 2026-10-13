import { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { TrainingGuard } from "@/components/TrainingGuard";
import Landing from "./pages/Landing";
import Lobby from "./pages/Lobby";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AoVivo from "./pages/training/AoVivo";
import Aula from "./pages/training/Aula";
import Conteudo from "./pages/training/Conteudo";
import Praca from "./pages/training/Praca";
import MeuEspaco from "./pages/training/MeuEspaco";
import Settings from "./pages/Settings";
import Treinamentos from "./pages/Treinamentos";
import Perfil from "./pages/Perfil";

const queryClient = new QueryClient();

// Rotas dentro de um treinamento: exigem login e matrícula no treinamento
const TrainingRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <TrainingGuard>{children}</TrainingGuard>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/treina-in-box-main"> 
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
            <Route path="/treinamentos" element={<ProtectedRoute><Treinamentos /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            {/* Training context routes */}
            <Route path="/treino/:trainingId/ao-vivo" element={<TrainingRoute><AoVivo /></TrainingRoute>} />
            <Route path="/treino/:trainingId/aula/:sessionId" element={<TrainingRoute><Aula /></TrainingRoute>} />
            <Route path="/treino/:trainingId/conteudo" element={<TrainingRoute><Conteudo /></TrainingRoute>} />
            <Route path="/treino/:trainingId/praca" element={<TrainingRoute><Praca /></TrainingRoute>} />
            <Route path="/treino/:trainingId/meu-espaco" element={<TrainingRoute><MeuEspaco /></TrainingRoute>} />
            <Route path="/configuracoes" element={<AdminRoute><Settings /></AdminRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
