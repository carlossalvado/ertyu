import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, User, Phone, Scissors, DollarSign, CheckCircle, XCircle, AlertCircle, Search, CheckSquare, Square } from 'lucide-react';

interface Appointment {
  id: string
  user_id?: string
  professional_id: string
  customer_name: string
  customer_phone: string
  appointment_date: string
  status: string
  notes?: string
  total_price: number
  created_at?: string
  updated_at?: string
  services?: Array<{
    id: string
    name: string
    price: number
    duration_minutes: number
    used_package_session: boolean
  }>
}

interface ProfessionalAppointmentsListProps {
  onEditAppointment: (appointment: Appointment) => void;
}

export default function ProfessionalAppointmentsList({ onEditAppointment }: ProfessionalAppointmentsListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      // Use the same logic as the admin AppointmentsList but filtered by professional
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          *,
          professionals(name),
          services:appointment_services(
            service:services(name),
            price,
            used_package_session
          )
        `)
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      const data = appointmentsData?.map(apt => ({
        ...apt,
        professional_name: (apt.professionals as any)?.name || 'Profissional',
        services: (apt.services as any) || []
      })) || [];

      console.log('ProfessionalAppointmentsList - Loaded appointments:', data.length);
      console.log('Sample appointment:', data[0]);

      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    console.log(`Updating appointment ${id} to status: ${newStatus}`);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: newStatus
        })
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`Successfully updated appointment ${id} to ${newStatus}`);
      loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Erro ao atualizar agendamento. Tente novamente.');
    }
  };

  const toggleAppointmentSelection = (appointmentId: string) => {
    const newSelected = new Set(selectedAppointments);
    if (newSelected.has(appointmentId)) {
      newSelected.delete(appointmentId);
    } else {
      newSelected.add(appointmentId);
    }
    setSelectedAppointments(newSelected);
  };

  const selectAllAppointments = () => {
    if (selectedAppointments.size === filteredAppointments.length) {
      setSelectedAppointments(new Set());
    } else {
      setSelectedAppointments(new Set(filteredAppointments.map(a => a.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    // Filter by status
    if (filter !== 'all' && apt.status !== filter) return false;

    // Filter by search term (customer name or phone)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = apt.customer_name.toLowerCase().includes(searchLower);
      const phoneMatch = apt.customer_phone.includes(searchTerm);
      if (!nameMatch && !phoneMatch) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Buscar por nome ou telefone do cliente..."
          />
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            {filteredAppointments.length} agendamento{filteredAppointments.length !== 1 ? 's' : ''} encontrado{filteredAppointments.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Agendamentos</h3>
            {selectedAppointments.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedAppointments.size} selecionado{selectedAppointments.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={selectAllAppointments}
            className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg flex items-center gap-2 transition"
          >
            {selectedAppointments.size === filteredAppointments.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {selectedAppointments.size === filteredAppointments.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({appointments.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendentes ({appointments.filter(a => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'confirmed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Confirmados ({appointments.filter(a => a.status === 'confirmed').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Concluídos ({appointments.filter(a => a.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'cancelled'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cancelados ({appointments.filter(a => a.status === 'cancelled').length})
          </button>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum agendamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className={`bg-white border rounded-lg p-6 hover:shadow-sm transition ${
                selectedAppointments.has(appointment.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleAppointmentSelection(appointment.id)}
                    className="text-gray-400 hover:text-blue-600 transition"
                  >
                    {selectedAppointments.has(appointment.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{appointment.customer_name}</h3>
                    <p className="text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {appointment.customer_phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {getStatusIcon(appointment.status)}
                    {getStatusText(appointment.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {appointment.services?.length === 1
                      ? appointment.services[0]?.name || 'Serviço'
                      : `${appointment.services?.length || 0} serviços`
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-blue-600">R$ {appointment.total_price.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {appointment.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(appointment.id, 'confirmed')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Confirmar"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateStatus(appointment.id, 'cancelled')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Cancelar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {appointment.status === 'confirmed' && (
                    <button
                      onClick={() => updateStatus(appointment.id, 'completed')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Marcar como concluído"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEditAppointment(appointment)}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    Editar
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(appointment.appointment_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      timeZone: 'America/Sao_Paulo'
                    })}
                  </span>
                  <Clock className="w-4 h-4 ml-2" />
                  <span>
                    {new Date(appointment.appointment_date).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Sao_Paulo'
                    })}
                  </span>
                </div>
              </div>

              {appointment.notes && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{appointment.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}