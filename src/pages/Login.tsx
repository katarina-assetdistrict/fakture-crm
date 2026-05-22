import { Receipt, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isLoading } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Receipt className="text-white" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">FaktCRM</h1>
        <p className="text-gray-500 text-sm mb-8">Upravljanje fakturama i uplatama</p>

        {!clientId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <div className="flex gap-2 items-start">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-amber-800 text-sm font-medium">Nedostaje konfiguracija</p>
                <p className="text-amber-700 text-xs mt-1">
                  Dodajte <code className="bg-amber-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> u GitHub Secrets i ponovo deploujte.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={login}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 font-medium px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <GoogleIcon />
            )}
            {isLoading ? 'Prijava u toku...' : 'Prijavite se Google nalogom'}
          </button>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Podaci se čuvaju u vašem Google Drive-u.<br />
          Pristupačno sa bilo kog uređaja.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
