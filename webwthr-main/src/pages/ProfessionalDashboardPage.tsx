import { useState, useEffect } from 'react';
import { useProfessionalAuth } from '../contexts/ProfessionalAuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, Users, TrendingUp, LogOut, User, Settings } from 'lucide-react';
import AppointmentsList from '../components/Appointments/AppointmentsList';
import ProfessionalCustomersManager from '../components/Settings/ProfessionalCustomersManager';
import ProfessionalAppointmentForm from '../components/Appointments/ProfessionalAppointmentForm';
import Charts from '../components/Dashboard/Charts';
import CalendarComponent from '../components/Dashboard/Calendar';
import AppointmentSearch from '../components/Dashboard/AppointmentSearch';

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_date: string;
  status: string;
  total_price: number;
  notes: string;
  services: Array<{
    service: {
      name: string;
    };
  }>;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  professional_id: string;
}

export default function ProfessionalDashboardPage() {
  const { professional, logout } = useProfessionalAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'new-appointment' | 'customers' | 'reports' | 'calendar'>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerForAppointment, setSelectedCustomerForAppointment] = useState<Customer | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
    monthlyCommissions: 0
  });

  useEffect(() => {
    if (professional) {
      loadData();
    }
  }, [professional]);

  const loadData = async () => {
    if (!professional) return;

    try {
      setLoading(true);

      // Load appointments for this professional from shared data
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_appointment_data')
        .select('*')
        .eq('professional_id', professional.id)
        .order('appointment_date', { ascending: false });

      if (sharedError) throw sharedError;

      // Load customers for this professional from shared_customers
      const { data: customersData, error: customersError } = await supabase
        .from('shared_customers')
        .select('id, name, phone, professional_id')
        .eq('professional_id', professional.id)
        .order('name');

      if (customersError) throw customersError;

      // Transform shared data to match appointment interface
      const transformedAppointments = (sharedData || []).map(item => ({
        id: item.appointment_id,
        customer_name: item.customer_name,
        customer_phone: item.customer_phone,
        appointment_date: item.appointment_date,
        status: item.status,
        total_price: item.total_price,
        notes: item.notes,
        services: Array.isArray(item.services) ? item.services.map((s: any) => ({
          service: {
            name: s.name || 'Serviço'
          }
        })) : []
      }));

      setCustomers(customersData || []);

      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayAppointments = sharedData?.filter(item => {
        const aptDate = new Date(item.appointment_date);
        return aptDate >= today && aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }).length || 0;

      const monthlyRevenue = sharedData?.filter(item => {
        const aptDate = new Date(item.appointment_date);
        return aptDate >= thisMonth && item.status === 'completed';
      }).reduce((sum, item) => sum + item.total_price, 0) || 0;

      // Calculate monthly commissions for this professional
      const monthlyCommissions = sharedData?.filter(item => {
        const aptDate = new Date(item.appointment_date);
        return aptDate >= thisMonth && item.status === 'completed';
      }).reduce((sum, item) => {
        // Calculate commission based on services and their commission rates
        // For now, using a simple calculation - this would need to be enhanced
        // based on the actual service commission rates
        return sum + (item.total_price * 0.1); // 10% default commission
      }, 0) || 0;

      setStats({
        totalAppointments: sharedData?.length || 0,
        todayAppointments,
        totalCustomers: customersData?.length || 0,
        monthlyRevenue,
        monthlyCommissions
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleCustomerClickForAppointment = (customer: Customer) => {
    setSelectedCustomerForAppointment(customer);
    setActiveTab('new-appointment');
  };

  const handleAppointmentFound = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSelectedAppointment(null);
  };

  if (!professional) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Painel do Profissional
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {professional.name}
                </span>
                <span className="text-xs text-gray-500">
                  ({professional.specialty})
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'appointments', label: 'Agendamentos', icon: Calendar },
              { id: 'calendar', label: 'Agenda', icon: Calendar },
              { id: 'new-appointment', label: 'Novo Agendamento', icon: Clock },
              { id: 'customers', label: 'Clientes', icon: Users },
              { id: 'reports', label: 'Relatórios', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Appointment Search */}
            <AppointmentSearch onAppointmentFound={handleAppointmentFound} />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total de Agendamentos
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalAppointments}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Hoje
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.todayAppointments}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total de Clientes
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalCustomers}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Receita Mensal
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          R$ {stats.monthlyRevenue.toFixed(2)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Comissões do Mês
                        </dt>
                        <dd className="text-lg font-medium text-green-600">
                          R$ {stats.monthlyCommissions.toFixed(2)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Relatórios</h3>
              <Charts />
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Meus Agendamentos</h3>
              <AppointmentsList refreshTrigger={0} onReschedule={(appointment) => {
                const event = new CustomEvent('navigateToAppointments', { detail: { reschedule: appointment } });
                window.dispatchEvent(event);
              }} />
            </div>
          </div>
        )}

        {activeTab === 'new-appointment' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Novo Agendamento</h3>
              <ProfessionalAppointmentForm
                onSuccess={() => {
                  loadData();
                  setActiveTab('appointments');
                  setSelectedCustomerForAppointment(null);
                }}
                prefillCustomer={selectedCustomerForAppointment || undefined}
              />
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Meus Clientes</h3>
              <ProfessionalCustomersManager
                onCustomerUpdate={loadData}
                onCustomerClickForAppointment={handleCustomerClickForAppointment}
              />
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Minha Agenda</h3>
              <CalendarComponent />
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Relatórios Detalhados</h3>
              <div className="text-center py-12">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Relatórios em Desenvolvimento</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Funcionalidade de relatórios detalhados será implementada em breve.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Modal */}
        {showAppointmentModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Detalhes do Agendamento</h3>
                  <button
                    onClick={handleCloseAppointmentModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Appointment Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Cliente</label>
                        <p className="text-lg font-semibold text-gray-900">{selectedAppointment.customer_name}</p>
                        <p className="text-sm text-gray-600">{selectedAppointment.customer_phone}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Data e Hora</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(selectedAppointment.appointment_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(selectedAppointment.appointment_date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Serviço</label>
                        <p className="text-lg font-semibold text-gray-900">{selectedAppointment.service_name}</p>
                        <p className="text-sm font-semibold text-blue-600">R$ {selectedAppointment.total_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedAppointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          selectedAppointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedAppointment.status === 'confirmed' ? 'Confirmado' :
                           selectedAppointment.status === 'pending' ? 'Pendente' :
                           selectedAppointment.status === 'cancelled' ? 'Cancelado' :
                           selectedAppointment.status}
                        </span>
                      </div>
                    </div>

                    {selectedAppointment.notes && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <p className="text-sm text-gray-600 bg-white p-3 rounded border">{selectedAppointment.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => {
                        const event = new CustomEvent('navigateToAppointments', { detail: { reschedule: selectedAppointment } });
                        window.dispatchEvent(event);
                        handleCloseAppointmentModal();
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                    >
                      Reagendar
                    </button>
                    <button
                      onClick={handleCloseAppointmentModal}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}