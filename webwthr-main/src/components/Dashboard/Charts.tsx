import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ChartData {
  byProfessional: Array<{ name: string; count: number; revenue: number }>;
  byDay: Array<{ date: string; count: number; revenue: number }>;
  byMonth: Array<{ month: string; count: number; revenue: number }>;
}

type ChartView = 'professional' | 'day' | 'month';
type FilterPeriod = 'day' | 'week' | 'month';

export default function Charts() {
  const { user } = useAuth();
  const [chartView, setChartView] = useState<ChartView>('professional');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [chartData, setChartData] = useState<ChartData>({
    byProfessional: [],
    byDay: [],
    byMonth: []
  });

  useEffect(() => {
    loadChartData();
  }, [user, chartView, filterPeriod]);


  const handleFilterChange = (newFilter: FilterPeriod) => {
    setFilterPeriod(newFilter);
  };

  const getStartDate = () => {
    const now = new Date();
    switch (filterPeriod) {
      case 'day':
        // For "Hoje", show only today's appointments
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6); // Include today + 6 days back
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      case 'month':
        // For "Último Mês", show previous month
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevMonthStart.setHours(0, 0, 0, 0);
        return prevMonthStart;
    }
  };

  const getEndDate = () => {
    const now = new Date();
    switch (filterPeriod) {
      case 'day':
        // For "Hoje", show only today's appointments
        const today = new Date(now);
        today.setHours(23, 59, 59, 999);
        return today;
      case 'week':
        const weekEnd = new Date(now);
        weekEnd.setHours(23, 59, 59, 999);
        return weekEnd;
      case 'month':
        // For "Último Mês", show previous month
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        prevMonthEnd.setHours(23, 59, 59, 999);
        return prevMonthEnd;
    }
  };

  const loadChartData = async () => {
    if (!user) return;

    // Always load all data - no date filtering for charts
    const [appointmentsRes, packagesRes] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          *,
          professionals(name),
          services:appointment_services(
            service:services(name)
          )
        `)
        .eq('user_id', user.id),
      supabase
        .from('customer_packages')
        .select('package:packages(price), created_at')
        .eq('user_id', user.id)
        .eq('paid', true)
    ]);

    const appointments = appointmentsRes.data || [];
    const packages = packagesRes.data || [];

    if (!appointments && !packages) return;

    // Apply date filtering only for professional view
    const filteredAppointments = chartView === 'professional' ?
      appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        const startDate = getStartDate();
        const endDate = getEndDate();
        return aptDate >= startDate && aptDate <= endDate;
      }) : appointments;

    // Apply date filtering for packages only when professional view is selected
    const filteredPackages = chartView === 'professional' ?
      packages.filter(pkg => {
        const pkgDate = new Date(pkg.created_at);
        const startDate = getStartDate();
        const endDate = getEndDate();
        return pkgDate >= startDate && pkgDate <= endDate;
      }) : packages;

    // Store appointments globally for the detailed month view
    (window as any).allAppointments = appointments;

    const byProfessional = filteredAppointments.reduce((acc: any, apt) => {
      const name = (apt.professionals as any)?.name || 'Sem Profissional';
      if (!acc[name]) {
        acc[name] = { name, count: 0, revenue: 0 };
      }
      acc[name].count++;
      acc[name].revenue += Number(apt.total_price);
      return acc;
    }, {});

    const byDay = filteredAppointments.reduce((acc: any, apt) => {
      const date = new Date(apt.appointment_date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      });
      if (!acc[date]) {
        acc[date] = { date, count: 0, revenue: 0 };
      }
      acc[date].count++;
      acc[date].revenue += Number(apt.total_price);
      return acc;
    }, {});

    // Package filtering is done above based on chartView

    filteredPackages.forEach(pkg => {
      const date = new Date(pkg.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      });
      if (!byDay[date]) {
        byDay[date] = { date, count: 0, revenue: 0 };
      }
      byDay[date].revenue += Number((pkg.package as any)?.price || 0);
    });

    const byMonth = filteredAppointments.reduce((acc: any, apt) => {
      const month = new Date(apt.appointment_date).toLocaleDateString('pt-BR', {
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      });
      if (!acc[month]) {
        acc[month] = { month, count: 0, revenue: 0 };
      }
      acc[month].count++;
      acc[month].revenue += Number(apt.total_price);
      return acc;
    }, {});

    // Add package sales to monthly revenue (filtered)
    filteredPackages.forEach(pkg => {
      const month = new Date(pkg.created_at).toLocaleDateString('pt-BR', {
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      });
      if (!byMonth[month]) {
        byMonth[month] = { month, count: 0, revenue: 0 };
      }
      byMonth[month].revenue += Number((pkg.package as any)?.price || 0);
    });

    setChartData({
      byProfessional: Object.values(byProfessional),
      byDay: Object.values(byDay).slice(-7) as Array<{ date: string; count: number; revenue: number }>,
      byMonth: Object.values(byMonth)
    });
  };

  const getCurrentData = () => {
    switch (chartView) {
      case 'professional':
        return chartData.byProfessional;
      case 'day':
        return chartData.byDay;
      case 'month':
        return chartData.byMonth;
      default:
        return [];
    }
  };

  const getMaxValue = () => {
    const data = getCurrentData();
    return Math.max(...data.map(d => d.count), 1);
  };

  const getLabel = (item: any) => {
    if (chartView === 'day') return item.date;
    if (chartView === 'month') return item.month;
    return item.name;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Análise de Agendamentos</h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setChartView('professional')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            chartView === 'professional'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Profissional
        </button>
        <button
          onClick={() => setChartView('day')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            chartView === 'day'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Dia
        </button>
        <button
          onClick={() => setChartView('month')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            chartView === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Mês
        </button>
      </div>

      {chartView === 'professional' && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterChange('day')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  filterPeriod === 'day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => handleFilterChange('week')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  filterPeriod === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Última Semana
              </button>
              <button
                onClick={() => handleFilterChange('month')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  filterPeriod === 'month'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-orange-700 border-orange-500 hover:bg-orange-50'
                }`}
              >
                Mês Atual Detalhado
              </button>
            </div>
          </div>

          {filterPeriod === 'month' && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-800 mb-4">Agendamentos do Mês Atual por Dia</h3>
              <div className="space-y-3">
                {(() => {
                  // Get current month appointments from global variable
                  const allAppointments = (window as any).allAppointments || [];
                  const currentMonthAppointments = allAppointments.filter((apt: any) => {
                    const aptDate = new Date(apt.appointment_date);
                    const now = new Date();
                    return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
                  });

                  // Group by date
                  const groupedByDate = currentMonthAppointments.reduce((acc: any, apt: any) => {
                    const dateKey = new Date(apt.appointment_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      timeZone: 'America/Sao_Paulo'
                    });
                    if (!acc[dateKey]) {
                      acc[dateKey] = [];
                    }
                    acc[dateKey].push(apt);
                    return acc;
                  }, {} as Record<string, any[]>);

                  return Object.entries(groupedByDate)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, dayAppointments]) => {
                      const professionalStats = dayAppointments.reduce((acc: any, apt: any) => {
                        const prof = (apt.professionals as any)?.name || 'Sem Profissional';
                        if (!acc[prof]) {
                          acc[prof] = { count: 0, revenue: 0 };
                        }
                        acc[prof].count++;
                        acc[prof].revenue += Number(apt.total_price);
                        return acc;
                      }, {} as Record<string, { count: number; revenue: number }>);

                      return (
                        <div key={date} className="bg-white border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800">{date}</h4>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(professionalStats).map(([prof, stats]) => (
                              <div key={prof} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{prof}</span>
                                <span className="text-gray-600">
                                  {stats.count} agendamento{stats.count !== 1 ? 's' : ''} - R$ {stats.revenue.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>

              {(() => {
                const allAppointments = (window as any).allAppointments || [];
                const currentMonthAppointments = allAppointments.filter((apt: any) => {
                  const aptDate = new Date(apt.appointment_date);
                  const now = new Date();
                  return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
                });

                return currentMonthAppointments.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-orange-300">
                    <div className="bg-orange-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-orange-800">Total do Mês Atual</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-800">
                            {currentMonthAppointments.length} agendamentos
                          </div>
                          <div className="text-sm text-orange-700">
                            R$ {currentMonthAppointments.reduce((sum: number, apt: any) => sum + Number(apt.total_price), 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {getCurrentData().length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum dado disponível</p>
          </div>
        ) : (
          getCurrentData().map((item, index) => {
            const percentage = (item.count / getMaxValue()) * 100;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 truncate max-w-[200px]">
                    {getLabel(item)}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">
                      {item.count} {item.count === 1 ? 'agendamento' : 'agendamentos'}
                    </span>
                    <span className="font-semibold text-green-600">
                      R$ {item.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {getCurrentData().length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total de Agendamentos</p>
              <p className="text-2xl font-bold text-blue-600">
                {getCurrentData().reduce((sum, item) => sum + item.count, 0)}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Receita Total</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {getCurrentData().reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
