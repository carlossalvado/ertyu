import { useState, useEffect } from 'react';
import Stats from '../components/Dashboard/Stats';
import Calendar from '../components/Dashboard/Calendar';
import Charts from '../components/Dashboard/Charts';
import DayAppointments from '../components/Dashboard/DayAppointments';
import AppointmentSearch from '../components/Dashboard/AppointmentSearch';
import ReportsPage from './ReportsPage';
import ProfessionalsPage from './ProfessionalsPage';
import { supabase } from '../lib/supabase';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [showDayView, setShowDayView] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showProfessionals, setShowProfessionals] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [refreshCalendar, setRefreshCalendar] = useState(0);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowDayView(true);
  };

  const handleProfessionalFilter = (professionalId: string | null) => {
    setSelectedProfessional(professionalId);
    setShowDayView(true);
  };

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  // Listen for appointment modal events from DayAppointments
  useEffect(() => {
    const handleOpenAppointmentModal = (event: any) => {
      setSelectedAppointment(event.detail);
      setShowAppointmentModal(true);
    };

    window.addEventListener('openAppointmentModal', handleOpenAppointmentModal);

    return () => {
      window.removeEventListener('openAppointmentModal', handleOpenAppointmentModal);
    };
  }, []);

  const handleCloseDayView = () => {
    setShowDayView(false);
    setSelectedDate(null);
    setSelectedProfessional(null);
  };

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSelectedAppointment(null);
  };


  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      // Update the selected appointment status
      setSelectedAppointment((prev: any) => prev ? { ...prev, status: newStatus } : null);

      // Refresh calendar to show updated status immediately
      setRefreshCalendar(prev => prev + 1);

      alert('Status atualizado com sucesso!');
      handleCloseAppointmentModal();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Erro ao atualizar status do agendamento');
    }
  };


  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      // Refresh calendar to remove deleted appointment immediately
      setRefreshCalendar(prev => prev + 1);

      alert('Agendamento excluído com sucesso!');
      handleCloseAppointmentModal();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Erro ao excluir agendamento');
    }
  };

  const handleReportsClick = () => {
    setShowReports(true);
  };

  const handleBackToDashboard = () => {
    setShowReports(false);
    setShowProfessionals(false);
  };

  const handleProfessionalsClick = () => {
    setShowProfessionals(true);
  };

  if (showReports) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mb-4 p-4 bg-white border-b border-gray-200">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            ← Voltar ao Dashboard
          </button>
        </div>
        <ReportsPage />
      </div>
    );
  }

  if (showProfessionals) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mb-4 p-4 bg-white border-b border-gray-200">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            ← Voltar ao Dashboard
          </button>
        </div>
        <ProfessionalsPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Kito Dev - Sistema de Agendamentos</h1>
              <p className="text-gray-600">Análise completa dos seus agendamentos</p>
            </div>
          </div>
        </div>

        {!showDayView ? (
          <>
            <div className="mb-6">
              <AppointmentSearch onAppointmentFound={handleAppointmentClick} />
            </div>

            <Stats onReportsClick={handleReportsClick} onProfessionalsClick={handleProfessionalsClick} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Calendar
                onDateClick={handleDateClick}
                onProfessionalFilter={handleProfessionalFilter}
                onAppointmentClick={handleAppointmentClick}
                refreshTrigger={refreshCalendar}
              />
              <Charts />
            </div>
          </>
        ) : (
          <DayAppointments
            selectedDate={selectedDate}
            selectedProfessional={selectedProfessional}
            onClose={handleCloseDayView}
            onAppointmentUpdate={() => {
              // Refresh data when appointments are updated
              setSelectedDate(null);
              setSelectedProfessional(null);
              setShowDayView(false);
            }}
          />
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
                        <label className="block text-sm font-medium text-gray-700">Profissional</label>
                        <p className="text-lg font-semibold text-gray-900">{selectedAppointment.professional_name}</p>
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
                    </div>

                    {selectedAppointment.notes && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                        <p className="text-sm text-gray-600 bg-white p-3 rounded border">{selectedAppointment.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
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

                  {/* Action Buttons */}
                  <div className="space-y-4 pt-4 border-t">
                    {/* Status Actions */}
                    {selectedAppointment.status !== 'completed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alterar Status</label>
                        <div className="flex gap-2">
                          {selectedAppointment.status === 'pending' && (
                            <button
                              onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition"
                            >
                              Confirmar
                            </button>
                          )}
                          {selectedAppointment.status === 'confirmed' && (
                            <button
                              onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                            >
                              Concluir
                            </button>
                          )}
                          <button
                            onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}


                    {/* Main Actions */}
                    {selectedAppointment.status !== 'completed' && (
                      <div className="flex gap-3">
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
                          onClick={() => deleteAppointment(selectedAppointment.id)}
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

                    {selectedAppointment.status === 'completed' && (
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
      </div>
    </div>
  );
}
