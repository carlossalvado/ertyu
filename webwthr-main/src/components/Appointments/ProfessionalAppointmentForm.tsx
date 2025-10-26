import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfessionalAuth } from '../../contexts/ProfessionalAuthContext';
import { Clock, User, Phone, DollarSign, FileText, Plus, X, Search } from 'lucide-react';
import TimeSlotPicker from './TimeSlotPicker';
import DatePicker from './DatePicker';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  professional_id: string;
}

interface SelectedService {
  service_id: string;
}

interface ProfessionalAppointmentFormProps {
  onSuccess: () => void;
  prefillCustomer?: Customer;
  rescheduleAppointment?: any;
}

export default function ProfessionalAppointmentForm({ onSuccess, prefillCustomer, rescheduleAppointment }: ProfessionalAppointmentFormProps) {
  const { professional } = useProfessionalAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    appointment_date: '',
    appointment_time: '',
    notes: ''
  });

  // Helper functions for date formatting
  const formatDateForDisplay = (isoDate: string) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const parseDateFromDisplay = (displayDate: string) => {
    if (!displayDate) return '';
    const [day, month, year] = displayDate.split('/');
    if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const isValidDate = (displayDate: string) => {
    const isoDate = parseDateFromDisplay(displayDate);
    if (!isoDate) return false;
    const date = new Date(isoDate);
    return date instanceof Date && !isNaN(date.getTime());
  };

  useEffect(() => {
    if (professional) {
      loadData();
    }
  }, [professional]);

  useEffect(() => {
    if (prefillCustomer) {
      setSelectedCustomer(prefillCustomer);
      setFormData(prev => ({
        ...prev,
        customer_name: prefillCustomer.name,
        customer_phone: prefillCustomer.phone
      }));
    }
  }, [prefillCustomer]);

  useEffect(() => {
    if (rescheduleAppointment) {
      // Pre-fill form with reschedule data
      const appointmentDate = new Date(rescheduleAppointment.appointment_date);
      setFormData({
        customer_name: rescheduleAppointment.customer_name,
        customer_phone: rescheduleAppointment.customer_phone,
        appointment_date: formatDateForDisplay(appointmentDate.toISOString().split('T')[0]),
        appointment_time: appointmentDate.toTimeString().slice(0, 5),
        notes: rescheduleAppointment.notes || ''
      });

      // Find and select the customer
      const customer = customers.find(c => c.phone === rescheduleAppointment.customer_phone);
      if (customer) {
        setSelectedCustomer(customer);
      }

      // Load services from the appointment
      if (rescheduleAppointment.services) {
        const servicesToSelect = rescheduleAppointment.services.map((service: any) => ({
          service_id: service.service?.id || service.id
        }));
        setSelectedServices(servicesToSelect);
      }
    }
  }, [rescheduleAppointment, customers]);

  const loadData = async () => {
    if (!professional) return;

    try {
      // Load services for this professional from professional_services
      const { data: professionalServices, error: profServicesError } = await supabase
        .from('professional_services')
        .select(`
          service_id,
          services (
            id,
            name,
            price,
            duration_minutes
          )
        `)
        .eq('professional_id', professional.id);

      if (profServicesError) {
        console.error('Error loading professional services:', profServicesError);
        // Fallback to all active services if professional_services fails
        const { data: fallbackServices, error: fallbackError } = await supabase
          .from('services')
          .select('id, name, price, duration_minutes')
          .eq('active', true)
          .order('name');

        if (fallbackError) throw fallbackError;
        setServices(fallbackServices || []);
      } else {
        // Extract services from professional_services relationship
        const servicesData = professionalServices?.map((ps: any) => ps.services).filter(Boolean) || [];
        setServices(servicesData);
      }

      // Load customers for this professional from customers table
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, professional_id')
        .eq('professional_id', professional.id)
        .order('name');

      if (customersError) throw customersError;

      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const handleCustomerChange = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);

    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_name: customer.name,
        customer_phone: customer.phone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        customer_name: '',
        customer_phone: ''
      }));
    }
  };

  const addService = () => {
    setSelectedServices(prev => [...prev, { service_id: '' }]);
  };

  const removeService = (index: number) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  const updateService = (index: number, serviceId: string) => {
    setSelectedServices(prev => prev.map((service, i) =>
      i === index ? { service_id: serviceId } : service
    ));
  };

  const checkTimeConflict = async (appointmentDateTime: Date) => {
    if (!professional) return { hasConflict: false, conflictingAppointments: [] };

    // Calculate total duration of all selected services
    let totalDuration = 0;
    for (const selectedService of selectedServices) {
      const service = services.find(s => s.id === selectedService.service_id);
      if (service) {
        totalDuration += service.duration_minutes;
      }
    }

    // Calculate end time of this appointment
    const appointmentEndTime = new Date(appointmentDateTime);
    appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + totalDuration);

    // Check for conflicting appointments (exclude current appointment if rescheduling)
    const query = supabase
      .from('appointments')
      .select('id, appointment_date, status, customer_name')
      .eq('professional_id', professional.id)
      .gte('appointment_date', appointmentDateTime.toISOString())
      .lt('appointment_date', appointmentEndTime.toISOString())
      .neq('status', 'cancelled');

    // Exclude current appointment if rescheduling
    if (rescheduleAppointment) {
      query.neq('id', rescheduleAppointment.id);
    }

    const { error } = await query;

    if (error) {
      console.error('Error checking time conflicts:', error);
      return { hasConflict: false, conflictingAppointments: [] };
    }

    // Also check if any existing appointment overlaps with our time slot
    const overlapQuery = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        status,
        customer_name,
        appointment_services(
          service:services(duration_minutes)
        )
      `)
      .eq('professional_id', professional.id)
      .neq('status', 'cancelled')
      .neq('status', 'completed');

    // Exclude current appointment if rescheduling
    if (rescheduleAppointment) {
      overlapQuery.neq('id', rescheduleAppointment.id);
    }

    const { data: overlappingAppointments, error: overlapError } = await overlapQuery;

    if (overlapError) {
      console.error('Error checking overlapping appointments:', overlapError);
      return { hasConflict: false, conflictingAppointments: [] };
    }

    // Check if any existing appointment's time slot overlaps with our new appointment
    const overlappingConflicts: any[] = [];
    for (const apt of overlappingAppointments || []) {
      const aptStartTime = new Date(apt.appointment_date);
      let aptDuration = 0;

      // Calculate duration of existing appointment
      for (const aptService of (apt.appointment_services as any) || []) {
        if (aptService.service?.duration_minutes) {
          aptDuration += aptService.service.duration_minutes;
        }
      }

      const aptEndTime = new Date(aptStartTime);
      aptEndTime.setMinutes(aptEndTime.getMinutes() + aptDuration);

      // Check for overlap
      if ((appointmentDateTime < aptEndTime && appointmentEndTime > aptStartTime)) {
        overlappingConflicts.push(apt);
      }
    }

    return {
      hasConflict: overlappingConflicts.length > 0,
      conflictingAppointments: overlappingConflicts
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional || selectedServices.length === 0) return;

    setLoading(true);
    try {
      // Combine date and time
      const isoDate = parseDateFromDisplay(formData.appointment_date);
      if (!isValidDate(formData.appointment_date)) {
        alert('Data inválida. Use o formato dd/mm/yyyy.');
        setLoading(false);
        return;
      }
      const appointmentDateTime = new Date(`${isoDate}T${formData.appointment_time}`);

      // Check for time conflicts
      const conflictResult = await checkTimeConflict(appointmentDateTime);
      if (conflictResult.hasConflict) {
        alert('Horário conflitante! Já existe um agendamento para este horário.');
        setLoading(false);
        return;
      }

      // Calculate total price and prepare services
      let totalPrice = 0;
      const appointmentServices = [];

      for (const selectedService of selectedServices) {
        const service = services.find(s => s.id === selectedService.service_id);
        if (!service) throw new Error('Serviço não encontrado');

        totalPrice += service.price;
        appointmentServices.push({
          service_id: selectedService.service_id,
          price: service.price,
          used_package_session: false
        });
      }

      // Find or create customer
      let customerId = selectedCustomer?.id;
      if (!customerId) {
        // Create new customer in customers table (not shared_customers)
        // Get user_id from professionals table
        const { data: profData, error: profError } = await supabase
          .from('professionals')
          .select('user_id')
          .eq('id', professional.id)
          .single();

        if (profError) throw profError;

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: formData.customer_name,
            phone: formData.customer_phone,
            professional_id: professional.id,
            user_id: profData.user_id
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Get user_id from professionals table
      const { data: profData, error: profError } = await supabase
        .from('professionals')
        .select('user_id')
        .eq('id', professional.id)
        .single();

      if (profError) throw profError;

      // Create or update appointment
      let appointment;
      if (rescheduleAppointment) {
        // For rescheduling, delete the old appointment and create a new one
        // This ensures the old time slot is freed up
        await supabase
          .from('appointments')
          .delete()
          .eq('id', rescheduleAppointment.id);

        // Create new appointment with updated details
        const { data: newAppointment, error: createError } = await supabase
          .from('appointments')
          .insert({
            user_id: profData.user_id,
            professional_id: professional.id,
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            appointment_date: appointmentDateTime.toISOString(),
            total_price: totalPrice,
            notes: formData.notes,
            status: 'pending'
          })
          .select()
          .single();

        if (createError) throw createError;
        appointment = newAppointment;
      } else {
        // Create new appointment
        const { data: newAppointment, error: createError } = await supabase
          .from('appointments')
          .insert({
            user_id: profData.user_id,
            professional_id: professional.id,
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            appointment_date: appointmentDateTime.toISOString(),
            total_price: totalPrice,
            notes: formData.notes,
            status: 'pending'
          })
          .select()
          .single();

        if (createError) throw createError;
        appointment = newAppointment;
      }

      // Error handling is done in the if/else blocks above

      // Create appointment services
      const servicesToInsert = appointmentServices.map(service => ({
        appointment_id: appointment.id,
        service_id: service.service_id,
        price: service.price,
        used_package_session: service.used_package_session
      }));

      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(servicesToInsert);

      if (servicesError) throw servicesError;

      // Reset form
      setFormData({
        customer_name: '',
        customer_phone: '',
        appointment_date: '',
        appointment_time: '',
        notes: ''
      });
      setSelectedCustomer(null);
      setSelectedServices([]);

      onSuccess();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    let total = 0;
    selectedServices.forEach(selectedService => {
      const service = services.find(s => s.id === selectedService.service_id);
      if (service) {
        total += service.price;
      }
    });
    return total;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente
            </label>
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Novo cliente</option>
              {filteredCustomers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Cliente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome ou telefone..."
              />
            </div>
            {searchTerm && (
              <div className="mt-1 text-xs text-gray-600">
                {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} encontrado{filteredCustomers.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Cliente
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome completo"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+55 11 99999-9999"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Serviços
            </label>
            <button
              type="button"
              onClick={addService}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar Serviço
            </button>
          </div>

          {selectedServices.map((selectedService, index) => {
            const service = services.find(s => s.id === selectedService.service_id);

            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    Serviço {index + 1}
                  </h4>
                  {selectedServices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serviço
                    </label>
                    <select
                      value={selectedService.service_id}
                      onChange={(e) => updateService(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Selecione um serviço</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - R$ {service.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {service && (
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-600" />
                        <span className="font-semibold text-gray-900">
                          R$ {service.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span>{service.duration_minutes} minutos</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedServices.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-800">
                  Total: R$ {calculateTotalPrice().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Data
             </label>
             <DatePicker
               selectedDate={parseDateFromDisplay(formData.appointment_date)}
               onDateSelect={(isoDate) => setFormData({ ...formData, appointment_date: formatDateForDisplay(isoDate) })}
               minDate={new Date()}
               placeholder="dd/mm/yyyy"
             />
           </div>
        </div>

        {/* Time Slot Picker */}
        {formData.appointment_date && isValidDate(formData.appointment_date) && professional && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <TimeSlotPicker
              selectedDate={parseDateFromDisplay(formData.appointment_date)}
              selectedProfessional={professional.id}
              selectedServices={selectedServices}
              onTimeSelect={(time) => setFormData({ ...formData, appointment_time: time })}
              selectedTime={formData.appointment_time}
              services={services}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Observações adicionais..."
            />
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (rescheduleAppointment ? 'Reagendando...' : 'Criando Agendamento...') : (rescheduleAppointment ? 'Reagendar Agendamento' : 'Criar Agendamento')}
          </button>
        </div>
      </form>
    </div>
  );
}