import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Appointment, ApiService } from '../lib/api'

interface EditAppointmentModalProps {
  appointment: Appointment | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    appointment_date: '',
    status: 'pending',
    notes: '',
    total_price: 0
  })
  const [isLoading, setIsLoading] = useState(false)

  const apiService = ApiService.getInstance()

  useEffect(() => {
    if (appointment) {
      setFormData({
        customer_name: appointment.customer_name,
        customer_phone: appointment.customer_phone,
        appointment_date: appointment.appointment_date.slice(0, 16), // Remove seconds for datetime-local input
        status: appointment.status,
        notes: appointment.notes || '',
        total_price: appointment.total_price || 0
      })
    }
  }, [appointment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appointment) return

    setIsLoading(true)
    try {
      // Update the appointment in the database
      const { error } = await supabase
        .from('appointments')
        .update({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          appointment_date: new Date(formData.appointment_date).toISOString(),
          status: formData.status,
          notes: formData.notes,
          total_price: formData.total_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id)

      if (error) throw error

      onSave()
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
      alert('Erro ao atualizar agendamento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'total_price' ? parseFloat(value) || 0 : value
    }))
  }

  if (!isOpen || !appointment) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Editar Agendamento
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                  className="input-field w-full"
                  placeholder="Nome completo do cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  required
                  className="input-field w-full"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Data e Hora
                </label>
                <input
                  type="datetime-local"
                  name="appointment_date"
                  value={formData.appointment_date}
                  onChange={handleChange}
                  required
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-field w-full"
                >
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Valor Total (R$)
              </label>
              <input
                type="number"
                name="total_price"
                value={formData.total_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="input-field w-full"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Observações
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="input-field w-full resize-none"
                placeholder="Observações sobre o agendamento..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Salvando...</span>
                  </div>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditAppointmentModal