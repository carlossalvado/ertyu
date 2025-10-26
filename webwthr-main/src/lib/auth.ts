import { supabase } from './supabase'

export interface Professional {
  id: string
  name: string
  specialty: string
  role: string
}

export interface AuthState {
  professional: Professional | null
  isAuthenticated: boolean
  isLoading: boolean
}

export class AuthService {
  private static instance: AuthService
  private authState: AuthState = {
    professional: null,
    isAuthenticated: false,
    isLoading: true
  }

  private listeners: ((state: AuthState) => void)[] = []

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  private constructor() {
    this.checkAuthState()
  }

  private async checkAuthState() {
    const stored = localStorage.getItem('professional_auth')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        this.authState = {
          professional: data.professional,
          isAuthenticated: true,
          isLoading: false
        }
      } catch (error) {
        localStorage.removeItem('professional_auth')
        this.authState = {
          professional: null,
          isAuthenticated: false,
          isLoading: false
        }
      }
    } else {
      this.authState = {
        professional: null,
        isAuthenticated: false,
        isLoading: false
      }
    }
    this.notifyListeners()
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Tentando login com email:', email)

      const { data, error } = await supabase.rpc('authenticate_professional', {
        p_email: email,
        p_password: password
      })

      console.log('📊 Resultado da autenticação:', { data, error })

      if (error) {
        console.error('❌ Erro na autenticação:', error)
        return { success: false, error: 'Erro interno do servidor' }
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Credenciais inválidas')
        return { success: false, error: 'Email ou senha incorretos' }
      }

      const professionalData = data[0]
      console.log('✅ Login bem-sucedido para:', professionalData.name)
      console.log('👤 Dados completos do profissional:', professionalData)

      const professional: Professional = {
        id: professionalData.id,
        name: professionalData.name,
        specialty: professionalData.specialty,
        role: professionalData.role
      }

      this.authState = {
        professional,
        isAuthenticated: true,
        isLoading: false
      }

      localStorage.setItem('professional_auth', JSON.stringify({
        professional,
        timestamp: Date.now()
      }))

      this.notifyListeners()
      return { success: true }
    } catch (error) {
      console.error('❌ Erro inesperado no login:', error)
      return { success: false, error: 'Erro inesperado. Tente novamente.' }
    }
  }

  logout() {
    this.authState = {
      professional: null,
      isAuthenticated: false,
      isLoading: false
    }
    localStorage.removeItem('professional_auth')
    this.notifyListeners()
  }

  getAuthState(): AuthState {
    return { ...this.authState }
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState))
  }
}