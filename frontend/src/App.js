import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/comercial/Leads";
import Pipeline from "@/pages/comercial/Pipeline";
import Clientes from "@/pages/clientes/Clientes";
import Financeiro from "@/pages/financeiro/Financeiro";
import Conteudo from "@/pages/conteudo/Conteudo";
import Operacional from "@/pages/operacional/Operacional";
import ClientTaskDashboard from "@/pages/operacional/ClientTaskDashboard";
import RH from "@/pages/rh/RH";
import Configuracoes from "@/pages/configuracoes/Configuracoes";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";

function AppRouter() {
  const location = useLocation();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="comercial/leads" element={<Leads />} />
        <Route path="comercial/pipeline" element={<Pipeline />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="conteudo" element={<Conteudo />} />
        <Route path="operacional" element={<Operacional />} />
        <Route path="operacional/:clientId" element={<ClientTaskDashboard />} />
        <Route path="rh" element={<RH />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
