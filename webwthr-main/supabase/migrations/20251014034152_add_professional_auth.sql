-- Add email and password fields to professionals table
ALTER TABLE professionals
ADD COLUMN email TEXT UNIQUE,
ADD COLUMN password_hash TEXT,
ADD COLUMN role TEXT DEFAULT 'professional' CHECK (role IN ('professional', 'admin'));

-- Create index on email for faster lookups
CREATE INDEX idx_professionals_email ON professionals(email);

-- Update existing professionals to have admin role (assuming they are created by admins)
UPDATE professionals SET role = 'admin' WHERE user_id IS NOT NULL;

-- Create a view for professional authentication
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

-- Create function to authenticate professionals
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

-- Create function to create professional with password
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

-- Create function to update professional password
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