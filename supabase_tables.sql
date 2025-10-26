-- =============================================================================
-- SUPABASE TABLES FOR APPOINTMENT MANAGEMENT SYSTEM
-- =============================================================================

-- Users table (business owners)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text,
  email text UNIQUE NOT NULL,
  whatsapp_connected boolean DEFAULT false,
  whatsapp_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Professionals table
CREATE TABLE professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text,
  email text UNIQUE,
  password_hash text,
  role text DEFAULT 'professional' CHECK (role IN ('professional', 'admin')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Services table
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer DEFAULT 60,
  default_commission numeric(5,2) DEFAULT 0.00 CHECK (default_commission >= 0 AND default_commission <= 100),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  professional_id uuid REFERENCES professionals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, phone)
);

-- Packages table
CREATE TABLE packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL,
  expires_after_days integer,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Package services table
CREATE TABLE package_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(package_id, service_id)
);

-- Customer packages table
CREATE TABLE customer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  sessions_remaining integer NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  expiration_date timestamptz,
  paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer package services table
CREATE TABLE customer_package_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id uuid NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  sessions_remaining integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_package_id, service_id)
);

-- Appointments table
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  appointment_date timestamptz NOT NULL,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  total_price decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Appointment services table
CREATE TABLE appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price decimal(10,2) NOT NULL DEFAULT 0,
  used_package_session boolean DEFAULT false
);

-- Professional services table
CREATE TABLE professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  commission numeric(5,2) DEFAULT 0.00 CHECK (commission >= 0 AND commission <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(professional_id, service_id)
);

-- Professional commissions table
CREATE TABLE professional_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  appointment_service_id uuid NOT NULL REFERENCES appointment_services(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_price decimal(10,2) NOT NULL,
  commission_percentage decimal(5,2) NOT NULL,
  commission_amount decimal(10,2) NOT NULL,
  paid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(appointment_service_id)
);

-- Chat messages table
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  message text NOT NULL,
  is_from_customer boolean DEFAULT false,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- WhatsApp agent config table
CREATE TABLE whatsapp_agent_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_enabled boolean DEFAULT false,
  is_connected boolean DEFAULT false,
  phone_number_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- WhatsApp keys table
CREATE TABLE whatsapp_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_encrypted text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shared services table
CREATE TABLE shared_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer DEFAULT 60,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(original_service_id, professional_id)
);

-- Shared customers table
CREATE TABLE shared_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(original_customer_id, professional_id)
);

-- Shared packages table
CREATE TABLE shared_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL,
  expires_after_days integer,
  active boolean DEFAULT true,
  package_services jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(original_package_id, professional_id)
);

-- Shared customer packages table
CREATE TABLE shared_customer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_customer_package_id uuid NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  package_id uuid NOT NULL,
  sessions_remaining integer NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  expiration_date timestamptz,
  paid boolean DEFAULT false,
  package_services jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(original_customer_package_id, professional_id)
);

-- Shared appointment data table
CREATE TABLE shared_appointment_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  appointment_date timestamptz NOT NULL,
  status text DEFAULT 'pending',
  total_price decimal(10,2) DEFAULT 0,
  notes text DEFAULT '',
  services jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(appointment_id, professional_id)
);

-- Professional auth view
CREATE VIEW professional_auth AS
SELECT
  id,
  email,
  password_hash,
  name,
  specialty,
  role,
  active,
  created_at
FROM professionals
WHERE email IS NOT NULL AND password_hash IS NOT NULL AND active = true;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Customers indexes
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_professional_id ON customers(professional_id);

-- Packages indexes
CREATE INDEX idx_packages_user_id ON packages(user_id);

-- Package services indexes
CREATE INDEX idx_package_services_package ON package_services(package_id);
CREATE INDEX idx_package_services_service ON package_services(service_id);

-- Customer packages indexes
CREATE INDEX idx_customer_packages_user_id ON customer_packages(user_id);
CREATE INDEX idx_customer_packages_customer ON customer_packages(customer_id);
CREATE INDEX idx_customer_packages_package ON customer_packages(package_id);

-- Customer package services indexes
CREATE INDEX idx_customer_package_services_customer_package ON customer_package_services(customer_package_id);
CREATE INDEX idx_customer_package_services_service ON customer_package_services(service_id);

-- Appointments indexes
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Appointment services indexes
CREATE INDEX idx_appointment_services_appointment ON appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service ON appointment_services(service_id);

-- Professional services indexes
CREATE INDEX idx_professional_services_professional_id ON professional_services(professional_id);
CREATE INDEX idx_professional_services_service_id ON professional_services(service_id);

-- Professionals indexes
CREATE INDEX idx_professionals_user_id ON professionals(user_id);
CREATE INDEX idx_professionals_email ON professionals(email);

-- Services indexes
CREATE INDEX idx_services_user_id ON services(user_id);

-- Professional commissions indexes
CREATE INDEX idx_professional_commissions_professional_id ON professional_commissions(professional_id);
CREATE INDEX idx_professional_commissions_appointment_id ON professional_commissions(appointment_id);
CREATE INDEX idx_professional_commissions_user_id ON professional_commissions(user_id);
CREATE INDEX idx_professional_commissions_paid_at ON professional_commissions(paid_at);

-- Shared data indexes
CREATE INDEX idx_shared_services_professional_id ON shared_services(professional_id);
CREATE INDEX idx_shared_services_original_id ON shared_services(original_service_id);
CREATE INDEX idx_shared_customers_professional_id ON shared_customers(professional_id);
CREATE INDEX idx_shared_customers_original_id ON shared_customers(original_customer_id);
CREATE INDEX idx_shared_packages_professional_id ON shared_packages(professional_id);
CREATE INDEX idx_shared_packages_original_id ON shared_packages(original_package_id);
CREATE INDEX idx_shared_customer_packages_professional_id ON shared_customer_packages(professional_id);
CREATE INDEX idx_shared_customer_packages_original_id ON shared_customer_packages(original_customer_package_id);
CREATE INDEX idx_shared_appointment_data_appointment_id ON shared_appointment_data(appointment_id);
CREATE INDEX idx_shared_appointment_data_professional_id ON shared_appointment_data(professional_id);
CREATE INDEX idx_shared_appointment_data_date ON shared_appointment_data(appointment_date);