export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointment_services: {
        Row: {
          appointment_id: string
          id: string
          price: number
          service_id: string
          used_package_session: boolean | null
        }
        Insert: {
          appointment_id: string
          id?: string
          price?: number
          service_id: string
          used_package_session?: boolean | null
        }
        Update: {
          appointment_id?: string
          id?: string
          price?: number
          service_id?: string
          used_package_session?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          created_at: string | null
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          professional_id: string
          status: string | null
          total_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_date: string
          created_at?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          professional_id: string
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_date?: string
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          professional_id?: string
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_auth"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          customer_phone: string
          id: string
          is_from_customer: boolean | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_phone: string
          id?: string
          is_from_customer?: boolean | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_phone?: string
          id?: string
          is_from_customer?: boolean | null
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_package_services: {
        Row: {
          created_at: string | null
          customer_package_id: string
          id: string
          service_id: string
          sessions_remaining: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_package_id: string
          id?: string
          service_id: string
          sessions_remaining?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_package_id?: string
          id?: string
          service_id?: string
          sessions_remaining?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_package_services_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_packages: {
        Row: {
          created_at: string | null
          customer_id: string
          expiration_date: string | null
          id: string
          package_id: string
          paid: boolean | null
          purchase_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          expiration_date?: string | null
          id?: string
          package_id: string
          paid?: boolean | null
          purchase_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          expiration_date?: string | null
          id?: string
          package_id?: string
          paid?: boolean | null
          purchase_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_packages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string
          professional_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone: string
          professional_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string
          professional_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_auth"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      package_services: {
        Row: {
          created_at: string | null
          id: string
          package_id: string
          quantity: number
          service_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          package_id: string
          quantity?: number
          service_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          package_id?: string
          quantity?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_services_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          expires_after_days: number | null
          id: string
          name: string
          price: number
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          expires_after_days?: number | null
          id?: string
          name: string
          price: number
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          expires_after_days?: number | null
          id?: string
          name?: string
          price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_services: {
        Row: {
          commission: number | null
          created_at: string | null
          id: string
          professional_id: string
          service_id: string
        }
        Insert: {
          commission?: number | null
          created_at?: string | null
          id?: string
          professional_id: string
          service_id: string
        }
        Update: {
          commission?: number | null
          created_at?: string | null
          id?: string
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_auth"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          password_hash: string | null
          role: string | null
          specialty: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          password_hash?: string | null
          role?: string | null
          specialty?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          password_hash?: string | null
          role?: string | null
          specialty?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          created_at: string | null
          default_commission: number | null
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          price: number
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          default_commission?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          price?: number
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          default_commission?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_appointment_data: {
        Row: {
          appointment_date: string
          appointment_id: string
          created_at: string | null
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          professional_id: string
          services: Json | null
          status: string | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_id: string
          created_at?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          professional_id: string
          services?: Json | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_id?: string
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          professional_id?: string
          services?: Json | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_appointment_data_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_appointment_data_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_auth"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_appointment_data_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_customer_packages: {
        Row: {
          created_at: string | null
          customer_id: string
          expiration_date: string | null
          id: string
          original_customer_package_id: string
          package_id: string
          package_services: Json | null
          paid: boolean | null
          professional_id: string
          purchase_date: string | null
          sessions_remaining: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          expiration_date?: string | null
          id?: string
          original_customer_package_id: string
          package_id: string
          package_services?: Json | null
          paid?: boolean | null
          professional_id: string
          purchase_date?: string | null
          sessions_remaining: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          expiration_date?: string | null
          id?: string
          original_customer_package_id?: string
          package_id?: string
          package_services?: Json | null
          paid?: boolean | null
          professional_id?: string
          purchase_date?: string | null
          sessions_remaining?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_customer_packages_original_customer_package_id_fkey"
            columns: ["original_customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_customer_packages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_auth"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_customer_packages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_customer_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_customers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          original_customer_id: string
          phone: string
          professional_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          original_customer_id: string
          phone: string
          professional_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          original_customer_id?: string
          phone?: string
          professional_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_customers_original_customer_id_fkey"
            columns: ["original_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_customers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_auth"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_customers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_packages: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          expires_after_days: number | null
          id: string
          name: string
          original_package_id: string
          package_services: Json | null
          price: number
          professional_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          expires_after_days?: number | null
          id?: string
          name: string
          original_package_id: string
          package_services?: Json | null
          price: number
          professional_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          expires_after_days?: number | null
          id?: string
          name?: string
          original_package_id?: string
          package_services?: Json | null
          price?: number
          professional_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_packages_original_package_id_fkey"
            columns: ["original_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_packages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_auth"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_packages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_services: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          original_service_id: string
          price: number
          professional_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          original_service_id: string
          price?: number
          professional_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          original_service_id?: string
          price?: number
          professional_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_services_original_service_id_fkey"
            columns: ["original_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_auth"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          business_name: string | null
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
          whatsapp_connected: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          email: string
          id: string
          updated_at?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      whatsapp_agent_config: {
        Row: {
          agent_enabled: boolean | null
          created_at: string | null
          id: string
          is_connected: boolean | null
          phone_number_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_enabled?: boolean | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          phone_number_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_enabled?: boolean | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          phone_number_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_agent_config_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_commissions: {
        Row: {
          id: string
          professional_id: string
          appointment_service_id: string
          appointment_id: string
          service_price: number
          commission_percentage: number
          commission_amount: number
          paid_at: string | null
          created_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          professional_id: string
          appointment_service_id: string
          appointment_id: string
          service_price: number
          commission_percentage: number
          commission_amount: number
          paid_at?: string | null
          created_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          professional_id?: string
          appointment_service_id?: string
          appointment_id?: string
          service_price?: number
          commission_percentage?: number
          commission_amount?: number
          paid_at?: string | null
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_commissions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_commissions_appointment_service_id_fkey"
            columns: ["appointment_service_id"]
            isOneToOne: false
            referencedRelation: "appointment_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_commissions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_commissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      professional_auth: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          id: string | null
          name: string | null
          password_hash: string | null
          role: string | null
          specialty: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          password_hash?: string | null
          role?: string | null
          specialty?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          password_hash?: string | null
          role?: string | null
          specialty?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      authenticate_professional: {
        Args: { p_email: string; p_password: string }
        Returns: {
          id: string
          name: string
          role: string
          specialty: string
        }[]
      }
      create_professional_with_auth: {
        Args: {
          p_email: string
          p_name: string
          p_password: string
          p_role?: string
          p_specialty: string
          p_user_id: string
        }
        Returns: string
      }
      create_shared_customer_packages_for_professional: {
        Args: { p_professional_id: string }
        Returns: undefined
      }
      create_shared_customers_for_professional: {
        Args: { p_professional_id: string }
        Returns: undefined
      }
      create_shared_packages_for_professional: {
        Args: { p_professional_id: string }
        Returns: undefined
      }
      create_shared_services_for_professional: {
        Args: { p_professional_id: string }
        Returns: undefined
      }
      populate_shared_data_for_professional: {
        Args: { p_professional_id: string }
        Returns: undefined
      }
      update_professional_credentials: {
        Args: { p_email: string; p_password: string; p_professional_id: string }
        Returns: boolean
      }
      update_professional_password: {
        Args: { p_new_password: string; p_professional_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
