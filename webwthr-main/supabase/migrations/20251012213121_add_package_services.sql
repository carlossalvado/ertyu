/*
  # Add Package Services Support

  ## New Tables

  ### 1. `package_services`
  - `id` (uuid, primary key) - Package service ID
  - `package_id` (uuid, foreign key) - Package
  - `service_id` (uuid, foreign key) - Service included in package
  - `quantity` (integer) - Number of sessions for this service
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. `customer_package_services`
  - `id` (uuid, primary key) - Customer package service ID
  - `customer_package_id` (uuid, foreign key) - Customer package
  - `service_id` (uuid, foreign key) - Service
  - `sessions_remaining` (integer) - Remaining sessions for this service
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Modified Tables

  ### `packages`
  - Remove `service_type` and `total_sessions` (moved to package_services)

  ### `customer_packages`
  - Remove `sessions_remaining` (moved to customer_package_services)
*/

-- Create package_services table
CREATE TABLE IF NOT EXISTS package_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(package_id, service_id)
);

ALTER TABLE package_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own package services"
  ON package_services FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id));

CREATE POLICY "Users can insert own package services"
  ON package_services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id));

CREATE POLICY "Users can update own package services"
  ON package_services FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id));

CREATE POLICY "Users can delete own package services"
  ON package_services FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM packages WHERE id = package_id));

-- Create customer_package_services table
CREATE TABLE IF NOT EXISTS customer_package_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id uuid NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  sessions_remaining integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_package_id, service_id)
);

ALTER TABLE customer_package_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customer package services"
  ON customer_package_services FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id));

CREATE POLICY "Users can insert own customer package services"
  ON customer_package_services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id));

CREATE POLICY "Users can update own customer package services"
  ON customer_package_services FOR UPDATE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id));

CREATE POLICY "Users can delete own customer package services"
  ON customer_package_services FOR DELETE
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM customer_packages WHERE id = customer_package_id));

-- Modify packages table
ALTER TABLE packages DROP COLUMN IF EXISTS service_type;
ALTER TABLE packages DROP COLUMN IF EXISTS total_sessions;

-- Modify customer_packages table
ALTER TABLE customer_packages DROP COLUMN IF EXISTS sessions_remaining;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_package_services_package ON package_services(package_id);
CREATE INDEX IF NOT EXISTS idx_package_services_service ON package_services(service_id);
CREATE INDEX IF NOT EXISTS idx_customer_package_services_customer_package ON customer_package_services(customer_package_id);
CREATE INDEX IF NOT EXISTS idx_customer_package_services_service ON customer_package_services(service_id);