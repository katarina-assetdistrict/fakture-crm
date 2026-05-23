import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, type User,
} from 'firebase/auth';
import { auth } from '../services/firebase';

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  uid: string;
}

interface AuthContextValue {
  user: GoogleUser | null;
  uid: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, uid: null,
  isAuthenticated: false, isLoading: true,
  login: async () => {}, logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function toGoogleUser(u: User): GoogleUser {
  return {
    name:    u.displayName ?? u.email ?? 'Korisnik',
    email:   u.email ?? '',
    picture: u.photoURL ?? '',
    uid:     u.uid,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? toGoogleUser(firebaseUser) : null);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // onAuthStateChanged will update state automatically
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      uid: user?.uid ?? null,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
