/*
  # WhatsApp AI Appointment System - Initial Schema

  ## Overview
  This migration creates the complete database schema for a WhatsApp-based AI appointment system.
  
  ## New Tables
  
  ### 1. `users`
  - `id` (uuid, primary key) - User ID from Supabase Auth
  - `email` (text) - User email
  - `business_name` (text) - Name of the business
  - `whatsapp_connected` (boolean) - Whether WhatsApp is connected
  - `whatsapp_number` (text) - Connected WhatsApp number
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 2. `professionals`
  - `id` (uuid, primary key) - Professional ID
  - `user_id` (uuid, foreign key) - Owner of this professional
  - `name` (text) - Professional's name
  - `specialty` (text) - Professional's specialty/area
  - `active` (boolean) - Whether professional is active
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 3. `services`
  - `id` (uuid, primary key) - Service ID
  - `user_id` (uuid, foreign key) - Owner of this service
  - `name` (text) - Service name
  - `description` (text) - Service description
  - `price` (decimal) - Service price
  - `duration_minutes` (integer) - Service duration in minutes
  - `active` (boolean) - Whether service is active
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 4. `appointments`
  - `id` (uuid, primary key) - Appointment ID
  - `user_id` (uuid, foreign key) - Business owner
  - `professional_id` (uuid, foreign key) - Professional assigned
  - `service_id` (uuid, foreign key) - Service booked
  - `customer_name` (text) - Customer name
  - `customer_phone` (text) - Customer phone
  - `appointment_date` (timestamptz) - Scheduled date/time
  - `status` (text) - Status: pending, confirmed, cancelled, completed
  - `price` (decimal) - Price at booking time
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Booking timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 5. `chat_messages`
  - `id` (uuid, primary key) - Message ID
  - `user_id` (uuid, foreign key) - Business owner
  - `customer_phone` (text) - Customer phone number
  - `message` (text) - Message content
  - `is_from_customer` (boolean) - Direction of message
  - `created_at` (timestamptz) - Message timestamp
  
  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Authenticated users required for all operations
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  business_name text DEFAULT '',
  whatsapp_connected boolean DEFAULT false,
  whatsapp_number text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create professionals table
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own professionals"
  ON professionals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own professionals"
  ON professionals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own professionals"
  ON professionals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own professionals"
  ON professionals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer DEFAULT 60,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own services"
  ON services FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services"
  ON services FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own services"
  ON services FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  appointment_date timestamptz NOT NULL,
  status text DEFAULT 'pending',
  price decimal(10,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  message text NOT NULL,
  is_from_customer boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON professionals(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_phone ON chat_messages(customer_phone);
