-- Create shared business data tables for professionals
-- These tables will store business-related data that both admins and assigned professionals can access

-- Shared services table
CREATE TABLE IF NOT EXISTS shared_services (
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

ALTER TABLE shared_services ENABLE ROW LEVEL SECURITY;

-- Shared customers table
CREATE TABLE IF NOT EXISTS shared_customers (
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

ALTER TABLE shared_customers ENABLE ROW LEVEL SECURITY;

-- Shared packages table
CREATE TABLE IF NOT EXISTS shared_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL,
  expires_after_days integer,
  active boolean DEFAULT true,
  package_services jsonb DEFAULT '[]'::jsonb, -- Store package services as JSON
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(original_package_id, professional_id)
);

ALTER TABLE shared_packages ENABLE ROW LEVEL SECURITY;

-- Shared customer packages table
CREATE TABLE IF NOT EXISTS shared_customer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_customer_package_id uuid NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL, -- Reference to shared_customers.id
  package_id uuid NOT NULL, -- Reference to shared_packages.id
  sessions_remaining integer NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  expiration_date timestamptz,
  paid boolean DEFAULT false,
  package_services jsonb DEFAULT '[]'::jsonb, -- Store remaining services as JSON
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(original_customer_package_id, professional_id)
);

ALTER TABLE shared_customer_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared services
CREATE POLICY "Admins can view all shared services"
  ON shared_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage shared services"
  ON shared_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view their shared services"
  ON shared_services FOR SELECT
  TO authenticated
  USING (
    professional_id = (
      SELECT id FROM professionals
      WHERE email = auth.jwt() ->> 'email'
      AND active = true
    )
  );

-- RLS Policies for shared customers
CREATE POLICY "Admins can view all shared customers"
  ON shared_customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage shared customers"
  ON shared_customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view their shared customers"
  ON shared_customers FOR SELECT
  TO authenticated
  USING (
    professional_id = (
      SELECT id FROM professionals
      WHERE email = auth.jwt() ->> 'email'
      AND active = true
    )
  );

CREATE POLICY "Professionals can update their shared customers"
  ON shared_customers FOR UPDATE
  TO authenticated
  USING (
    professional_id = (
      SELECT id FROM professionals
      WHERE email = auth.jwt() ->> 'email'
      AND active = true
    )
  )
  WITH CHECK (
    professional_id = (
      SELECT id FROM professionals
      WHERE email = auth.jwt() ->> 'email'
      AND active = true
    )
  );

-- RLS Policies for shared packages
CREATE POLICY "Admins can view all shared packages"
  ON shared_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage shared packages"
  ON shared_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view their shared packages"
  ON shared_packages FOR SELECT
  TO authenticated
  USING (
    professional_id = (
      SELECT id FROM professionals
      WHERE email = auth.jwt() ->> 'email'
      AND active = true
    )
  );

-- RLS Policies for shared customer packages
CREATE POLICY "Admins can view all shared customer packages"
  ON shared_customer_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage shared customer packages"
  ON shared_customer_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view their shared customer packages"
  ON shared_customer_packages FOR SELECT
  TO authenticated
  USING (
    professional_id = (
      SELECT id FROM professionals
      WHERE email = auth.jwt() ->> 'email'
      AND active = true
    )
  );

CREATE POLICY "Professionals can update their shared customer packages"
  ON shared_customer_packages FOR UPDATE
  TO authenticated
  USING (
    professional_id = (
      SELECT id FROM professionals
      WHERE email = auth.jwt() ->> 'email'
      AND active = true
    )
  )
  WITH CHECK (
    professional_id = (
      SELECT id FROM professionals
      WHERE email = auth.jwt() ->> 'email'
      AND active = true
    )
  );

-- Functions to populate shared data when professionals are assigned

-- Function to create shared services for a professional
CREATE OR REPLACE FUNCTION create_shared_services_for_professional(p_professional_id UUID)
RETURNS VOID AS $$
DECLARE
  prof_record RECORD;
BEGIN
  -- Get professional info
  SELECT * INTO prof_record FROM professionals WHERE id = p_professional_id;

  -- Insert all active services for this business into shared_services
  INSERT INTO shared_services (
    original_service_id,
    professional_id,
    user_id,
    name,
    description,
    price,
    duration_minutes,
    active
  )
  SELECT
    s.id,
    p_professional_id,
    prof_record.user_id,
    s.name,
    s.description,
    s.price,
    s.duration_minutes,
    s.active
  FROM services s
  WHERE s.user_id = prof_record.user_id
  AND s.active = true
  ON CONFLICT (original_service_id, professional_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create shared customers for a professional
CREATE OR REPLACE FUNCTION create_shared_customers_for_professional(p_professional_id UUID)
RETURNS VOID AS $$
DECLARE
  prof_record RECORD;
BEGIN
  -- Get professional info
  SELECT * INTO prof_record FROM professionals WHERE id = p_professional_id;

  -- Insert all customers assigned to this professional into shared_customers
  INSERT INTO shared_customers (
    original_customer_id,
    professional_id,
    user_id,
    name,
    phone
  )
  SELECT
    c.id,
    p_professional_id,
    prof_record.user_id,
    c.name,
    c.phone
  FROM customers c
  WHERE c.professional_id = p_professional_id
  ON CONFLICT (original_customer_id, professional_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create shared packages for a professional
CREATE OR REPLACE FUNCTION create_shared_packages_for_professional(p_professional_id UUID)
RETURNS VOID AS $$
DECLARE
  prof_record RECORD;
  package_services_data jsonb;
  pkg_id UUID;
  pkg_name TEXT;
  pkg_description TEXT;
  pkg_price DECIMAL(10,2);
  pkg_expires_after_days INTEGER;
  pkg_active BOOLEAN;
BEGIN
  -- Get professional info
  SELECT * INTO prof_record FROM professionals WHERE id = p_professional_id;

  -- For each active package, create shared package with services
  FOR pkg_id, pkg_name, pkg_description, pkg_price, pkg_expires_after_days, pkg_active IN
    SELECT id, name, description, price, expires_after_days, active FROM packages WHERE user_id = prof_record.user_id AND active = true
  LOOP
    -- Get package services as JSON
    SELECT jsonb_agg(
      jsonb_build_object(
        'service_id', ps.service_id,
        'quantity', ps.quantity,
        'service_name', s.name
      )
    ) INTO package_services_data
    FROM package_services ps
    JOIN services s ON ps.service_id = s.id
    WHERE ps.package_id = pkg_id;

    -- Insert shared package
    INSERT INTO shared_packages (
      original_package_id,
      professional_id,
      user_id,
      name,
      description,
      price,
      expires_after_days,
      active,
      package_services
    ) VALUES (
      pkg_id,
      p_professional_id,
      prof_record.user_id,
      pkg_name,
      pkg_description,
      pkg_price,
      pkg_expires_after_days,
      pkg_active,
      COALESCE(package_services_data, '[]'::jsonb)
    )
    ON CONFLICT (original_package_id, professional_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create shared customer packages for a professional
CREATE OR REPLACE FUNCTION create_shared_customer_packages_for_professional(p_professional_id UUID)
RETURNS VOID AS $$
DECLARE
  prof_record RECORD;
  package_services_data jsonb;
  shared_customer_id UUID;
  shared_package_id UUID;
  cp_id UUID;
  cp_customer_id UUID;
  cp_package_id UUID;
  cp_sessions_remaining INTEGER;
  cp_purchase_date TIMESTAMPTZ;
  cp_expiration_date TIMESTAMPTZ;
  cp_paid BOOLEAN;
BEGIN
  -- Get professional info
  SELECT * INTO prof_record FROM professionals WHERE id = p_professional_id;

  -- For each customer package where customer belongs to this professional
  FOR cp_id, cp_customer_id, cp_package_id, cp_sessions_remaining, cp_purchase_date, cp_expiration_date, cp_paid IN
    SELECT cp.id, cp.customer_id, cp.package_id, cp.sessions_remaining, cp.purchase_date, cp.expiration_date, cp.paid
    FROM customer_packages cp
    JOIN customers c ON cp.customer_id = c.id
    WHERE c.professional_id = p_professional_id
  LOOP
    -- Get shared customer ID
    SELECT id INTO shared_customer_id
    FROM shared_customers
    WHERE original_customer_id = cp_customer_id
    AND professional_id = p_professional_id;

    -- Get shared package ID
    SELECT id INTO shared_package_id
    FROM shared_packages
    WHERE original_package_id = cp_package_id
    AND professional_id = p_professional_id;

    -- Get remaining package services as JSON
    SELECT jsonb_agg(
      jsonb_build_object(
        'service_id', cps.service_id,
        'sessions_remaining', cps.sessions_remaining,
        'service_name', s.name
      )
    ) INTO package_services_data
    FROM customer_package_services cps
    JOIN services s ON cps.service_id = s.id
    WHERE cps.customer_package_id = cp_id;

    -- Insert shared customer package
    INSERT INTO shared_customer_packages (
      original_customer_package_id,
      professional_id,
      user_id,
      customer_id,
      package_id,
      sessions_remaining,
      purchase_date,
      expiration_date,
      paid,
      package_services
    ) VALUES (
      cp_id,
      p_professional_id,
      prof_record.user_id,
      shared_customer_id,
      shared_package_id,
      cp_sessions_remaining,
      cp_purchase_date,
      cp_expiration_date,
      cp_paid,
      COALESCE(package_services_data, '[]'::jsonb)
    )
    ON CONFLICT (original_customer_package_id, professional_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to populate all shared data for a professional
CREATE OR REPLACE FUNCTION populate_shared_data_for_professional(p_professional_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM create_shared_services_for_professional(p_professional_id);
  PERFORM create_shared_customers_for_professional(p_professional_id);
  PERFORM create_shared_packages_for_professional(p_professional_id);
  PERFORM create_shared_customer_packages_for_professional(p_professional_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_services_professional_id ON shared_services(professional_id);
CREATE INDEX IF NOT EXISTS idx_shared_services_original_id ON shared_services(original_service_id);
CREATE INDEX IF NOT EXISTS idx_shared_customers_professional_id ON shared_customers(professional_id);
CREATE INDEX IF NOT EXISTS idx_shared_customers_original_id ON shared_customers(original_customer_id);
CREATE INDEX IF NOT EXISTS idx_shared_packages_professional_id ON shared_packages(professional_id);
CREATE INDEX IF NOT EXISTS idx_shared_packages_original_id ON shared_packages(original_package_id);
CREATE INDEX IF NOT EXISTS idx_shared_customer_packages_professional_id ON shared_customer_packages(professional_id);
CREATE INDEX IF NOT EXISTS idx_shared_customer_packages_original_id ON shared_customer_packages(original_customer_package_id);