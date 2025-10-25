import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, User, Phone, DollarSign, FileText, Plus, X } from 'lucide-react';
import TimeSlotPicker from './TimeSlotPicker';
import DatePicker from './DatePicker';

interface Professional {
  id: string;
  name: string;
  specialty: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  has_package?: boolean;
  package_sessions?: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  professional_id?: string;
  professional?: {
    id: string;
    name: string;
    specialty: string;
  };
}

interface CustomerPackage {
  id: string;
  package_id: string;
  paid: boolean;
  expiration_date: string | null;
  package: {
    name: string;
    services: Array<{
      service_id: string;
      quantity: number;
      service: {
        name: string;
      };
      customer_sessions?: {
        sessions_remaining: number;
      };
    }>;
  };
}

interface SelectedService {
  service_id: string;
  use_package: boolean;
  package_id?: string;
}

interface RescheduleAppointment {
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

interface AppointmentFormProps {
  onSuccess: () => void;
  rescheduleData?: RescheduleAppointment;
  prefillData?: {
    customer_name?: string;
    customer_phone?: string;
    professional_id?: string;
  };
}

export default function AppointmentForm({ onSuccess, rescheduleData, prefillData }: AppointmentFormProps) {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [showOverlapConfirmation, setShowOverlapConfirmation] = useState(false);
  const [overlapDetails, setOverlapDetails] = useState<{
    conflictingAppointments: any[];
    proposedStart: Date;
    proposedEnd: Date;
  } | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    professional_id: '',
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
    loadData();
    if (rescheduleData) {
      // Pre-fill form with reschedule data
      const appointmentDate = new Date(rescheduleData.appointment_date);
      setFormData({
        customer_name: rescheduleData.customer_name,
        customer_phone: rescheduleData.customer_phone,
        professional_id: '', // Will be set when professionals load
        appointment_date: formatDateForDisplay(appointmentDate.toISOString().split('T')[0]),
        appointment_time: appointmentDate.toTimeString().slice(0, 5),
        notes: rescheduleData.notes
      });

      // Load customer packages if customer exists
      loadCustomerPackages(rescheduleData.customer_phone);
    } else if (prefillData) {
      // Pre-fill form with data from URL parameters
      setFormData(prev => ({
        ...prev,
        customer_name: prefillData.customer_name || '',
        customer_phone: prefillData.customer_phone || '',
        professional_id: prefillData.professional_id || ''
      }));

      // Load customer packages if customer phone is provided
      if (prefillData.customer_phone) {
        loadCustomerPackages(prefillData.customer_phone);
      }
    }
  }, [user, rescheduleData, prefillData]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [professionalsRes, servicesRes, customersRes] = await Promise.all([
        supabase
          .from('professionals')
          .select('id, name, specialty')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('name'),
        supabase
          .from('services')
          .select('id, name, price, duration_minutes')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('name'),
        supabase
          .from('customers')
          .select('id, name, phone, professional_id, professional:professionals(id, name, specialty)')
          .eq('user_id', user.id)
          .order('name')
      ]);

      setProfessionals(professionalsRes.data || []);
      setServices(servicesRes.data || []);
      setCustomers((customersRes.data || []).map(customer => ({
        ...customer,
        professional: customer.professional ? customer.professional[0] : undefined
      })));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadCustomerPackages = async (phone: string) => {
    try {
      // Find customer by phone
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user?.id)
        .eq('phone', phone)
        .single();

      if (customerData) {
        await handleCustomerChange(customerData.id);
      }
    } catch (error) {
      console.error('Error loading customer packages:', error);
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);

    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_name: customer.name,
        customer_phone: customer.phone,
        professional_id: customer.professional_id || ''
      }));

      // Load customer packages and update services list
      try {
        // Get customer packages with full details
        const { data: customerPackagesData } = await supabase
          .from('customer_packages')
          .select(`
            id,
            package_id,
            expiration_date,
            paid,
            created_at,
            package:packages!inner(
              name,
              price,
              services:package_services(
                service_id,
                quantity,
                service:services!inner(name)
              )
            )
          `)
          .eq('user_id', user?.id)
          .eq('customer_id', customerId)
          .eq('paid', true);

        // Get sessions remaining for each service
        const packagesWithSessions = [];
        if (customerPackagesData) {
          for (const cp of customerPackagesData) {
            const servicesWithSessions = [];
            for (const service of (cp.package as any).services || []) {
              const { data: sessionData } = await supabase
                .from('customer_package_services')
                .select('sessions_remaining')
                .eq('customer_package_id', cp.id)
                .eq('service_id', service.service_id)
                .single();

              servicesWithSessions.push({
                service_id: service.service_id,
                quantity: service.quantity,
                service: {
                  name: service.service.name
                },
                customer_sessions: sessionData ? [{ sessions_remaining: sessionData.sessions_remaining }] : [{ sessions_remaining: 0 }]
              });
            }

            packagesWithSessions.push({
              id: cp.id,
              package_id: cp.package_id,
              expiration_date: cp.expiration_date,
              paid: cp.paid,
              created_at: cp.created_at,
              package: {
                name: (cp.package as any).name,
                services: servicesWithSessions
              }
            });
          }
        }

        // Filter valid packages (not expired and have sessions)
        const validPackages = packagesWithSessions.filter((cp: any) => {
          const isExpired = cp.expiration_date && new Date(cp.expiration_date) < new Date();
          const hasSessions = cp.package.services.some((service: any) =>
            (service.customer_sessions[0]?.sessions_remaining || 0) > 0
          );
          return !isExpired && hasSessions;
        });

        setCustomerPackages(validPackages as any);

        // Update services list with package information
        const servicesWithPackages = new Map();
        services.forEach(service => {
          servicesWithPackages.set(service.id, {
            ...service,
            has_package: false,
            package_sessions: 0
          });
        });

        // Mark services that have available package sessions
        validPackages.forEach((pkg: any) => {
          pkg.package.services.forEach((service: any) => {
            if (servicesWithPackages.has(service.service_id)) {
              const serviceData = servicesWithPackages.get(service.service_id);
              serviceData.has_package = true;
              serviceData.package_sessions = service.customer_sessions[0]?.sessions_remaining || 0;
            }
          });
        });

        setServices(Array.from(servicesWithPackages.values()));
      } catch (error) {
        console.error('Error loading customer packages:', error);
        setCustomerPackages([]);
        // Reset services to original state
        setServices(services.map(s => ({ ...s, has_package: false, package_sessions: 0 })));
      }
    } else {
      setCustomerPackages([]);
      // Reset services to original state
      setServices(services.map(s => ({ ...s, has_package: false, package_sessions: 0 })));
    }
  };

  const addService = () => {
    setSelectedServices(prev => [...prev, { service_id: '', use_package: false }]);
  };

  const removeService = (index: number) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  const updateService = (index: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    const usePackage = service?.has_package || false;
    setSelectedServices(prev => prev.map((service, i) =>
      i === index ? { ...service, service_id: serviceId, use_package: usePackage } : service
    ));
  };


  const checkTimeConflict = async (appointmentDateTime: Date, professionalId: string, excludeAppointmentId?: string) => {
    if (!user) return { hasConflict: false, conflictingAppointments: [] };

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

    // Check for conflicting appointments
    const { data: conflictingAppointments, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, status, customer_name')
      .eq('user_id', user.id)
      .eq('professional_id', professionalId)
      .gte('appointment_date', appointmentDateTime.toISOString())
      .lt('appointment_date', appointmentEndTime.toISOString())
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error checking time conflicts:', error);
      return { hasConflict: false, conflictingAppointments: [] };
    }

    // Exclude current appointment if rescheduling
    const filteredConflicts = conflictingAppointments?.filter(apt =>
      excludeAppointmentId ? apt.id !== excludeAppointmentId : true
    ) || [];

    if (filteredConflicts.length > 0) {
      return { hasConflict: true, conflictingAppointments: filteredConflicts };
    }

    // Also check if any existing appointment overlaps with our time slot
    const { data: overlappingAppointments, error: overlapError } = await supabase
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
      .eq('user_id', user.id)
      .eq('professional_id', professionalId)
      .neq('status', 'cancelled')
      .neq('status', 'completed');

    if (overlapError) {
      console.error('Error checking overlapping appointments:', overlapError);
      return { hasConflict: false, conflictingAppointments: [] };
    }

    // Check if any existing appointment's time slot overlaps with our new appointment
    const overlappingConflicts = [];
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
      if ((appointmentDateTime < aptEndTime && appointmentEndTime > aptStartTime) &&
          (excludeAppointmentId ? apt.id !== excludeAppointmentId : true)) {
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
    if (!user || selectedServices.length === 0) return;

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
      const conflictResult = await checkTimeConflict(appointmentDateTime, formData.professional_id, rescheduleData?.id);
      if (conflictResult.hasConflict) {
        // Calculate total duration for overlap details
        let totalDuration = 0;
        for (const selectedService of selectedServices) {
          const service = services.find(s => s.id === selectedService.service_id);
          if (service) {
            totalDuration += service.duration_minutes;
          }
        }
        const appointmentEndTime = new Date(appointmentDateTime);
        appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + totalDuration);

        setOverlapDetails({
          conflictingAppointments: conflictResult.conflictingAppointments,
          proposedStart: appointmentDateTime,
          proposedEnd: appointmentEndTime
        });
        setShowOverlapConfirmation(true);
        setLoading(false);
        return;
      }

      // Calculate total price and prepare services
      let totalPrice = 0;
      const appointmentServices = [];

      for (const selectedService of selectedServices) {
        const service = services.find(s => s.id === selectedService.service_id);
        if (!service) throw new Error('Serviço não encontrado');

        let price = service.price;
        let usedPackageSession = false;

        if (service.has_package) {
          // Service has package available, use it automatically
          price = 0;
          usedPackageSession = true;
          // Find which package to use for this service
          const availablePackage = customerPackages.find(cp =>
            cp.package.services.some(ps => ps.service_id === selectedService.service_id && (ps.customer_sessions as any)?.sessions_remaining > 0)
          );
          if (availablePackage) {
            selectedService.package_id = availablePackage.id;
          }
        }

        totalPrice += price;
        appointmentServices.push({
          service_id: selectedService.service_id,
          price,
          used_package_session: usedPackageSession
        });
      }

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          professional_id: formData.professional_id,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          appointment_date: appointmentDateTime.toISOString(),
          total_price: totalPrice,
          notes: formData.notes,
          status: 'pending'
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

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

      // Update package sessions if used
      for (let i = 0; i < selectedServices.length; i++) {
        const selectedService = selectedServices[i];
        if (appointmentServices[i].used_package_session && selectedService.package_id) {
          // First get current sessions_remaining
          const { data: currentData } = await supabase
            .from('customer_package_services')
            .select('sessions_remaining')
            .eq('customer_package_id', selectedService.package_id)
            .eq('service_id', selectedService.service_id)
            .single();

          if (currentData && currentData.sessions_remaining > 0) {
            const { error: updateError } = await supabase
              .from('customer_package_services')
              .update({
                sessions_remaining: currentData.sessions_remaining - 1,
                updated_at: new Date().toISOString()
              })
              .eq('customer_package_id', selectedService.package_id)
              .eq('service_id', selectedService.service_id);

            if (updateError) throw updateError;
          }
        }
      }

      // Create or update customer record
      if (selectedCustomer) {
        // Update existing customer
        await supabase
          .from('customers')
          .update({
            name: formData.customer_name,
            professional_id: formData.professional_id, // Update professional assignment
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedCustomer.id);
      } else {
        // Create new customer with professional assignment
        await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            name: formData.customer_name,
            phone: formData.customer_phone,
            professional_id: formData.professional_id // Assign to selected professional
          });
      }

      // Reset form
      setFormData({
        customer_name: '',
        customer_phone: '',
        professional_id: '',
        appointment_date: '',
        appointment_time: '',
        notes: ''
      });
      setSelectedCustomer(null);
      setSelectedServices([]);
      setCustomerPackages([]);

      onSuccess();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };


  const handleConfirmOverlap = async () => {
    if (!overlapDetails) return;

    setLoading(true);
    setShowOverlapConfirmation(false);

    try {
      // Combine date and time
      const appointmentDateTime = overlapDetails.proposedStart;

      // Calculate total price and prepare services
      let totalPrice = 0;
      const appointmentServices = [];

      for (const selectedService of selectedServices) {
        const service = services.find(s => s.id === selectedService.service_id);
        if (!service) throw new Error('Serviço não encontrado');

        let price = service.price;
        let usedPackageSession = false;

        if (service.has_package) {
          // Service has package available, use it automatically
          price = 0;
          usedPackageSession = true;
          // Find which package to use for this service
          const availablePackage = customerPackages.find(cp =>
            cp.package.services.some(ps => ps.service_id === selectedService.service_id && (ps.customer_sessions as any)?.sessions_remaining > 0)
          );
          if (availablePackage) {
            selectedService.package_id = availablePackage.id;
          }
        }

        totalPrice += price;
        appointmentServices.push({
          service_id: selectedService.service_id,
          price,
          used_package_session: usedPackageSession
        });
      }

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: user?.id,
          professional_id: formData.professional_id,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          appointment_date: appointmentDateTime.toISOString(),
          total_price: totalPrice,
          notes: formData.notes,
          status: 'pending'
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

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

      // Update package sessions if used
      for (let i = 0; i < selectedServices.length; i++) {
        const selectedService = selectedServices[i];
        if (appointmentServices[i].used_package_session && selectedService.package_id) {
          // First get current sessions_remaining
          const { data: currentData } = await supabase
            .from('customer_package_services')
            .select('sessions_remaining')
            .eq('customer_package_id', selectedService.package_id)
            .eq('service_id', selectedService.service_id)
            .single();

          if (currentData && currentData.sessions_remaining > 0) {
            const { error: updateError } = await supabase
              .from('customer_package_services')
              .update({
                sessions_remaining: currentData.sessions_remaining - 1,
                updated_at: new Date().toISOString()
              })
              .eq('customer_package_id', selectedService.package_id)
              .eq('service_id', selectedService.service_id);

            if (updateError) throw updateError;
          }
        }
      }

      // Create or update customer record
      if (selectedCustomer) {
        // Update existing customer
        await supabase
          .from('customers')
          .update({
            name: formData.customer_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedCustomer.id);
      } else {
        // Create new customer
        await supabase
          .from('customers')
          .insert({
            user_id: user?.id,
            name: formData.customer_name,
            phone: formData.customer_phone
          });
      }

      // Reset form
      setFormData({
        customer_name: '',
        customer_phone: '',
        professional_id: '',
        appointment_date: '',
        appointment_time: '',
        notes: ''
      });
      setSelectedCustomer(null);
      setSelectedServices([]);
      setCustomerPackages([]);
      setOverlapDetails(null);

      onSuccess();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOverlap = () => {
    setShowOverlapConfirmation(false);
    setOverlapDetails(null);
  };

  const calculateTotalPrice = () => {
    let total = 0;
    selectedServices.forEach(selectedService => {
      const service = services.find(s => s.id === selectedService.service_id);
      if (service) {
        if (selectedService.use_package && selectedService.package_id) {
          // Package service is free
          total += 0;
        } else {
          total += service.price;
        }
      }
    });
    return total;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Overlap Confirmation Modal */}
      {showOverlapConfirmation && overlapDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmação de Sobreposição de Horário
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                O horário selecionado ({overlapDetails.proposedStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {overlapDetails.proposedEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                conflita com os seguintes agendamentos:
              </p>
              <div className="space-y-2">
                {overlapDetails.conflictingAppointments.map((apt) => (
                  <div key={apt.id} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-yellow-800">{apt.customer_name}</span>
                      <span className="text-sm text-yellow-600">
                        {new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Ao concluir o agendamento, você confirma que consegue concluir dentro do prazo?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelOverlap}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmOverlap}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Criando...' : 'Confirmar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
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


        {/* Pacotes do Cliente */}
        {customerPackages.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pacotes Disponíveis</h3>
            <div className="space-y-4">
              {customerPackages.map(pkg => (
                <div key={pkg.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-green-800">{pkg.package.name}</span>
                    {pkg.expiration_date && (
                      <span className="text-green-600 text-sm">
                        válido até {new Date(pkg.expiration_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {pkg.package.services.map(service => (
                      <div key={service.service_id} className="flex items-center justify-between bg-white rounded p-3">
                        <div>
                          <span className="font-medium text-gray-900">{service.service.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({(service.customer_sessions as any)?.[0]?.sessions_remaining || 0} de {service.quantity} sessões restantes)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const serviceData = services.find(s => s.id === service.service_id);
                            if (serviceData && ((service.customer_sessions as any)?.[0]?.sessions_remaining || 0) > 0) {
                              setSelectedServices(prev => [...prev, {
                                service_id: service.service_id,
                                use_package: true,
                                package_id: pkg.id
                              }]);
                            }
                          }}
                          disabled={((service.customer_sessions as any)?.[0]?.sessions_remaining || 0) === 0}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm rounded transition"
                        >
                          Usar Pacote
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Serviços Avulsos
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
                    {selectedService.use_package ? 'Serviço do Pacote' : 'Serviço Avulso'} {index + 1}
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

                  {service && (
                    <div className="text-sm text-blue-600 font-medium">
                      {selectedService.use_package ? '✓ Usando pacote (GRÁTIS)' : 'Serviço avulso'}
                    </div>
                  )}
                </div>

                {service && (
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-600" />
                        <span className={`font-semibold ${selectedService.use_package ? 'text-green-600' : 'text-gray-900'}`}>
                          {selectedService.use_package ? 'GRÁTIS (Pacote)' : `R$ ${service.price.toFixed(2)}`}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profissional
            </label>
            <select
              value={formData.professional_id}
              onChange={(e) => setFormData({ ...formData, professional_id: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${selectedCustomer?.professional_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
              disabled={!!selectedCustomer?.professional_id}
            >
              <option value="">Selecione um profissional</option>
              {professionals.map(prof => (
                <option key={prof.id} value={prof.id}>
                  {prof.name} - {prof.specialty}
                </option>
              ))}
            </select>
            {selectedCustomer?.professional_id && (
              <p className="text-sm text-blue-600 mt-1">
                Profissional atribuído ao cliente: {selectedCustomer.professional?.name} - {selectedCustomer.professional?.specialty}
              </p>
            )}
          </div>
        </div>

        {/* Time Slot Picker */}
        {formData.appointment_date && isValidDate(formData.appointment_date) && formData.professional_id && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <TimeSlotPicker
              selectedDate={parseDateFromDisplay(formData.appointment_date)}
              selectedProfessional={formData.professional_id}
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
            {loading ? 'Criando Agendamento...' : 'Criar Agendamento'}
          </button>
        </div>
      </form>
    </div>
  );
}