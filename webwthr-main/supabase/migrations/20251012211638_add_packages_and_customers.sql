/*
  # Add Packages and Customers Support

  ## New Tables

  ### 1. `customers`
  - `id` (uuid, primary key) - Customer ID
  - `user_id` (uuid, foreign key) - Business owner
  - `name` (text) - Customer name
  - `phone` (text) - Customer phone (unique per business)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `packages`
  - `id` (uuid, primary key) - Package ID
  - `user_id` (uuid, foreign key) - Business owner
  - `name` (text) - Package name
  - `description` (text) - Package description
  - `service_type` (text) - Type of service (e.g., 'barba', 'cabelo')
  - `total_sessions` (integer) - Total number of sessions
  - `price` (decimal) - Package price
  - `expires_after_days` (integer) - Days until expiration (null for unlimited)
  - `active` (boolean) - Whether package is active
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. `customer_packages`
  - `id` (uuid, primary key) - Customer package ID
  - `user_id` (uuid, foreign key) - Business owner
  - `customer_id` (uuid, foreign key) - Customer
  - `package_id` (uuid, foreign key) - Package
  - `sessions_remaining` (integer) - Remaining sessions
  - `purchase_date` (timestamptz) - Purchase date
  - `expiration_date` (timestamptz) - Expiration date (null if no expiration)
  - `paid` (boolean) - Whether package is paid
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `appointment_services`
  - `id` (uuid, primary key) - Appointment service ID
  - `appointment_id` (uuid, foreign key) - Appointment
  - `service_id` (uuid, foreign key) - Service
  - `price` (decimal) - Price for this service (0 if from package)
  - `used_package_session` (boolean) - Whether this used a package session

  ## Modified Tables

  ### `appointments`
  - Remove `service_id` (moved to appointment_services)
  - Remove `price` (calculated from appointment_services)
  - Add `total_price` (decimal) - Total price of appointment
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, phone)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
  ON customers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  service_type text NOT NULL,
  total_sessions integer NOT NULL,
  price decimal(10,2) NOT NULL,
  expires_after_days integer,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own packages"
  ON packages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own packages"
  ON packages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packages"
  ON packages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own packages"
  ON packages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create customer_packages table
CREATE TABLE IF NOT EXISTS customer_packages (
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

ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customer packages"
  ON customer_packages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customer packages"
  ON customer_packages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customer packages"
  ON customer_packages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customer packages"
  ON customer_packages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create appointment_services table
CREATE TABLE IF NOT EXISTS appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price decimal(10,2) NOT NULL DEFAULT 0,
  used_package_session boolean DEFAULT false
);

ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointment services"
  ON appointment_services FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id));

CREATE POLICY "Users can insert own appointment services"
  ON appointment_services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id));

CREATE POLICY "Users can update own appointment services"
  ON appointment_services FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id));

CREATE POLICY "Users can delete own appointment services"
  ON appointment_services FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM appointments WHERE id = appointment_id));

-- Modify appointments table
ALTER TABLE appointments DROP COLUMN IF EXISTS service_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS price;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_price decimal(10,2) DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_packages_user_id ON packages(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_user_id ON customer_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON customer_packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_package ON customer_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment ON appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_service ON appointment_services(service_id);