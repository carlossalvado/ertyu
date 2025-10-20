-- Create shared appointment data table for professionals
-- This table will store appointment-related data that both admins and assigned professionals can access

CREATE TABLE IF NOT EXISTS shared_appointment_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  appointment_date timestamptz NOT NULL,
  status text DEFAULT 'pending',
  total_price decimal(10,2) DEFAULT 0,
  notes text DEFAULT '',
  services jsonb DEFAULT '[]'::jsonb, -- Store services as JSON array
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(appointment_id, professional_id)
);

ALTER TABLE shared_appointment_data ENABLE ROW LEVEL SECURITY;

-- Policies for shared appointment data
-- Admins can access all shared data
CREATE POLICY "Admins can view all shared appointment data"
  ON shared_appointment_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert shared appointment data"
  ON shared_appointment_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update shared appointment data"
  ON shared_appointment_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete shared appointment data"
  ON shared_appointment_data FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Professionals can access their own shared data
CREATE POLICY "Professionals can view their shared appointment data"
  ON shared_appointment_data FOR SELECT
  TO authenticated
  USING (
    professional_id = (
      SELECT id FROM professionals
      WHERE email = auth.jwt() ->> 'email'
      AND active = true
    )
  );

CREATE POLICY "Professionals can update their shared appointment data"
  ON shared_appointment_data FOR UPDATE
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

-- Function to automatically create shared appointment data when appointment is created
CREATE OR REPLACE FUNCTION create_shared_appointment_data()
RETURNS TRIGGER AS $$
DECLARE
  services_data jsonb := '[]'::jsonb;
BEGIN
  -- Get services data for this appointment
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'price', COALESCE(aps.price, s.price),
      'duration_minutes', s.duration_minutes,
      'used_package_session', COALESCE(aps.used_package_session, false)
    )
  ) INTO services_data
  FROM appointment_services aps
  JOIN services s ON aps.service_id = s.id
  WHERE aps.appointment_id = NEW.id;

  -- Create shared data record
  INSERT INTO shared_appointment_data (
    appointment_id,
    professional_id,
    customer_name,
    customer_phone,
    appointment_date,
    status,
    total_price,
    notes,
    services
  ) VALUES (
    NEW.id,
    NEW.professional_id,
    NEW.customer_name,
    NEW.customer_phone,
    NEW.appointment_date,
    NEW.status,
    NEW.total_price,
    NEW.notes,
    COALESCE(services_data, '[]'::jsonb)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update shared appointment data when appointment is updated
CREATE OR REPLACE FUNCTION update_shared_appointment_data()
RETURNS TRIGGER AS $$
DECLARE
  services_data jsonb := '[]'::jsonb;
BEGIN
  -- Get updated services data for this appointment
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'price', COALESCE(aps.price, s.price),
      'duration_minutes', s.duration_minutes,
      'used_package_session', COALESCE(aps.used_package_session, false)
    )
  ) INTO services_data
  FROM appointment_services aps
  JOIN services s ON aps.service_id = s.id
  WHERE aps.appointment_id = NEW.id;

  -- Update shared data record
  UPDATE shared_appointment_data SET
    customer_name = NEW.customer_name,
    customer_phone = NEW.customer_phone,
    appointment_date = NEW.appointment_date,
    status = NEW.status,
    total_price = NEW.total_price,
    notes = NEW.notes,
    services = COALESCE(services_data, '[]'::jsonb),
    updated_at = now()
  WHERE appointment_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete shared appointment data when appointment is deleted
CREATE OR REPLACE FUNCTION delete_shared_appointment_data()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM shared_appointment_data WHERE appointment_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_create_shared_appointment_data
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION create_shared_appointment_data();

CREATE TRIGGER trigger_update_shared_appointment_data
  AFTER UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_shared_appointment_data();

CREATE TRIGGER trigger_delete_shared_appointment_data
  AFTER DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION delete_shared_appointment_data();

-- Also trigger updates when appointment_services change
CREATE OR REPLACE FUNCTION update_shared_data_on_service_change()
RETURNS TRIGGER AS $$
DECLARE
  services_data jsonb := '[]'::jsonb;
BEGIN
  -- Get updated services data for the appointment
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'price', COALESCE(aps.price, s.price),
      'duration_minutes', s.duration_minutes,
      'used_package_session', COALESCE(aps.used_package_session, false)
    )
  ) INTO services_data
  FROM appointment_services aps
  JOIN services s ON aps.service_id = s.id
  WHERE aps.appointment_id = COALESCE(NEW.appointment_id, OLD.appointment_id);

  -- Update shared data record
  UPDATE shared_appointment_data SET
    services = COALESCE(services_data, '[]'::jsonb),
    updated_at = now()
  WHERE appointment_id = COALESCE(NEW.appointment_id, OLD.appointment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_shared_data_on_service_insert
  AFTER INSERT ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION update_shared_data_on_service_change();

CREATE TRIGGER trigger_update_shared_data_on_service_update
  AFTER UPDATE ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION update_shared_data_on_service_change();

CREATE TRIGGER trigger_update_shared_data_on_service_delete
  AFTER DELETE ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION update_shared_data_on_service_change();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_appointment_data_appointment_id ON shared_appointment_data(appointment_id);
CREATE INDEX IF NOT EXISTS idx_shared_appointment_data_professional_id ON shared_appointment_data(professional_id);
CREATE INDEX IF NOT EXISTS idx_shared_appointment_data_date ON shared_appointment_data(appointment_date);