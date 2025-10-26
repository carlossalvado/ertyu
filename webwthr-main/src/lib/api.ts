import { supabase } from './supabase'
import { AuthService } from './auth'

export interface Commission {
  total_appointments: number
  total_revenue: number
  commission_amount: number
  commission_rate: number
}

export interface Appointment {
  id: string
  user_id?: string
  professional_id: string
  customer_name: string
  customer_phone: string
  appointment_date: string
  status: string
  notes?: string
  total_price: number
  created_at?: string
  updated_at?: string
  services?: Array<{
    id: string
    name: string
    price: number
    duration_minutes: number
    used_package_session: boolean
  }>
}

export class ApiService {
  private static instance: ApiService
  private authService = AuthService.getInstance()

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService()
    }
    return ApiService.instance
  }

  async getAppointments(): Promise<Appointment[]> {
    const authState = this.authService.getAuthState()
    if (!authState.professional) {
      throw new Error('Usuário não autenticado')
    }

    console.log('🔍 Buscando agendamentos para profissional:', authState.professional.id)
    console.log('👤 Estado de autenticação completo:', authState)

    // VERIFICAÇÃO: Primeiro vamos ver TODOS os agendamentos para debug
    console.log('🔍 DEBUG: Buscando TODOS os agendamentos (sem filtro) para verificar dados')
    const { data: allAppointments, error: allError } = await supabase
      .from('appointments')
      .select('*')
      .limit(10)

    console.log('📊 TODOS os agendamentos no banco:', {
      count: allAppointments?.length || 0,
      data: allAppointments?.map(a => ({
        id: a.id,
        professional_id: a.professional_id,
        customer_name: a.customer_name,
        status: a.status
      })),
      error: allError
    })

    // Query DIRETA na tabela appointments (fonte primária dos dados)
    console.log('🔄 Buscando na tabela appointments (fonte primária)')
    console.log('👤 Professional ID sendo usado:', authState.professional.id)

    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('professional_id', authState.professional.id)
      .order('appointment_date', { ascending: false })

    console.log('📊 Resultado BRUTO da query appointments:', {
      count: appointmentsData?.length || 0,
      data: appointmentsData,
      error: appointmentsError,
      professional_id_filter: authState.professional.id
    })

    // Log detalhado de cada agendamento encontrado
    if (appointmentsData && appointmentsData.length > 0) {
      console.log('🔍 Detalhes dos agendamentos encontrados:')
      appointmentsData.forEach((appointment, index) => {
        console.log(`📅 Agendamento ${index + 1}:`, {
          id: appointment.id,
          professional_id: appointment.professional_id,
          customer_name: appointment.customer_name,
          status: appointment.status,
          appointment_date: appointment.appointment_date,
          total_price: appointment.total_price
        })
      })
    } else {
      console.log('❌ NENHUM agendamento encontrado com professional_id:', authState.professional.id)
      console.log('💡 Verifique se o professional_id está correto ou se há RLS bloqueando')
    }

    if (appointmentsError) {
      console.error('❌ Erro ao buscar agendamentos:', appointmentsError)
      throw appointmentsError
    }

    if (!appointmentsData || appointmentsData.length === 0) {
      console.log('⚠️ Nenhum agendamento encontrado na tabela appointments')

      // Tentar buscar da tabela shared_appointment_data como último recurso
      console.log('🔄 Último recurso: Buscando na tabela shared_appointment_data')
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_appointment_data')
        .select('*')
        .eq('professional_id', authState.professional.id)
        .order('appointment_date', { ascending: false })

      console.log('📊 Resultado da query shared_appointment_data:', {
        count: sharedData?.length || 0,
        data: sharedData,
        error: sharedError
      })

      if (sharedData && sharedData.length > 0) {
        console.log('✅ Usando dados da tabela shared_appointment_data')
        return sharedData.map(item => ({
          id: item.appointment_id,
          user_id: '', // Não temos esse campo na shared table
          professional_id: item.professional_id,
          customer_name: item.customer_name,
          customer_phone: item.customer_phone,
          appointment_date: item.appointment_date,
          status: item.status,
          notes: item.notes,
          total_price: item.total_price,
          created_at: item.created_at,
          updated_at: item.updated_at,
          services: item.services || []
        }))
      }

      return []
    }

    // Para cada agendamento, buscar os serviços relacionados
    const appointmentsWithServices = await Promise.all(
      appointmentsData.map(async (appointment) => {
        const { data: servicesData, error: servicesError } = await supabase
          .from('appointment_services')
          .select(`
            service_id,
            price,
            used_package_session,
            services (
              id,
              name,
              duration_minutes
            )
          `)
          .eq('appointment_id', appointment.id)

        if (servicesError) {
          console.error('❌ Erro ao buscar serviços do agendamento:', appointment.id, servicesError)
        }

        return {
          ...appointment,
          services: servicesData?.map((as: any) => ({
            id: as.services?.id || '',
            name: as.services?.name || '',
            price: as.price || 0,
            duration_minutes: as.services?.duration_minutes || 60,
            used_package_session: as.used_package_session || false
          })) || []
        }
      })
    )

    console.log('✅ Agendamentos processados:', appointmentsWithServices.length, appointmentsWithServices)
    return appointmentsWithServices
  }


  async getCommissions(): Promise<Commission> {
    const authState = this.authService.getAuthState()
    if (!authState.professional) {
      throw new Error('Usuário não autenticado')
    }

    console.log('💰 Buscando comissões para profissional:', authState.professional.id)

    // Buscar comissões diretamente da tabela professional_commissions
    const { data: commissions, error } = await supabase
      .from('professional_commissions')
      .select('commission_amount, service_price, commission_percentage')
      .eq('professional_id', authState.professional.id)

    console.log('📊 Resultado da query commissions:', { commissions, error })

    if (error) {
      console.error('❌ Erro ao buscar comissões:', error)
      // Retornar valores padrão em caso de erro
      return {
        total_appointments: 0,
        total_revenue: 0,
        commission_amount: 0,
        commission_rate: 0
      }
    }

    // Se não há comissões, calcular baseado nos agendamentos concluídos
    if (!commissions || commissions.length === 0) {
      console.log('⚠️ Nenhuma comissão encontrada, calculando baseado em agendamentos concluídos')

      // Buscar agendamentos concluídos para calcular comissões
      const { data: completedAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('total_price')
        .eq('professional_id', authState.professional.id)
        .eq('status', 'completed')

      if (appointmentsError) {
        console.error('❌ Erro ao buscar agendamentos concluídos:', appointmentsError)
        return {
          total_appointments: 0,
          total_revenue: 0,
          commission_amount: 0,
          commission_rate: 0.15 // Taxa padrão de 15%
        }
      }

      const totalAppointments = completedAppointments?.length || 0
      const totalRevenue = completedAppointments?.reduce((sum, app) => sum + (app.total_price || 0), 0) || 0
      const commissionRate = 0.15 // 15% padrão
      const commissionAmount = totalRevenue * commissionRate

      console.log('📈 Comissões calculadas de agendamentos:', {
        totalAppointments,
        totalRevenue,
        commissionAmount,
        commissionRate
      })

      return {
        total_appointments: totalAppointments,
        total_revenue: totalRevenue,
        commission_amount: commissionAmount,
        commission_rate: commissionRate
      }
    }

    // Se há comissões na tabela, usar os dados reais
    console.log('✅ Usando dados reais da tabela professional_commissions')

    const totalCommissions = commissions?.length || 0
    const totalCommissionAmount = commissions?.reduce((sum, comm) => sum + (comm.commission_amount || 0), 0) || 0
    const totalRevenue = commissions?.reduce((sum, comm) => sum + (comm.service_price || 0), 0) || 0

    // Calcular taxa média baseada nos dados reais da tabela professional_commissions
    // Cada linha representa uma comissão por serviço em um agendamento concluído
    const avgCommissionRate = totalCommissions > 0
      ? (commissions?.reduce((sum, comm) => sum + (comm.commission_percentage || 0), 0) || 0) / totalCommissions / 100
      : 0.40 // Fallback para 40% se não conseguir calcular

    console.log('📊 Cálculo baseado na tabela professional_commissions:', {
      totalCommissionRecords: totalCommissions,
      totalCommissionAmount,
      totalRevenue,
      calculatedAvgRate: `${(avgCommissionRate * 100).toFixed(1)}%`,
      sampleRecords: commissions?.slice(0, 3).map(c => ({
        commission_percentage: c.commission_percentage,
        commission_amount: c.commission_amount,
        service_price: c.service_price
      }))
    })

    console.log('✅ Comissões calculadas:', {
      totalAppointments: totalCommissions,
      totalRevenue,
      totalCommissionAmount,
      avgCommissionRate
    })

    return {
      total_appointments: totalCommissions,
      total_revenue: totalRevenue,
      commission_amount: totalCommissionAmount,
      commission_rate: avgCommissionRate
    }
  }
}