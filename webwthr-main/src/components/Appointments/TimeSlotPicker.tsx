import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useProfessionalAuth } from '../../contexts/ProfessionalAuthContext';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface TimeSlotPickerProps {
  selectedDate: string;
  selectedProfessional: string;
  selectedServices: Array<{ service_id: string }>;
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
  services?: Array<{ id: string; duration_minutes: number }>;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  services: Array<{
    service: {
      duration_minutes: number;
    };
  }>;
}

export default function TimeSlotPicker({
  selectedDate,
  selectedProfessional,
  selectedServices,
  onTimeSelect,
  selectedTime,
  services = []
}: TimeSlotPickerProps) {
  const { user } = useAuth();
  const { professional } = useProfessionalAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate && selectedProfessional) {
      loadAppointments();
    }
  }, [selectedDate, selectedProfessional, user, professional]);

  const loadAppointments = async () => {
    if ((!user && !professional) || !selectedDate || !selectedProfessional) return;

    setLoading(true);
    try {
      // Create dates in UTC to avoid timezone issues
      const startOfDay = new Date(selectedDate + 'T00:00:00.000Z');
      const endOfDay = new Date(selectedDate + 'T23:59:59.999Z');

      console.log('Loading appointments for:', {
        selectedDate,
        selectedProfessional,
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        userId: user?.id,
        professionalId: professional?.id
      });

      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          services:appointment_services(
            service:services(duration_minutes)
          )
        `)
        .eq('professional_id', selectedProfessional)
        .neq('status', 'cancelled')
        .neq('status', 'completed')
        .gte('appointment_date', startOfDay.toISOString())
        .lte('appointment_date', endOfDay.toISOString());

      // For admin users, also filter by user_id to ensure they only see their own appointments
      if (user && !professional) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
      }

      console.log('Raw appointments data:', data);

      setAppointments((data || []).map(apt => ({
        ...apt,
        services: (apt.services as any)?.map((s: any) => ({
          service: {
            duration_minutes: s.service?.duration_minutes || 30
          }
        })) || []
      })));
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 8; // 8:00
    const endHour = 18; // 18:00

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }

    return slots;
  };

  const calculateTotalDuration = () => {
    // Calculate total duration based on selected services
    let totalDuration = 0;
    for (const selectedService of selectedServices) {
      const service = services.find(s => s.id === selectedService.service_id);
      if (service) {
        totalDuration += service.duration_minutes;
      } else {
        totalDuration += 30; // Default duration if service not found
      }
    }
    return Math.max(totalDuration, 30); // At least 30 minutes
  };

  const isTimeSlotAvailable = (timeSlot: string) => {
    if (!selectedDate) return true;

    const slotDateTime = new Date(`${selectedDate}T${timeSlot}`);
    const totalDuration = calculateTotalDuration();
    const slotEndTime = new Date(slotDateTime);
    slotEndTime.setMinutes(slotEndTime.getMinutes() + totalDuration);

    // Check if this time slot conflicts with any existing appointment
    for (const appointment of appointments) {
      const aptStartTime = new Date(appointment.appointment_date);

      // Calculate appointment duration
      let aptDuration = 0;
      for (const service of appointment.services || []) {
        if (service.service?.duration_minutes) {
          aptDuration += service.service.duration_minutes;
        }
      }

      const aptEndTime = new Date(aptStartTime);
      aptEndTime.setMinutes(aptEndTime.getMinutes() + aptDuration);

      // Check for overlap
      if ((slotDateTime < aptEndTime && slotEndTime > aptStartTime)) {
        return false; // Conflict found
      }
    }

    // If there's a selected time, block slots that would be occupied by the selected appointment
    if (selectedTime && selectedTime !== timeSlot) {
      const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const selectedEndTime = new Date(selectedDateTime);
      selectedEndTime.setMinutes(selectedEndTime.getMinutes() + totalDuration);

      if (slotDateTime >= selectedDateTime && slotDateTime < selectedEndTime) {
        return false; // Slot is occupied by the selected appointment
      }
    }

    return true; // No conflicts
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Horários Disponíveis</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto">
        {timeSlots.map(timeSlot => {
          const isAvailable = isTimeSlotAvailable(timeSlot);
          const isSelected = selectedTime === timeSlot;

          return (
            <button
              key={timeSlot}
              type="button"
              onClick={() => isAvailable && onTimeSelect(timeSlot)}
              disabled={!isAvailable}
              className={`
                relative p-2 text-xs font-medium rounded-lg border transition-all
                ${isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : isAvailable
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
                    : 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-center justify-center gap-1">
                <span>{formatTime(timeSlot)}</span>
                {isSelected ? (
                  <CheckCircle className="w-3 h-3" />
                ) : !isAvailable ? (
                  <XCircle className="w-3 h-3" />
                ) : null}
              </div>
              {!isAvailable && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
          <span>Ocupado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 border border-blue-600 rounded"></div>
          <span>Selecionado</span>
        </div>
      </div>
    </div>
  );
}