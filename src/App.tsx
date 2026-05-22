import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { FirmaProvider } from './context/FirmaContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Klijenti from './pages/Klijenti';
import KlijentDetalji from './pages/KlijentDetalji';
import Fakture from './pages/Fakture';
import NovaFaktura from './pages/NovaFaktura';
import FakturaDetalji from './pages/FakturaDetalji';
import { Loader2 } from 'lucide-react';

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-400" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;

  return (
    <DataProvider>
      <FirmaProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="klijenti" element={<Klijenti />} />
              <Route path="klijenti/:id" element={<KlijentDetalji />} />
              <Route path="fakture" element={<Fakture />} />
              <Route path="fakture/nova" element={<NovaFaktura />} />
              <Route path="fakture/:id" element={<FakturaDetalji />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FirmaProvider>
    </DataProvider>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="bg-red-900/30 border border-red-500 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-300 font-semibold mb-2">Greška pri pokretanju</p>
          <p className="text-red-400 text-sm font-mono">{this.state.error}</p>
        </div>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder';
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={clientId}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
