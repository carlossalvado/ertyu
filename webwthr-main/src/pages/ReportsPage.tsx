import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, TrendingUp, DollarSign, Package, Scissors } from 'lucide-react';

type ReportPeriod = 'year' | 'semester' | 'quarter' | 'month' | 'last_month';
type ReportView = 'overview' | 'daily' | 'monthly';

interface ReportData {
  packagesRevenue: number;
  servicesRevenue: number;
  totalRevenue: number;
  packageCount: number;
  serviceCount: number;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('year');
  const [selectedView, setSelectedView] = useState<ReportView>('overview');
  const [reportData, setReportData] = useState<ReportData>({
    packagesRevenue: 0,
    servicesRevenue: 0,
    totalRevenue: 0,
    packageCount: 0,
    serviceCount: 0
  });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate year options (current year + last 5 years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    loadReportData();
  }, [user, selectedYear, selectedMonth, selectedDay, selectedPeriod, selectedView]);

  const getDateRange = () => {
    const year = selectedYear;
    let startDate: Date;
    let endDate: Date;

    switch (selectedPeriod) {
      case 'year':
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
        break;
      case 'semester':
        // First semester (Jan-Jun) or Second semester (Jul-Dec)
        const currentMonth = new Date().getMonth();
        const isFirstSemester = currentMonth < 6;
        startDate = new Date(year, isFirstSemester ? 0 : 6, 1);
        endDate = new Date(year, isFirstSemester ? 5 : 11, isFirstSemester ? 30 : 31, 23, 59, 59);
        break;
      case 'quarter':
        // Current quarter
        const quarter = Math.floor(new Date().getMonth() / 3);
        startDate = new Date(year, quarter * 3, 1);
        endDate = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59);
        break;
      case 'month':
        const month = new Date().getMonth();
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0, 23, 59, 59);
        break;
      case 'last_month':
        const currentDate = new Date();
        const lastMonth = currentDate.getMonth() - 1;
        const lastMonthYear = lastMonth < 0 ? year - 1 : year;
        const adjustedLastMonth = lastMonth < 0 ? 11 : lastMonth;
        startDate = new Date(lastMonthYear, adjustedLastMonth, 1);
        endDate = new Date(lastMonthYear, adjustedLastMonth + 1, 0, 23, 59, 59);
        break;
      default:
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    return { startDate, endDate };
  };

  const loadReportData = async () => {
    if (!user) return;

    setLoading(true);
    const { startDate, endDate } = getDateRange();

    try {
      if (selectedView === 'overview') {
        // Get packages revenue
        const { data: packagesData } = await supabase
          .from('customer_packages')
          .select('package:packages(price)')
          .eq('user_id', user.id)
          .eq('paid', true)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Get services revenue from completed appointments
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('total_price, status, appointment_date')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('appointment_date', startDate.toISOString())
          .lte('appointment_date', endDate.toISOString());

        const packagesRevenue = packagesData?.reduce((sum, pkg) =>
          sum + Number((pkg.package as any)?.price || 0), 0) || 0;

        const servicesRevenue = appointmentsData?.reduce((sum, apt) =>
          sum + Number(apt.total_price), 0) || 0;

        const totalRevenue = packagesRevenue + servicesRevenue;
        const packageCount = packagesData?.length || 0;
        const serviceCount = appointmentsData?.length || 0;

        setReportData({
          packagesRevenue,
          servicesRevenue,
          totalRevenue,
          packageCount,
          serviceCount
        });
      } else if (selectedView === 'daily') {
        // Load data for the specific selected day
        const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);

        const { data: dayPackages } = await supabase
          .from('customer_packages')
          .select('created_at, package:packages(price)')
          .eq('user_id', user.id)
          .eq('paid', true)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        const { data: dayAppointments } = await supabase
          .from('appointments')
          .select('appointment_date, total_price, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('appointment_date', dayStart.toISOString())
          .lte('appointment_date', dayEnd.toISOString());

        // Calculate totals for the selected day
        const packagesRevenue = dayPackages?.reduce((sum, pkg) =>
          sum + Number((pkg.package as any)?.price || 0), 0) || 0;

        const servicesRevenue = dayAppointments?.reduce((sum, apt) =>
          sum + Number(apt.total_price), 0) || 0;

        const totalRevenue = packagesRevenue + servicesRevenue;
        const packageCount = dayPackages?.length || 0;
        const serviceCount = dayAppointments?.length || 0;

        setDailyData([{
          date: selectedDate.toISOString().split('T')[0],
          packagesRevenue,
          servicesRevenue,
          totalRevenue,
          packageCount,
          serviceCount
        }]);
      } else if (selectedView === 'monthly') {
        // Load data for the specific selected month
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

        const { data: monthPackages } = await supabase
          .from('customer_packages')
          .select('created_at, package:packages(price)')
          .eq('user_id', user.id)
          .eq('paid', true)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const { data: monthAppointments } = await supabase
          .from('appointments')
          .select('appointment_date, total_price, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('appointment_date', monthStart.toISOString())
          .lte('appointment_date', monthEnd.toISOString());

        // Calculate totals for the selected month
        const packagesRevenue = monthPackages?.reduce((sum, pkg) =>
          sum + Number((pkg.package as any)?.price || 0), 0) || 0;

        const servicesRevenue = monthAppointments?.reduce((sum, apt) =>
          sum + Number(apt.total_price), 0) || 0;

        const totalRevenue = packagesRevenue + servicesRevenue;
        const packageCount = monthPackages?.length || 0;
        const serviceCount = monthAppointments?.length || 0;

        setMonthlyData([{
          month: selectedMonth,
          packagesRevenue,
          servicesRevenue,
          totalRevenue,
          packageCount,
          serviceCount
        }]);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'year': return `Ano ${selectedYear}`;
      case 'semester': {
        const currentMonth = new Date().getMonth();
        return `${currentMonth < 6 ? '1º' : '2º'} Semestre ${selectedYear}`;
      }
      case 'quarter': {
        const quarter = Math.floor(new Date().getMonth() / 3) + 1;
        return `${quarter}º Trimestre ${selectedYear}`;
      }
      case 'month': {
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return `${monthNames[new Date().getMonth()]} ${selectedYear}`;
      }
      case 'last_month': {
        const currentDate = new Date();
        const lastMonth = currentDate.getMonth() - 1;
        const lastMonthYear = lastMonth < 0 ? selectedYear - 1 : selectedYear;
        const adjustedLastMonth = lastMonth < 0 ? 11 : lastMonth;
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return `${monthNames[adjustedLastMonth]} ${lastMonthYear}`;
      }
      default: return `Ano ${selectedYear}`;
    }
  };

  const packagesPercentage = reportData.totalRevenue > 0 ?
    (reportData.packagesRevenue / reportData.totalRevenue) * 100 : 0;

  const servicesPercentage = reportData.totalRevenue > 0 ?
    (reportData.servicesRevenue / reportData.totalRevenue) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Relatórios de Vendas</h1>
        <p className="text-gray-600">Análise detalhada de pacotes e serviços</p>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
        <div className="flex space-x-1">
          <button
            onClick={() => setSelectedView('overview')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
              selectedView === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setSelectedView('daily')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
              selectedView === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Por Dia
          </button>
          <button
            onClick={() => setSelectedView('monthly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
              selectedView === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Por Mês
          </button>
        </div>
      </div>

      {/* Filters - Only show for overview */}
      {selectedView === 'overview' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ano</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriod)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="year">Ano Completo</option>
                <option value="semester">Semestre Atual</option>
                <option value="quarter">Trimestre Atual</option>
                <option value="month">Mês Atual</option>
                <option value="last_month">Mês Anterior</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              <span className="font-medium">Período selecionado:</span> {getPeriodLabel()}
            </div>
          </div>
        </div>
      )}

      {selectedView === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Receita Total</p>
                  <p className="text-2xl font-bold text-gray-800">R$ {reportData.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pacotes Vendidos</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.packageCount}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Serviços Realizados</p>
                  <p className="text-2xl font-bold text-gray-800">{reportData.serviceCount}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl">
                  <Scissors className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Distribuição de Receitas</h2>

            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Pie Chart */}
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Packages slice */}
                  {packagesPercentage > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#3B82F6"
                      strokeWidth="20"
                      strokeDasharray={`${packagesPercentage * 2.51} 251`}
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                  )}

                  {/* Services slice */}
                  {servicesPercentage > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#8B5CF6"
                      strokeWidth="20"
                      strokeDasharray={`${servicesPercentage * 2.51} 251`}
                      strokeDashoffset={`${-packagesPercentage * 2.51}`}
                      transform="rotate(-90 50 50)"
                    />
                  )}
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-lg font-bold text-gray-800">R$ {reportData.totalRevenue.toFixed(0)}</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    <div>
                      <p className="font-medium text-gray-800">Pacotes</p>
                      <p className="text-sm text-gray-600">{reportData.packageCount} vendidos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">R$ {reportData.packagesRevenue.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">{packagesPercentage.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-purple-600 rounded"></div>
                    <div>
                      <p className="font-medium text-gray-800">Serviços</p>
                      <p className="text-sm text-gray-600">{reportData.serviceCount} realizados</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">R$ {reportData.servicesRevenue.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">{servicesPercentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedView === 'daily' && (
        <>
          {/* Date Selector */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Selecionar Data</h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ano</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[
                    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                  ].map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dia</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="text-sm text-gray-600">
                <span className="font-medium">Data selecionada:</span> {new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  timeZone: 'America/Sao_Paulo'
                })}
              </div>
            </div>
          </div>

          {/* Daily Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Distribuição de Receitas - {new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              timeZone: 'America/Sao_Paulo'
            })}</h2>

            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Pie Chart */}
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Calculate totals for the pie chart */}
                  {(() => {
                    const recentData = dailyData.slice(0, 14);
                    const totalPackages = recentData.reduce((sum, day) => sum + day.packagesRevenue, 0);
                    const totalServices = recentData.reduce((sum, day) => sum + day.servicesRevenue, 0);
                    const totalRevenue = totalPackages + totalServices;

                    const packagesPercentage = totalRevenue > 0 ? (totalPackages / totalRevenue) * 100 : 0;
                    const servicesPercentage = totalRevenue > 0 ? (totalServices / totalRevenue) * 100 : 0;

                    return (
                      <>
                        {/* Packages slice */}
                        {packagesPercentage > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke="#3B82F6"
                            strokeWidth="20"
                            strokeDasharray={`${packagesPercentage * 2.51} 251`}
                            strokeDashoffset="0"
                            transform="rotate(-90 50 50)"
                          />
                        )}

                        {/* Services slice */}
                        {servicesPercentage > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke="#8B5CF6"
                            strokeWidth="20"
                            strokeDasharray={`${servicesPercentage * 2.51} 251`}
                            strokeDashoffset={`${-packagesPercentage * 2.51}`}
                            transform="rotate(-90 50 50)"
                          />
                        )}
                      </>
                    );
                  })()}
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">{new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit'
                    })}</p>
                    <p className="text-lg font-bold text-gray-800">
                      R$ {dailyData[0]?.totalRevenue.toFixed(0) || '0'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-4">
                {(() => {
                  const dayData = dailyData[0] || { packagesRevenue: 0, servicesRevenue: 0, packageCount: 0, serviceCount: 0 };
                  const totalRevenue = dayData.packagesRevenue + dayData.servicesRevenue;

                  const packagesPercentage = totalRevenue > 0 ? (dayData.packagesRevenue / totalRevenue) * 100 : 0;
                  const servicesPercentage = totalRevenue > 0 ? (dayData.servicesRevenue / totalRevenue) * 100 : 0;

                  return (
                    <>
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-blue-600 rounded"></div>
                          <div>
                            <p className="font-medium text-gray-800">Pacotes</p>
                            <p className="text-sm text-gray-600">{dayData.packageCount} vendido{dayData.packageCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">R$ {dayData.packagesRevenue.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{packagesPercentage.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-purple-600 rounded"></div>
                          <div>
                            <p className="font-medium text-gray-800">Serviços</p>
                            <p className="text-sm text-gray-600">{dayData.serviceCount} realizado{dayData.serviceCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">R$ {dayData.servicesRevenue.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{servicesPercentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Daily Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Resumo do Dia - {new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              timeZone: 'America/Sao_Paulo'
            })}</h2>

            {dailyData[0] ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pacotes Vendidos</p>
                      <p className="text-2xl font-bold text-gray-800">{dailyData[0].packageCount}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-blue-600 mt-2">
                    R$ {dailyData[0].packagesRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Serviços Realizados</p>
                      <p className="text-2xl font-bold text-gray-800">{dailyData[0].serviceCount}</p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-xl">
                      <Scissors className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-purple-600 mt-2">
                    R$ {dailyData[0].servicesRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Receita Total</p>
                      <p className="text-2xl font-bold text-gray-800">R$ {dailyData[0].totalRevenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-xl">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Pacotes + Serviços
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum dado encontrado para esta data</p>
              </div>
            )}
          </div>
        </>
      )}

      {selectedView === 'monthly' && (
        <>
          {/* Month Selector */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Selecionar Mês</h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ano</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[
                    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                  ].map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
              </div>

              <div className="text-sm text-gray-600">
                <span className="font-medium">Mês selecionado:</span> {[
                  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                ][selectedMonth]} {selectedYear}
              </div>
            </div>
          </div>

          {/* Monthly Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Distribuição de Receitas - {[
              'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
              'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ][selectedMonth]} {selectedYear}</h2>

            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Pie Chart */}
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Calculate totals for the pie chart */}
                  {(() => {
                    const totalPackages = monthlyData.reduce((sum, month) => sum + month.packagesRevenue, 0);
                    const totalServices = monthlyData.reduce((sum, month) => sum + month.servicesRevenue, 0);
                    const totalRevenue = totalPackages + totalServices;

                    const packagesPercentage = totalRevenue > 0 ? (totalPackages / totalRevenue) * 100 : 0;
                    const servicesPercentage = totalRevenue > 0 ? (totalServices / totalRevenue) * 100 : 0;

                    return (
                      <>
                        {/* Packages slice */}
                        {packagesPercentage > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke="#3B82F6"
                            strokeWidth="20"
                            strokeDasharray={`${packagesPercentage * 2.51} 251`}
                            strokeDashoffset="0"
                            transform="rotate(-90 50 50)"
                          />
                        )}

                        {/* Services slice */}
                        {servicesPercentage > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke="#8B5CF6"
                            strokeWidth="20"
                            strokeDasharray={`${servicesPercentage * 2.51} 251`}
                            strokeDashoffset={`${-packagesPercentage * 2.51}`}
                            transform="rotate(-90 50 50)"
                          />
                        )}
                      </>
                    );
                  })()}
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">{[
                      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
                    ][selectedMonth]}</p>
                    <p className="text-lg font-bold text-gray-800">
                      R$ {monthlyData[0]?.totalRevenue.toFixed(0) || '0'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-4">
                {(() => {
                  const monthData = monthlyData[0] || { packagesRevenue: 0, servicesRevenue: 0, packageCount: 0, serviceCount: 0 };
                  const totalRevenue = monthData.packagesRevenue + monthData.servicesRevenue;

                  const packagesPercentage = totalRevenue > 0 ? (monthData.packagesRevenue / totalRevenue) * 100 : 0;
                  const servicesPercentage = totalRevenue > 0 ? (monthData.servicesRevenue / totalRevenue) * 100 : 0;

                  return (
                    <>
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-blue-600 rounded"></div>
                          <div>
                            <p className="font-medium text-gray-800">Pacotes</p>
                            <p className="text-sm text-gray-600">{monthData.packageCount} vendido{monthData.packageCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">R$ {monthData.packagesRevenue.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{packagesPercentage.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-purple-600 rounded"></div>
                          <div>
                            <p className="font-medium text-gray-800">Serviços</p>
                            <p className="text-sm text-gray-600">{monthData.serviceCount} realizado{monthData.serviceCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">R$ {monthData.servicesRevenue.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">{servicesPercentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Resumo do Mês - {[
              'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
              'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ][selectedMonth]} {selectedYear}</h2>

            {monthlyData[0] ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pacotes Vendidos</p>
                      <p className="text-2xl font-bold text-gray-800">{monthlyData[0].packageCount}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-blue-600 mt-2">
                    R$ {monthlyData[0].packagesRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Serviços Realizados</p>
                      <p className="text-2xl font-bold text-gray-800">{monthlyData[0].serviceCount}</p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-xl">
                      <Scissors className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-purple-600 mt-2">
                    R$ {monthlyData[0].servicesRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Receita Total</p>
                      <p className="text-2xl font-bold text-gray-800">R$ {monthlyData[0].totalRevenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-xl">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Pacotes + Serviços
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum dado encontrado para este mês</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}