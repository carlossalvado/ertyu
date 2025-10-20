-- Function to update professional email and password
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