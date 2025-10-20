import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfessionalAuthProvider, useProfessionalAuth } from './contexts/ProfessionalAuthContext';
import LoginPage from './pages/LoginPage';
import ProfessionalDashboardPage from './pages/ProfessionalDashboardPage';
import WhatsAppConnect from './components/WhatsApp/WhatsAppConnect';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import WhatsAppAgentConfig from './pages/WhatsAppAgentConfig';
import AppointmentsPage from './pages/AppointmentsPage';
import CustomersPage from './pages/CustomersPage';
import ProfessionalsPage from './pages/ProfessionalsPage';
import Navbar from './components/Layout/Navbar';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { professional, loading: profLoading } = useProfessionalAuth();
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'dashboard' | 'settings' | 'appointments' | 'customers' | 'professionals' | 'whatsapp'>('dashboard');

  useEffect(() => {
    if (user) {
      checkWhatsAppConnection();
    }

    // Listen for navigation events from child components
    const handleNavigateToAppointments = (event: any) => {
      console.log('Navigation event received:', event.detail);
      setCurrentView('appointments');
      // Store customer data in sessionStorage for the appointments page
      if (event.detail.customer) {
        sessionStorage.setItem('prefillCustomer', JSON.stringify(event.detail.customer));
      }
      // Store reschedule data in sessionStorage for the appointments page
      if (event.detail.reschedule) {
        sessionStorage.setItem('rescheduleAppointment', JSON.stringify(event.detail.reschedule));
      }
    };

    window.addEventListener('navigateToAppointments', handleNavigateToAppointments);

    const handleNavigateToView = (event: any) => {
      if (event?.detail?.view) setCurrentView(event.detail.view);
    };

    window.addEventListener('navigateToView', handleNavigateToView);

    return () => {
      window.removeEventListener('navigateToAppointments', handleNavigateToAppointments);
      window.removeEventListener('navigateToView', handleNavigateToView);
    };
  }, [user]);

  const checkWhatsAppConnection = async () => {
    const { data } = await supabase
      .from('users')
      .select('whatsapp_connected')
      .eq('id', user!.id)
      .maybeSingle();

    if (data?.whatsapp_connected) {
      setIsWhatsAppConnected(true);
    }
  };

  if (authLoading || profLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Professional login flow
  if (professional) {
    return <ProfessionalDashboardPage />;
  }

  // Admin login flow
  if (!user) {
    return <LoginPage />;
  }

  if (!isWhatsAppConnected) {
    return <WhatsAppConnect onConnected={() => setIsWhatsAppConnected(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentView={currentView} onViewChange={setCurrentView} />
      {currentView === 'chat' && <ChatPage />}
      {currentView === 'dashboard' && <DashboardPage />}
  {currentView === 'settings' && <SettingsPage />}
  {currentView === 'whatsapp' && <WhatsAppAgentConfig />}
      {currentView === 'appointments' && <AppointmentsPage />}
      {currentView === 'customers' && <CustomersPage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProfessionalAuthProvider>
        <AppContent />
      </ProfessionalAuthProvider>
    </AuthProvider>
  );
}

export default App;
