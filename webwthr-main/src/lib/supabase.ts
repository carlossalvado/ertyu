import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          business_name: string;
          whatsapp_connected: boolean;
          whatsapp_number: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          business_name?: string;
          whatsapp_connected?: boolean;
          whatsapp_number?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          business_name?: string;
          whatsapp_connected?: boolean;
          whatsapp_number?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      professionals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          specialty: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          specialty?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          specialty?: string;
          active?: boolean;
          created_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          price: number;
          duration_minutes: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          price?: number;
          duration_minutes?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          price?: number;
          duration_minutes?: number;
          active?: boolean;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      packages: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          price: number;
          expires_after_days: number | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          price: number;
          expires_after_days?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          price?: number;
          expires_after_days?: number | null;
          active?: boolean;
          created_at?: string;
        };
      };
      package_services: {
        Row: {
          id: string;
          package_id: string;
          service_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          package_id: string;
          service_id: string;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          package_id?: string;
          service_id?: string;
          quantity?: number;
          created_at?: string;
        };
      };
      customer_package_services: {
        Row: {
          id: string;
          customer_package_id: string;
          service_id: string;
          sessions_remaining: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_package_id: string;
          service_id: string;
          sessions_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_package_id?: string;
          service_id?: string;
          sessions_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      customer_packages: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string;
          package_id: string;
          sessions_remaining: number;
          purchase_date: string;
          expiration_date: string | null;
          paid: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id: string;
          package_id: string;
          sessions_remaining: number;
          purchase_date?: string;
          expiration_date?: string | null;
          paid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_id?: string;
          package_id?: string;
          sessions_remaining?: number;
          purchase_date?: string;
          expiration_date?: string | null;
          paid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointment_services: {
        Row: {
          id: string;
          appointment_id: string;
          service_id: string;
          price: number;
          used_package_session: boolean;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          service_id: string;
          price?: number;
          used_package_session?: boolean;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          service_id?: string;
          price?: number;
          used_package_session?: boolean;
        };
      };
      appointments: {
        Row: {
          id: string;
          user_id: string;
          professional_id: string;
          customer_name: string;
          customer_phone: string;
          appointment_date: string;
          status: string;
          total_price: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          professional_id: string;
          customer_name: string;
          customer_phone: string;
          appointment_date: string;
          status?: string;
          total_price?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          professional_id?: string;
          customer_name?: string;
          customer_phone?: string;
          appointment_date?: string;
          status?: string;
          total_price?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          customer_phone: string;
          message: string;
          is_from_customer: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_phone: string;
          message: string;
          is_from_customer?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_phone?: string;
          message?: string;
          is_from_customer?: boolean;
          created_at?: string;
        };
      };
      whatsapp_global_config: {
        Row: {
          id: string;
          api_key_encrypted: string;
          phone_number_id: string;
          business_account_id: string | null;
          webhook_verify_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          api_key_encrypted: string;
          phone_number_id: string;
          business_account_id?: string | null;
          webhook_verify_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          api_key_encrypted?: string;
          phone_number_id?: string;
          business_account_id?: string | null;
          webhook_verify_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_agent_config: {
        Row: {
          id: string;
          user_id: string;
          agent_enabled: boolean;
          is_connected: boolean;
          whatsapp_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_enabled?: boolean;
          is_connected?: boolean;
          whatsapp_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          agent_enabled?: boolean;
          is_connected?: boolean;
          whatsapp_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
