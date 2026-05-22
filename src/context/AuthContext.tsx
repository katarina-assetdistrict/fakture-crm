import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

interface AuthState {
  token: string;
  expiry: number;
  user: GoogleUser;
  spreadsheetId: string | null;
}

interface AuthContextValue {
  user: GoogleUser | null;
  token: string | null;
  spreadsheetId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokenExpired: boolean;
  login: () => void;
  logout: () => void;
  setSpreadsheetId: (id: string) => void;
}

const STORAGE_KEY = 'fakturcrm_auth';

const AuthContext = createContext<AuthContextValue>({
  user: null, token: null, spreadsheetId: null,
  isAuthenticated: false, isLoading: true, tokenExpired: false,
  login: () => {}, logout: () => {}, setSpreadsheetId: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: AuthState = JSON.parse(raw);
        if (saved.expiry > Date.now() + 60_000) {
          setState(saved);
        }
      }
    } catch { /* ignore */ }
    setIsLoading(false);
  }, []);

  const persist = (s: AuthState) => {
    setState(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const token = tokenResponse.access_token;
        const expiry = Date.now() + tokenResponse.expires_in * 1000;
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user: GoogleUser = await userRes.json();
        const existing = state?.spreadsheetId ?? null;
        persist({ token, expiry, user, spreadsheetId: existing });
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => setIsLoading(false),
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
  });

  const login = useCallback(() => {
    setIsLoading(true);
    googleLogin();
  }, [googleLogin]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(null);
  }, []);

  const setSpreadsheetId = useCallback((id: string) => {
    if (!state) return;
    const next = { ...state, spreadsheetId: id };
    persist(next);
  }, [state]);

  const isTokenExpired = !!state && state.expiry <= Date.now() + 60_000;

  return (
    <AuthContext.Provider value={{
      user: state?.user ?? null,
      token: state?.token ?? null,
      spreadsheetId: state?.spreadsheetId ?? null,
      isAuthenticated: !!state && !isTokenExpired,
      isLoading,
      tokenExpired: isTokenExpired,
      login,
      logout,
      setSpreadsheetId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
