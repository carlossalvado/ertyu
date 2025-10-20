-- Add RLS policies for professional access to all tables
-- This allows professionals to access data where professional_id matches their own ID

-- First, create a function to get professional ID from JWT
CREATE OR REPLACE FUNCTION get_professional_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM professionals
    WHERE email = auth.jwt() ->> 'email'
    AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Services table - professionals can view services assigned to them
CREATE POLICY "Professionals can view their assigned services"
  ON services FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professional_services ps
      WHERE ps.service_id = services.id
      AND ps.professional_id = get_professional_id()
    )
  );

-- Customers table - professionals can view/edit their assigned customers
CREATE POLICY "Professionals can view their customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    professional_id = get_professional_id()
  );

CREATE POLICY "Professionals can update their customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    professional_id = get_professional_id()
  )
  WITH CHECK (
    professional_id = get_professional_id()
  );

-- Packages table - professionals can view packages from their business
CREATE POLICY "Professionals can view packages from their business"
  ON packages FOR SELECT
  TO authenticated
  USING (
    user_id = (
      SELECT user_id FROM professionals WHERE id = get_professional_id()
    )
  );

-- Package services table - professionals can view package services for packages they can access
CREATE POLICY "Professionals can view package services"
  ON package_services FOR SELECT
  TO authenticated
  USING (
    package_id IN (
      SELECT id FROM packages WHERE user_id = (
        SELECT user_id FROM professionals WHERE id = get_professional_id()
      )
    )
  );

-- Customer packages table - professionals can view/manage customer packages for their customers
CREATE POLICY "Professionals can view customer packages"
  ON customer_packages FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE professional_id = get_professional_id()
    )
  );

CREATE POLICY "Professionals can insert customer packages"
  ON customer_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE professional_id = get_professional_id()
    )
  );

CREATE POLICY "Professionals can update customer packages"
  ON customer_packages FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE professional_id = get_professional_id()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE professional_id = get_professional_id()
    )
  );

CREATE POLICY "Professionals can delete customer packages"
  ON customer_packages FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE professional_id = get_professional_id()
    )
  );

-- Customer package services table - professionals can view/manage services for their customer packages
CREATE POLICY "Professionals can view customer package services"
  ON customer_package_services FOR SELECT
  TO authenticated
  USING (
    customer_package_id IN (
      SELECT id FROM customer_packages WHERE customer_id IN (
        SELECT id FROM customers WHERE professional_id = get_professional_id()
      )
    )
  );

CREATE POLICY "Professionals can insert customer package services"
  ON customer_package_services FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_package_id IN (
      SELECT id FROM customer_packages WHERE customer_id IN (
        SELECT id FROM customers WHERE professional_id = get_professional_id()
      )
    )
  );

CREATE POLICY "Professionals can update customer package services"
  ON customer_package_services FOR UPDATE
  TO authenticated
  USING (
    customer_package_id IN (
      SELECT id FROM customer_packages WHERE customer_id IN (
        SELECT id FROM customers WHERE professional_id = get_professional_id()
      )
    )
  )
  WITH CHECK (
    customer_package_id IN (
      SELECT id FROM customer_packages WHERE customer_id IN (
        SELECT id FROM customers WHERE professional_id = get_professional_id()
      )
    )
  );

CREATE POLICY "Professionals can delete customer package services"
  ON customer_package_services FOR DELETE
  TO authenticated
  USING (
    customer_package_id IN (
      SELECT id FROM customer_packages WHERE customer_id IN (
        SELECT id FROM customers WHERE professional_id = get_professional_id()
      )
    )
  );

-- Appointments table - professionals can view/edit their appointments
CREATE POLICY "Professionals can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    professional_id = get_professional_id()
  );

CREATE POLICY "Professionals can insert their appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id = get_professional_id()
  );

CREATE POLICY "Professionals can update their appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    professional_id = get_professional_id()
  )
  WITH CHECK (
    professional_id = get_professional_id()
  );

CREATE POLICY "Professionals can delete their appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (
    professional_id = get_professional_id()
  );

-- Appointment services table - professionals can view/manage services for their appointments
CREATE POLICY "Professionals can view appointment services"
  ON appointment_services FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE professional_id = get_professional_id()
    )
  );

CREATE POLICY "Professionals can insert appointment services"
  ON appointment_services FOR INSERT
  TO authenticated
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM appointments WHERE professional_id = get_professional_id()
    )
  );

CREATE POLICY "Professionals can update appointment services"
  ON appointment_services FOR UPDATE
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE professional_id = get_professional_id()
    )
  )
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM appointments WHERE professional_id = get_professional_id()
    )
  );

CREATE POLICY "Professionals can delete appointment services"
  ON appointment_services FOR DELETE
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE professional_id = get_professional_id()
    )
  );

-- Chat messages table - professionals can view chat messages for their customers
CREATE POLICY "Professionals can view chat messages for their customers"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    customer_phone IN (
      SELECT phone FROM customers WHERE professional_id = get_professional_id()
    )
  );

CREATE POLICY "Professionals can insert chat messages for their customers"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_phone IN (
      SELECT phone FROM customers WHERE professional_id = get_professional_id()
    )
  );

-- Professional services table - professionals can view their service assignments
CREATE POLICY "Professionals can view their service assignments"
  ON professional_services FOR SELECT
  TO authenticated
  USING (
    professional_id = get_professional_id()
  );

-- Allow professionals to manage their own profile
CREATE POLICY "Professionals can view their own profile"
  ON professionals FOR SELECT
  TO authenticated
  USING (
    id = get_professional_id()
  );

CREATE POLICY "Professionals can update their own profile"
  ON professionals FOR UPDATE
  TO authenticated
  USING (
    id = get_professional_id()
  )
  WITH CHECK (
    id = get_professional_id()
  );