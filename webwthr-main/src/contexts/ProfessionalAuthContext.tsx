import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService, AuthState, Professional } from '../lib/auth';

interface ProfessionalAuthContextType {
  professional: Professional | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const ProfessionalAuthContext = createContext<ProfessionalAuthContextType | undefined>(undefined);

export function ProfessionalAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    professional: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    const authService = AuthService.getInstance();

    // Set initial state
    setAuthState(authService.getAuthState());

    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((newState) => {
      setAuthState(newState);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const authService = AuthService.getInstance();
    const result = await authService.login(email, password);
    return result.success;
  };

  const logout = () => {
    const authService = AuthService.getInstance();
    authService.logout();
  };

  return (
    <ProfessionalAuthContext.Provider value={{
      professional: authState.professional,
      login,
      logout,
      loading: authState.isLoading
    }}>
      {children}
    </ProfessionalAuthContext.Provider>
  );
}

export function useProfessionalAuth() {
  const context = useContext(ProfessionalAuthContext);
  if (context === undefined) {
    throw new Error('useProfessionalAuth must be used within a ProfessionalAuthProvider');
  }
  return context;
}