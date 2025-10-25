import { useState, useEffect } from 'react';
import { X, Clock, User, Scissors, DollarSign, Trash2, RotateCcw, Users, CheckCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppointmentSearch from './AppointmentSearch';

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_date: string;
  status: string;
  total_price: number;
  notes: string;
  professional_id?: string;
  professional_name?: string;
  service_name?: string;
  duration_minutes?: number;
}

interface DayAppointmentsProps {
  selectedDate: Date | null;
  selectedProfessional: string | null;
  onClose: () => void;
  onAppointmentUpdate?: () => void;
}

export default function DayAppointments({ selectedDate, selectedProfessional, onClose, onAppointmentUpdate }: DayAppointmentsProps) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showChangeProfessionalModal, setShowChangeProfessionalModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newDateTime, setNewDateTime] = useState('');
  const [newProfessionalId, setNewProfessionalId] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
  const [searchedAppointment, setSearchedAppointment] = useState<any>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [user, selectedDate, selectedProfessional, currentDate, viewMode]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load professionals for filter
      const { data: profData } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      setProfessionals(profData || []);

      // Load appointments
      let query = supabase
        .from('appointments')
        .select(`
          *,
          professionals(name),
          services:appointment_services(
            service:services(name, duration_minutes)
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

      // Filter by date range based on view mode
      if (viewMode === 'list' && selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('appointment_date', startOfDay.toISOString())
          .lte('appointment_date', endOfDay.toISOString());
      } else if (viewMode === 'calendar') {
        // For calendar view, get appointments for the current month
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        query = query
          .gte('appointment_date', startOfMonth.toISOString())
          .lte('appointment_date', endOfMonth.toISOString());
      }

      if (selectedProfessional) {
        query = query.eq('professional_id', selectedProfessional);
      }

      const { data } = await query.order('appointment_date', { ascending: true });

      if (data) {
        const formatted = data.map(apt => ({
          ...apt,
          professional_id: apt.professional_id,
          professional_name: (apt.professionals as any)?.name,
          service_name: (apt.services as any)?.length === 1
            ? (apt.services as any)[0].service.name
            : `${(apt.services as any)?.length || 0} serviços`,
          duration_minutes: (apt.services as any)?.length === 1
            ? (apt.services as any)[0].service.duration_minutes
            : undefined
        }));
        setAppointments(formatted);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      loadData();
      onAppointmentUpdate?.();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Erro ao excluir agendamento');
    }
  };


  const handleChangeProfessional = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNewProfessionalId(appointment.professional_id || '');
    setShowChangeProfessionalModal(true);
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      loadData();
      onAppointmentUpdate?.();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Erro ao atualizar status do agendamento');
    }
  };

  const confirmReschedule = async () => {
    if (!selectedAppointment || !newDateTime) return;

    try {
      // Convert the datetime-local value to ISO string
      // The input gives us a string like "2025-10-15T14:30" and we need to convert it properly
      const dateTime = new Date(newDateTime);
      const isoString = dateTime.toISOString();

      const { error } = await supabase
        .from('appointments')
        .update({ appointment_date: isoString })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      setNewDateTime('');
      loadData();
      onAppointmentUpdate?.();
      alert('Agendamento reagendado com sucesso!');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert('Erro ao reagendar agendamento');
    }
  };

  const confirmChangeProfessional = async () => {
    if (!selectedAppointment || !newProfessionalId) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ professional_id: newProfessionalId })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      setShowChangeProfessionalModal(false);
      setSelectedAppointment(null);
      loadData();
      onAppointmentUpdate?.();
    } catch (error) {
      console.error('Error changing professional:', error);
      alert('Erro ao alterar profissional');
    }
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'calendar') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'calendar') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const getTitle = () => {
    if (selectedProfessional) {
      const prof = professionals.find(p => p.id === selectedProfessional);
      return `Agendamentos - ${prof?.name || 'Profissional'}`;
    }
    if (viewMode === 'calendar') {
      return `Agendamentos de ${currentDate.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      })}`;
    }
    if (selectedDate) {
      return `Agendamentos do dia ${selectedDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      })}`;
    }
    return 'Agendamentos';
  };

  const handleAppointmentFound = (appointment: any) => {
    setSearchedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSearchedAppointment(null);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getAppointmentsForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate.getDate() === day &&
             aptDate.getMonth() === date.getMonth() &&
             aptDate.getFullYear() === date.getFullYear();
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">{getTitle()}</h2>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Calendário
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
              {viewMode === 'calendar'
                ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
                : currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
              }
            </span>

            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Appointment Search */}
      <div className="mb-6">
        <AppointmentSearch onAppointmentFound={handleAppointmentFound} />
      </div>

      {viewMode === 'calendar' ? (
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {getDaysInMonth().map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const dayAppointments = getAppointmentsForDay(day);
              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={day}
                  className={`aspect-square border rounded-lg p-2 ${
                    isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  } hover:border-blue-300 transition cursor-pointer`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>
                  {dayAppointments.length > 0 && (
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 2).map(apt => (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            // For professional dashboard, open the appointment modal with actions
                            if (selectedProfessional) {
                              // This is from admin dashboard - open modal with actions
                              const event = new CustomEvent('openAppointmentModal', { detail: apt });
                              window.dispatchEvent(event);
                            } else {
                              // This is from professional dashboard - open reschedule modal
                              setSelectedAppointment(apt);
                              setShowRescheduleModal(true);
                            }
                          }}
                          className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-blue-200 transition"
                          title={`${apt.customer_name} - ${new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`}
                        >
                          {new Date(apt.appointment_date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayAppointments.length - 2} mais
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum agendamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {appointment.customer_name}
                  </h3>
                  <p className="text-sm text-gray-600">{appointment.customer_phone}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                  {getStatusText(appointment.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{appointment.professional_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{appointment.service_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {formatTime(appointment.appointment_date)}
                    {appointment.duration_minutes && ` (${appointment.duration_minutes}min)`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-blue-600">
                    R$ {appointment.total_price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                {appointment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                    >
                      <X className="w-3 h-3" />
                      Cancelar
                    </button>
                  </>
                )}
                {appointment.status === 'confirmed' && (
                  <button
                    onClick={() => handleStatusChange(appointment.id, 'completed')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Concluir
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const event = new CustomEvent('navigateToAppointments', { detail: { reschedule: appointment } });
                    window.dispatchEvent(event);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reagendar
                </button>
                <button
                  onClick={() => handleChangeProfessional(appointment)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition"
                >
                  <Users className="w-3 h-3" />
                  Trocar Prof.
                </button>
                <button
                  onClick={() => handleDelete(appointment.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  Excluir
                </button>
              </div>

              {appointment.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{appointment.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && searchedAppointment && (
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
                      <p className="text-lg font-semibold text-gray-900">{searchedAppointment.customer_name}</p>
                      <p className="text-sm text-gray-600">{searchedAppointment.customer_phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Profissional</label>
                      <p className="text-lg font-semibold text-gray-900">{searchedAppointment.professional_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data e Hora</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(searchedAppointment.appointment_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          timeZone: 'America/Sao_Paulo'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(searchedAppointment.appointment_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/Sao_Paulo'
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Serviço</label>
                      <p className="text-lg font-semibold text-gray-900">{searchedAppointment.service_name}</p>
                      <p className="text-sm font-semibold text-blue-600">R$ {searchedAppointment.total_price.toFixed(2)}</p>
                    </div>
                  </div>

                  {searchedAppointment.notes && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border">{searchedAppointment.notes}</p>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      searchedAppointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      searchedAppointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      searchedAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {searchedAppointment.status === 'confirmed' ? 'Confirmado' :
                       searchedAppointment.status === 'pending' ? 'Pendente' :
                       searchedAppointment.status === 'cancelled' ? 'Cancelado' :
                       searchedAppointment.status}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4 pt-4 border-t">
                  {/* Status Actions */}
                  {searchedAppointment.status !== 'completed' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Alterar Status</label>
                      <div className="flex gap-2">
                        {searchedAppointment.status === 'pending' && (
                          <button
                            onClick={() => {
                              handleStatusChange(searchedAppointment.id, 'confirmed');
                              handleCloseAppointmentModal();
                            }}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition"
                          >
                            Confirmar
                          </button>
                        )}
                        {searchedAppointment.status === 'confirmed' && (
                          <button
                            onClick={() => {
                              handleStatusChange(searchedAppointment.id, 'completed');
                              handleCloseAppointmentModal();
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                          >
                            Concluir
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleStatusChange(searchedAppointment.id, 'cancelled');
                            handleCloseAppointmentModal();
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}


                  {/* Main Actions */}
                  {searchedAppointment.status !== 'completed' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const event = new CustomEvent('navigateToAppointments', { detail: { reschedule: searchedAppointment } });
                          window.dispatchEvent(event);
                          handleCloseAppointmentModal();
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        Reagendar
                      </button>
                      <button
                        onClick={() => {
                          handleDelete(searchedAppointment.id);
                          handleCloseAppointmentModal();
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={handleCloseAppointmentModal}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        Fechar
                      </button>
                    </div>
                  )}

                  {searchedAppointment.status === 'completed' && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleCloseAppointmentModal}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                      >
                        Fechar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reagendar Agendamento</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cliente: {selectedAppointment.customer_name}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova data e hora
              </label>
              <input
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReschedule}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Professional Modal */}
      {showChangeProfessionalModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Trocar Profissional</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cliente: {selectedAppointment.customer_name}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Novo profissional
              </label>
              <select
                value={newProfessionalId}
                onChange={(e) => setNewProfessionalId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecione um profissional</option>
                {professionals.map(prof => (
                  <option key={prof.id} value={prof.id}>{prof.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowChangeProfessionalModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmChangeProfessional}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}