import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProfessionalAuth } from '../contexts/ProfessionalAuthContext'

const ProfessionalCommissions: React.FC = () => {
  const { professional } = useProfessionalAuth()
  const [dailyData, setDailyData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Generate year options (current year + last 5 years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  useEffect(() => {
    if (professional) {
      loadCommissionData()
    }
  }, [professional, selectedYear])

  const loadCommissionData = async () => {
    try {
      setLoading(true)

      // Get date range for the selected year
      const startDate = new Date(selectedYear, 0, 1)
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59)

      // Get commission data for this professional from professional_commissions table
      const { data: commissionData, error } = await supabase
        .from('professional_commissions')
        .select(`
          commission_amount,
          paid_at,
          appointments(appointment_date, customer_name),
          appointment_services(
            services(name, price)
          )
        `)
        .eq('professional_id', professional!.id)
        .gte('paid_at', startDate.toISOString())
        .lte('paid_at', endDate.toISOString())
        .order('paid_at', { ascending: false })

      if (error) throw error

      console.log('Commission data for professional:', commissionData)

      // Process commission data with service details
      const dailyCommissions: { [date: string]: { services: any[], total: number } } = {}
      const monthlyCommissions: { [month: string]: { services: any[], total: number } } = {}

      commissionData?.forEach(row => {
        const paidAt = (row as any).paid_at || (row as any).appointments?.appointment_date
        if (!paidAt) return

        const date = new Date(paidAt).toISOString().split('T')[0]
        const month = date.substring(0, 7) // YYYY-MM format

        const commissionAmount = Number((row as any).commission_amount || 0)
        const service = (row as any).appointment_services?.services
        const appointment = (row as any).appointments

        const serviceData = {
          name: service?.name || 'Serviço não encontrado',
          price: service?.price || 0,
          commission: commissionAmount,
          date: date,
          customer: appointment?.customer_name || 'Cliente não informado'
        }

        // Daily totals
        if (!dailyCommissions[date]) {
          dailyCommissions[date] = { services: [], total: 0 }
        }
        dailyCommissions[date].services.push(serviceData)
        dailyCommissions[date].total += commissionAmount

        // Monthly totals
        if (!monthlyCommissions[month]) {
          monthlyCommissions[month] = { services: [], total: 0 }
        }
        monthlyCommissions[month].services.push(serviceData)
        monthlyCommissions[month].total += commissionAmount
      })

      // Convert to arrays for display
      setDailyData(Object.entries(dailyCommissions)
        .map(([date, data]) => ({
          date,
          services: data.services,
          totalCommissions: data.total
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      )

      setMonthlyData(Object.entries(monthlyCommissions)
        .map(([month, data]) => ({
          month: parseInt(month.split('-')[1]) - 1, // Convert to month index
          year: parseInt(month.split('-')[0]),
          services: data.services,
          totalCommissions: data.total
        }))
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year
          return b.month - a.month
        })
      )

    } catch (err) {
      setError('Erro ao carregar dados de comissão')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadCommissionData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Comissões por Ano</h3>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Commission Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Resumo de Comissões - {selectedYear}</h2>

        {/* Daily Commissions Table */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Comissões por Dia</h3>
          <div className="space-y-4">
            {dailyData.length > 0 ? dailyData.map((day: any) => (
              <div key={day.date} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900">
                    {new Date(day.date).toLocaleDateString('pt-BR')}
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Serviço
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor da Comissão
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {day.services?.map((service: any, index: number) => (
                        <tr key={`${day.date}-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {service.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {service.customer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {Number(service.commission).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="bg-gray-50">
                        <td colSpan={2} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Total do dia:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          R$ {day.totalCommissions.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500">Nenhuma comissão encontrada para o período</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Commissions Table */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Comissões por Mês</h3>
          <div className="space-y-4">
            {monthlyData.length > 0 ? monthlyData.map((month: any) => (
              <div key={`${month.month}-${month.year}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900">
                    {[
                      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                    ][month.month]} {month.year}
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor da Comissão
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Group services by date for this month
                        const dailyTotals: { [date: string]: number } = {};
                        month.services?.forEach((service: any) => {
                          const date = service.date;
                          dailyTotals[date] = (dailyTotals[date] || 0) + service.commission;
                        });

                        return Object.entries(dailyTotals)
                          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                          .map(([date, total]) => (
                            <tr key={`${month.month}-${month.year}-${date}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(date).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                R$ {Number(total).toFixed(2)}
                              </td>
                            </tr>
                          ));
                      })()}
                      {/* Total row */}
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Total do mês:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          R$ {month.totalCommissions.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500">Nenhuma comissão encontrada para o período</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfessionalCommissions