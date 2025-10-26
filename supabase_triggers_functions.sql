-- =============================================================================
-- FUNCTIONS AND TRIGGERS FOR SUPABASE
-- =============================================================================

-- Function to authenticate professionals
CREATE OR REPLACE FUNCTION authenticate_professional(p_email TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  specialty TEXT,
  role TEXT
) AS $$
DECLARE
  professional_record RECORD;
BEGIN
  -- Find professional by email
  SELECT p.* INTO professional_record
  FROM professionals p
  WHERE p.email = p_email AND p.active = true;

  -- Check if professional exists and password matches
  IF professional_record.id IS NOT NULL AND
     professional_record.password_hash = crypt(p_password, professional_record.password_hash) THEN
    RETURN QUERY SELECT
      professional_record.id,
      professional_record.name,
      professional_record.specialty,
      professional_record.role;
  END IF;

  -- Return empty result if authentication fails
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create professional with password
CREATE OR REPLACE FUNCTION create_professional_with_auth(
  p_user_id UUID,
  p_name TEXT,
  p_specialty TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT DEFAULT 'professional'
) RETURNS UUID AS $$
DECLARE
  new_professional_id UUID;
BEGIN
  -- Hash the password
  INSERT INTO professionals (user_id, name, specialty, email, password_hash, role, active)
  VALUES (p_user_id, p_name, p_specialty, p_email, crypt(p_password, gen_salt('bf')), p_role, true)
  RETURNING id INTO new_professional_id;

  RETURN new_professional_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update professional password
CREATE OR REPLACE FUNCTION update_professional_password(
  p_professional_id UUID,
  p_new_password TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE professionals
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_professional_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update professional credentials
CREATE OR REPLACE FUNCTION update_professional_credentials(
  p_professional_id UUID,
  p_email TEXT,
  p_password TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  email_exists BOOLEAN;
BEGIN
  -- Check if email is already used by another professional
  SELECT EXISTS(
    SELECT 1 FROM professionals
    WHERE email = p_email AND id != p_professional_id
  ) INTO email_exists;

  IF email_exists THEN
    RAISE EXCEPTION 'Email já está em uso por outro profissional';
  END IF;

  -- Update email and password hash
  UPDATE professionals
  SET
    email = p_email,
    password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = p_professional_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functions for shared data management
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

CREATE OR REPLACE FUNCTION populate_shared_data_for_professional(p_professional_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM create_shared_services_for_professional(p_professional_id);
  PERFORM create_shared_customers_for_professional(p_professional_id);
  PERFORM create_shared_packages_for_professional(p_professional_id);
  PERFORM create_shared_customer_packages_for_professional(p_professional_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Function to create shared appointment data when appointment is created
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

-- Function to update shared data on service changes
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

-- Function to create commission record when appointment is completed
CREATE OR REPLACE FUNCTION create_professional_commission()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create commission if appointment status changed to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Insert commission records for each service in the appointment
        INSERT INTO professional_commissions (
            professional_id,
            appointment_service_id,
            appointment_id,
            service_price,
            commission_percentage,
            commission_amount,
            paid_at,
            user_id
        )
        SELECT
            -- Use appointment's professional_id since appointment_services doesn't have professional_id
            NEW.professional_id AS professional_id,
            aps.id AS appointment_service_id,
            NEW.id AS appointment_id,
            aps.price AS service_price,
            COALESCE(ps.commission, 0) AS commission_percentage,
            (aps.price * COALESCE(ps.commission, 0) / 100) AS commission_amount,
            NEW.appointment_date AS paid_at,
            NEW.user_id
        FROM appointment_services aps
        LEFT JOIN professional_services ps
          ON aps.service_id = ps.service_id
          AND ps.professional_id = NEW.professional_id
        WHERE aps.appointment_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trigger_update_shared_data_on_service_insert
  AFTER INSERT ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION update_shared_data_on_service_change();

CREATE TRIGGER trigger_update_shared_data_on_service_update
  AFTER UPDATE ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION update_shared_data_on_service_change();

CREATE TRIGGER trigger_update_shared_data_on_service_delete
  AFTER DELETE ON appointment_services
  FOR EACH ROW EXECUTE FUNCTION update_shared_data_on_service_change();

CREATE TRIGGER trigger_create_professional_commission
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_professional_commission();