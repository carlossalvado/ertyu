import { useState } from 'react';
import { Search, User, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import DatePicker from '../Appointments/DatePicker';

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_date: string;
  status: string;
  total_price: number;
  professional_name?: string;
  service_name?: string;
  notes?: string;
  professional_id?: string;
  duration_minutes?: number;
}

interface AppointmentSearchProps {
  onAppointmentFound: (appointment: Appointment) => void;
}

export default function AppointmentSearch({ onAppointmentFound }: AppointmentSearchProps) {
  const { user } = useAuth();
  const [searchFilters, setSearchFilters] = useState({
    date: '',
    customerName: '',
    customerPhone: ''
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Appointment[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!user) return;

    setIsSearching(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          professionals(name),
          services:appointment_services(
            service:services(name, duration_minutes)
          )
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (searchFilters.date) {
        const searchDate = new Date(searchFilters.date + 'T00:00:00');
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);

        query = query
          .gte('appointment_date', searchDate.toISOString())
          .lt('appointment_date', nextDay.toISOString());
      }

      if (searchFilters.customerName) {
        query = query.ilike('customer_name', `%${searchFilters.customerName}%`);
      }

      if (searchFilters.customerPhone) {
        query = query.ilike('customer_phone', `%${searchFilters.customerPhone}%`);
      }

      const { data, error } = await query
        .order('appointment_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted = (data || []).map(apt => ({
        ...apt,
        professional_name: (apt.professionals as any)?.name,
        service_name: (apt.services as any)?.length === 1
          ? (apt.services as any)[0].service.name
          : `${(apt.services as any)?.length || 0} serviços`,
        duration_minutes: (apt.services as any)?.length === 1
          ? (apt.services as any)[0].service.duration_minutes
          : undefined
      }));

      setSearchResults(formatted);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching appointments:', error);
      alert('Erro ao buscar agendamentos');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    onAppointmentFound(appointment);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchFilters({
      date: '',
      customerName: '',
      customerPhone: ''
    });
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Buscar Agendamentos</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data
          </label>
          <DatePicker
            selectedDate={searchFilters.date}
            onDateSelect={(date) => setSearchFilters(prev => ({ ...prev, date }))}
            placeholder="dd/mm/yyyy"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Cliente
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchFilters.customerName}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o nome..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              value={searchFilters.customerPhone}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, customerPhone: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+55 11 99999-9999"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4" />
          {isSearching ? 'Buscando...' : 'Buscar'}
        </button>
        <button
          onClick={clearSearch}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Limpar
        </button>
      </div>

      {showResults && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-800">
              Resultados ({searchResults.length})
            </h4>
            <button
              onClick={() => setShowResults(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum agendamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {searchResults.map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => handleAppointmentClick(appointment)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-lg">
                        {appointment.customer_name}
                      </h4>
                      <p className="text-sm text-gray-600">{appointment.customer_phone}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {appointment.status === 'confirmed' ? 'Confirmado' :
                       appointment.status === 'pending' ? 'Pendente' :
                       appointment.status === 'cancelled' ? 'Cancelado' :
                       appointment.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📅</span>
                      <span>
                        {new Date(appointment.appointment_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          timeZone: 'America/Sao_Paulo'
                        })}
                        {' às '}
                        {new Date(appointment.appointment_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/Sao_Paulo'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{appointment.professional_name}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">{appointment.service_name}</span>
                    <span className="font-semibold text-blue-600">R$ {appointment.total_price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}