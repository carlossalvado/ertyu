import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfessionalAuthProvider, useProfessionalAuth } from './contexts/ProfessionalAuthContext';
import LoginPage from './pages/LoginPage';
import ProfessionalDashboardPage from './pages/ProfessionalDashboardPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import CustomersPage from './pages/CustomersPage';
import ProfessionalsPage from './pages/ProfessionalsPage';
import Navbar from './components/Layout/Navbar';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { professional, loading: profLoading } = useProfessionalAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'appointments' | 'customers' | 'professionals'>('dashboard');

  useEffect(() => {
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
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentView={currentView} onViewChange={setCurrentView} />
      <div className="pt-6">
        {currentView === 'dashboard' && <DashboardPage />}
        {currentView === 'settings' && <SettingsPage />}
        {currentView === 'appointments' && <AppointmentsPage />}
        {currentView === 'customers' && <CustomersPage />}
        {currentView === 'professionals' && <ProfessionalsPage />}
      </div>
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
