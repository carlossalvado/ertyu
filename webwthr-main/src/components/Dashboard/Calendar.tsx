import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useProfessionalAuth } from '../../contexts/ProfessionalAuthContext';

interface Appointment {
  id: string;
  customer_name: string;
  appointment_date: string;
  status: string;
  total_price: number;
  professional_name?: string;
  service_name?: string;
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface CalendarProps {
  onAppointmentClick?: (appointment: Appointment) => void;
  onDateClick?: (date: Date) => void;
  onProfessionalFilter?: (professionalId: string | null) => void;
  refreshTrigger?: number;
}

export default function Calendar({ onAppointmentClick, onDateClick, onProfessionalFilter, refreshTrigger }: CalendarProps) {
  const { user } = useAuth();
  const { professional } = useProfessionalAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
    loadProfessionals();
  }, [user, professional, currentDate, viewMode, selectedProfessional, refreshTrigger]);

  const loadAppointments = async () => {
    if (!user && !professional) return;

    const startDate = getStartDate();
    const endDate = getEndDate();

    let query;

    if (professional) {
      // Professionals use shared_appointment_data table
      query = supabase
        .from('shared_appointment_data')
        .select('*')
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString())
        .neq('status', 'cancelled')
        .eq('professional_id', professional.id);
    } else {
      // Admins use regular appointments table
      query = supabase
        .from('appointments')
        .select(`
          *,
          professionals(name),
          services:appointment_services(
            service:services(name, duration_minutes)
          )
        `)
        .eq('user_id', user!.id)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString())
        .neq('status', 'cancelled');

      if (selectedProfessional) {
        query = query.eq('professional_id', selectedProfessional);
      }
    }

    const { data } = await query.order('appointment_date', { ascending: true });

    if (data) {
      let formatted;
      if (professional) {
        // Format shared appointment data
        formatted = data.map(apt => ({
          id: apt.appointment_id,
          customer_name: apt.customer_name,
          customer_phone: apt.customer_phone,
          appointment_date: apt.appointment_date,
          status: apt.status,
          total_price: apt.total_price,
          professional_name: professional?.name || 'Profissional',
          service_name: Array.isArray(apt.services) && apt.services.length === 1
            ? apt.services[0]?.name || 'Serviço'
            : `${apt.services?.length || 0} serviços`,
          notes: apt.notes
        }));
      } else {
        // Format regular appointment data
        formatted = data.map(apt => ({
          ...apt,
          professional_name: (apt.professionals as any)?.name || 'Profissional',
          service_name: (apt.services as any)?.length === 1
            ? (apt.services as any)[0]?.service?.name || 'Serviço'
            : `${(apt.services as any)?.length || 0} serviços`
        }));
      }
      setAppointments(formatted);
    }
  };

  const loadProfessionals = async () => {
    if (!user && !professional) return;

    // If professional is logged in, don't load professionals list (only show their own appointments)
    if (professional) {
      setProfessionals([]);
      return;
    }

    const { data } = await supabase
      .from('professionals')
      .select('id, name')
      .eq('user_id', user!.id)
      .eq('active', true)
      .order('name');

    setProfessionals(data || []);
  };

  const getStartDate = () => {
    const date = new Date(currentDate);
    if (viewMode === 'daily') {
      date.setHours(0, 0, 0, 0);
    } else if (viewMode === 'weekly') {
      const day = date.getDay();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);
    } else {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  const getEndDate = () => {
    const date = new Date(currentDate);
    if (viewMode === 'daily') {
      date.setHours(23, 59, 59, 999);
    } else if (viewMode === 'weekly') {
      const day = date.getDay();
      date.setDate(date.getDate() + (6 - day));
      date.setHours(23, 59, 59, 999);
    } else {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
    }
    return date;
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDateRangeText = () => {
    if (viewMode === 'daily') {
      return currentDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      });
    } else if (viewMode === 'weekly') {
      const start = getStartDate();
      const end = getEndDate();
      return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })}`;
    } else {
      return currentDate.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      });
    }
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Calendário</h2>
        </div>

        <div className="flex items-center space-x-3">
          {!professional && (
            <select
              value={selectedProfessional || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedProfessional(value || null);
                if (onProfessionalFilter) {
                  onProfessionalFilter(value || null);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os profissionais</option>
              {professionals.map(prof => (
                <option key={prof.id} value={prof.id}>{prof.name}</option>
              ))}
            </select>
          )}

          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                viewMode === 'daily'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                viewMode === 'weekly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                viewMode === 'monthly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={navigatePrevious}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <h3 className="text-lg font-semibold text-gray-800 capitalize">
          {getDateRangeText()}
        </h3>

        <button
          onClick={navigateNext}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {viewMode === 'monthly' && (
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
                  onClick={() => {
                    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    if (onDateClick) {
                      onDateClick(clickedDate);
                    }
                  }}
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
                      {dayAppointments.slice(0, 3).map(apt => (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick?.(apt);
                          }}
                          className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 rounded-md shadow-sm hover:from-blue-600 hover:to-blue-700 transition cursor-pointer truncate font-medium"
                          title={`${apt.customer_name} - ${new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{apt.customer_name}</span>
                            <span className="ml-1 text-blue-100 font-bold">
                              {new Date(apt.appointment_date).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'America/Sao_Paulo'
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md">
                          +{dayAppointments.length - 3} mais
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(viewMode === 'daily' || viewMode === 'weekly') && (
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum agendamento neste período</p>
            </div>
          ) : (
            appointments.map(apt => (
              <div
                key={apt.id}
                onClick={() => onAppointmentClick?.(apt)}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-800">{apt.customer_name}</h4>
                    <p className="text-sm text-gray-600">{apt.service_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {apt.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{apt.professional_name}</span>
                  <span className="font-medium">
                    {new Date(apt.appointment_date).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZone: 'America/Sao_Paulo'
                    })}
                  </span>
                  <span className="font-semibold text-blue-600">
                    R$ {apt.total_price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
