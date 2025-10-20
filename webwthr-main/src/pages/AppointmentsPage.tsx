import { useState, useEffect } from 'react';
import AppointmentForm from '../components/Appointments/AppointmentForm';
import AppointmentsList from '../components/Appointments/AppointmentsList';

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_date: string;
  status: string;
  total_price: number;
  notes: string;
  professional_name?: string;
  services?: Array<{
    service: {
      name: string;
    };
    price: number;
    used_package_session: boolean;
  }>;
}

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'new' | 'reschedule'>('list');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [prefillData, setPrefillData] = useState<{
    customer_name?: string;
    customer_phone?: string;
    professional_id?: string;
  }>({});

  useEffect(() => {
    console.log('=== APPOINTMENTS PAGE LOADED ===');
    console.log('Current URL:', window.location.href);
    console.log('URL search params:', window.location.search);

    // Check URL parameters for prefilled data
    const urlParams = new URLSearchParams(window.location.search);
    const customerParam = urlParams.get('customer');
    const rescheduleParam = urlParams.get('reschedule');
    const phone = urlParams.get('phone');
    const professional = urlParams.get('professional');

    console.log('URL params:', { customerParam, rescheduleParam, phone, professional });

    // Also check sessionStorage for customer data from navigation events
    const sessionCustomer = sessionStorage.getItem('prefillCustomer');
    console.log('Session customer data:', sessionCustomer);
    if (sessionCustomer) {
      try {
        const customerData = JSON.parse(sessionCustomer);
        console.log('Parsed customer data:', customerData);
        setPrefillData({
          customer_name: customerData.name || '',
          customer_phone: customerData.phone || '',
          professional_id: customerData.professional_id || ''
        });
        setActiveTab('new');
        sessionStorage.removeItem('prefillCustomer'); // Clean up
        console.log('Set active tab to new for customer data');
        return;
      } catch (error) {
        console.error('Error parsing session customer data:', error);
      }
    }

    // Check sessionStorage for reschedule data from navigation events
    const sessionReschedule = sessionStorage.getItem('rescheduleAppointment');
    console.log('Checking sessionStorage for reschedule data:', sessionReschedule);
    if (sessionReschedule) {
      try {
        const appointmentData = JSON.parse(sessionReschedule);
        console.log('Parsed reschedule appointment data:', appointmentData);
        setRescheduleAppointment(appointmentData);
        setActiveTab('reschedule');
        sessionStorage.removeItem('rescheduleAppointment'); // Clean up
        console.log('Set active tab to reschedule');
        return;
      } catch (error) {
        console.error('Error parsing session reschedule data:', error);
      }
    }

    if (customerParam) {
      try {
        const customerData = JSON.parse(decodeURIComponent(customerParam));
        setPrefillData({
          customer_name: customerData.name || '',
          customer_phone: customerData.phone || '',
          professional_id: customerData.professional_id || ''
        });
        setActiveTab('new');
      } catch (error) {
        console.error('Error parsing customer data:', error);
      }
    } else if (rescheduleParam) {
      try {
        const appointmentData = JSON.parse(decodeURIComponent(rescheduleParam));
        setRescheduleAppointment(appointmentData);
        setActiveTab('reschedule');
      } catch (error) {
        console.error('Error parsing reschedule data:', error);
      }
    } else if (phone || professional) {
      setPrefillData({
        customer_name: '',
        customer_phone: phone || '',
        professional_id: professional || ''
      });
      setActiveTab('new');
    }
  }, []);

  const handleAppointmentCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('list');
    setRescheduleAppointment(null);
  };

  // Listen for navigateToAppointments events
  useEffect(() => {
    const handleNavigateToAppointments = (event: any) => {
      const { reschedule } = event.detail;
      if (reschedule) {
        setRescheduleAppointment(reschedule);
        setActiveTab('reschedule');
      }
    };

    window.addEventListener('navigateToAppointments', handleNavigateToAppointments);

    return () => {
      window.removeEventListener('navigateToAppointments', handleNavigateToAppointments);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Agendamentos</h1>
          <p className="text-gray-600">Gerencie os agendamentos manuais</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'list'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Lista de Agendamentos
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'new'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Novo Agendamento
              </button>
              {rescheduleAppointment && (
                <button
                  onClick={() => {
                    console.log('Reschedule tab clicked, rescheduleAppointment:', rescheduleAppointment);
                    setActiveTab('reschedule');
                  }}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'reschedule'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Reagendar
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'list' && <AppointmentsList refreshTrigger={refreshTrigger} onReschedule={() => {}} />}
            {activeTab === 'new' && <AppointmentForm onSuccess={handleAppointmentCreated} prefillData={prefillData} />}
            {activeTab === 'reschedule' && rescheduleAppointment && (
              <AppointmentForm
                onSuccess={handleAppointmentCreated}
                rescheduleData={rescheduleAppointment}
              />
            )}
            {activeTab === 'reschedule' && !rescheduleAppointment && (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum agendamento selecionado para reagendamento</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}