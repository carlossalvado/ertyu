import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, Briefcase, Filter, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StatsData {
  totalAppointments: number;
  totalRevenue: number;
  projectedRevenue: number;
  professionalCount: number;
  serviceCount: number;
}

type PeriodFilter = 'day' | 'week' | 'month' | 'year';

export default function Stats({ onReportsClick, onProfessionalsClick }: { onReportsClick?: () => void; onProfessionalsClick?: () => void }) {
  const { user } = useAuth();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [stats, setStats] = useState<StatsData>({
    totalAppointments: 0,
    totalRevenue: 0,
    projectedRevenue: 0,
    professionalCount: 0,
    serviceCount: 0
  });

  useEffect(() => {
    loadStats();
  }, [user, periodFilter]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (periodFilter) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        startDate = startOfWeek;
        endDate = new Date(startOfWeek);
        endDate.setDate(startOfWeek.getDate() + 6);
        endDate.setHours(23, 59, 59);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { startDate, endDate };
  };

  const loadStats = async () => {
    if (!user) return;

    const { startDate, endDate } = getDateRange();

    const [appointmentsRes, packagesRes, professionalsRes, servicesRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('total_price, status, appointment_date')
        .eq('user_id', user.id)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString()),
      supabase
        .from('customer_packages')
        .select('package:packages(price), created_at')
        .eq('user_id', user.id)
        .eq('paid', true)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true),
      supabase
        .from('services')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true)
    ]);

    // Calculate completed revenue (only completed appointments)
    const completedAppointments = appointmentsRes.data?.filter(apt => apt.status === 'completed') || [];
    const totalRevenue = completedAppointments.reduce((sum, apt) => sum + Number(apt.total_price), 0) || 0;

    // Calculate projected revenue (all appointments: pending, confirmed, completed)
    const allAppointments = appointmentsRes.data?.filter(apt =>
      ['pending', 'confirmed', 'completed'].includes(apt.status)
    ) || [];
    const projectedRevenue = allAppointments.reduce((sum, apt) => sum + Number(apt.total_price), 0) || 0;

    const totalAppointments = appointmentsRes.data?.length || 0;
    const packagesRevenue = packagesRes.data?.reduce((sum, pkg) => sum + Number((pkg.package as any)?.price || 0), 0) || 0;
    const professionalCount = professionalsRes.data?.length || 0;
    const serviceCount = servicesRes.data?.length || 0;

    setStats({
      totalAppointments,
      totalRevenue: totalRevenue + packagesRevenue,
      projectedRevenue: projectedRevenue + packagesRevenue,
      professionalCount,
      serviceCount
    });
  };

  const statCards = [
    {
      title: 'Total de Agendamentos',
      value: stats.totalAppointments,
      icon: Calendar,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Receita Realizada',
      value: `R$ ${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Receita Projetada',
      value: `R$ ${stats.projectedRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Profissionais Ativos',
      value: stats.professionalCount,
      icon: Users,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      clickable: true
    },
    {
      title: 'Serviços Disponíveis',
      value: stats.serviceCount,
      icon: Briefcase,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Relatórios',
      value: 'Ver Análise',
      icon: BarChart3,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      clickable: true
    }
  ];

  const periodOptions = [
    { value: 'day' as PeriodFilter, label: 'Hoje' },
    { value: 'week' as PeriodFilter, label: 'Esta Semana' },
    { value: 'month' as PeriodFilter, label: 'Este Mês' },
    { value: 'year' as PeriodFilter, label: 'Este Ano' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Estatísticas</h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition ${
              stat.clickable ? 'cursor-pointer hover:bg-gray-50' : ''
            }`}
            onClick={stat.clickable ? (stat.title === 'Relatórios' ? onReportsClick : onProfessionalsClick) : undefined}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
