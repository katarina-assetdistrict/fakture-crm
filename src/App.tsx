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

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? 'placeholder';
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
