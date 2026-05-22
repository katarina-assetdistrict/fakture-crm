import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FirmaProvider } from './context/FirmaContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Klijenti from './pages/Klijenti';
import KlijentDetalji from './pages/KlijentDetalji';
import Fakture from './pages/Fakture';
import NovaFaktura from './pages/NovaFaktura';
import FakturaDetalji from './pages/FakturaDetalji';

export default function App() {
  return (
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
  );
}
