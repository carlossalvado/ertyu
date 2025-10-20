import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Professional {
  id: string;
  name: string;
  specialty: string;
  role: string;
  email: string;
}

interface ProfessionalAuthContextType {
  professional: Professional | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const ProfessionalAuthContext = createContext<ProfessionalAuthContextType | undefined>(undefined);

export function ProfessionalAuthProvider({ children }: { children: ReactNode }) {
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if professional is logged in on mount
    const storedProfessional = localStorage.getItem('professional_auth');
    if (storedProfessional) {
      try {
        setProfessional(JSON.parse(storedProfessional));
      } catch (error) {
        console.error('Error parsing stored professional data:', error);
        localStorage.removeItem('professional_auth');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);

      // Authenticate professional directly with Supabase Auth (same as admin)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) {
        console.error('Authentication error:', authError);
        return false;
      }

      // Get professional data from database
      const { data: profData, error: profError } = await supabase
        .from('professionals')
        .select('*')
        .eq('email', email)
        .eq('active', true)
        .single();

      if (profError || !profData) {
        console.error('Professional data error:', profError);
        // Sign out since professional data not found
        await supabase.auth.signOut();
        return false;
      }

      const professionalData: Professional = {
        id: profData.id,
        name: profData.name,
        specialty: profData.specialty || '',
        role: profData.role || 'professional',
        email: email
      };

      setProfessional(professionalData);
      localStorage.setItem('professional_auth', JSON.stringify(professionalData));
      return true;

    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setProfessional(null);
    localStorage.removeItem('professional_auth');
    // Clear any admin auth session when professional logs out
    supabase.auth.signOut();
  };

  return (
    <ProfessionalAuthContext.Provider value={{
      professional,
      login,
      logout,
      loading
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