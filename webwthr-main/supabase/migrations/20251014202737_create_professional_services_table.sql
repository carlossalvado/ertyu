-- Create professional_services table to assign services to professionals
CREATE TABLE IF NOT EXISTS professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(professional_id, service_id)
);

ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their professionals' services
CREATE POLICY "Users can view professional services for their professionals"
  ON professional_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = professional_services.professional_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert professional services for their professionals"
  ON professional_services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = professional_services.professional_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete professional services for their professionals"
  ON professional_services FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.id = professional_services.professional_id
      AND p.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_professional_services_professional_id ON professional_services(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_services_service_id ON professional_services(service_id);