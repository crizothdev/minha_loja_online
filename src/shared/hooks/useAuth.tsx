import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthChange, getCurrentUser, logout as fbLogout } from '../../firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
import type { User } from '../utils/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const userData = await getCurrentUser(currentUser.uid, currentUser);
    setUser(userData);
  }, []);

  useEffect(() => {
    const unsub = onAuthChange((fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        getCurrentUser(fbUser.uid, fbUser).then(setUser).finally(() => setLoading(false));
      } else {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const signOut = useCallback(async () => {
    await fbLogout();
    setFirebaseUser(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    firebaseUser,
    user,
    loading,
    signOut,
    refreshUser,
  }), [firebaseUser, user, loading, signOut, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
