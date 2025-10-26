import { useState, useEffect } from 'react';
import { useProfessionalAuth } from '../contexts/ProfessionalAuthContext';
import { supabase } from '../lib/supabase';
import { ApiService } from '../lib/api';
import { Calendar, Clock, Users, TrendingUp, LogOut, User, Settings, DollarSign } from 'lucide-react';
import AppointmentsList from '../components/Appointments/AppointmentsList';
import ProfessionalAppointmentsList from '../components/ProfessionalAppointmentsList';
import ProfessionalCustomersManager from '../components/Settings/ProfessionalCustomersManager';
import ProfessionalAppointmentForm from '../components/Appointments/ProfessionalAppointmentForm';
import ProfessionalCommissions from '../components/ProfessionalCommissions';
import CalendarComponent from '../components/Dashboard/Calendar';
import AppointmentSearch from '../components/Dashboard/AppointmentSearch';

interface Customer {
  id: string;
  name: string;
  phone: string;
  professional_id: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  professional_id: string;
}

export default function ProfessionalDashboardPage() {
  const { professional, logout } = useProfessionalAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'new-appointment' | 'reschedule-appointment' | 'customers' | 'reports'>('dashboard');
  const [, setLoading] = useState(true);
  const [selectedCustomerForAppointment, setSelectedCustomerForAppointment] = useState<Customer | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showCommissionsModal, setShowCommissionsModal] = useState(false);
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

      // Load appointments using ApiService from agpr logic
      const appointmentsApiService = ApiService.getInstance();
      const appointments = await appointmentsApiService.getAppointments();

      // Load customers for this professional from shared_customers
      const { data: customersData, error: customersError } = await supabase
        .from('shared_customers')
        .select('id, name, phone, professional_id')
        .eq('professional_id', professional.id)
        .order('name');

      if (customersError) throw customersError;

      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayAppointments = appointments?.filter(item => {
        const aptDate = new Date(item.appointment_date);
        return aptDate >= today && aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }).length || 0;

      const monthlyRevenue = appointments?.filter(item => {
        const aptDate = new Date(item.appointment_date);
        return aptDate >= thisMonth && item.status === 'completed';
      }).reduce((sum, item) => sum + item.total_price, 0) || 0;

      // Calculate monthly commissions for this professional using ApiService
      const commissionsApiService = ApiService.getInstance();
      const commissionData = await commissionsApiService.getCommissions();
      const monthlyCommissions = commissionData.commission_amount;

      setStats({
        totalAppointments: appointments?.length || 0,
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

  const handleRescheduleAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setActiveTab('reschedule-appointment');
  };

  const handleAppointmentFound = (appointment: any) => {
    setSelectedAppointment(appointment);
    setActiveTab('reschedule-appointment');
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
              { id: 'new-appointment', label: 'Novo Agendamento', icon: Clock },
              { id: 'reschedule-appointment', label: 'Reagendar', icon: Clock, hidden: true },
              { id: 'customers', label: 'Clientes', icon: Users },
              { id: 'reports', label: 'Relatórios', icon: Settings }
            ].filter(tab => !tab.hidden || activeTab === tab.id).map(({ id, label, icon: Icon }) => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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


              <div
                className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition"
                onClick={() => setShowCommissionsModal(true)}
              >
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

          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Meus Agendamentos</h3>
              <ProfessionalAppointmentsList onEditAppointment={handleRescheduleAppointment} />
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

        {activeTab === 'reschedule-appointment' && selectedAppointment && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reagendar Agendamento</h3>
              <ProfessionalAppointmentForm
                onSuccess={() => {
                  loadData();
                  setActiveTab('appointments');
                  setSelectedAppointment(null);
                }}
                rescheduleAppointment={selectedAppointment}
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


        {activeTab === 'reports' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Relatórios de Comissões</h3>
              <ProfessionalCommissions />
            </div>
          </div>
        )}

      </main>

      {/* Commissions Modal */}
      {showCommissionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Detalhes de Comissões</h2>
              <button
                onClick={() => setShowCommissionsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <ProfessionalCommissions />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}