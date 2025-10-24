-- Add commission column to professional_services table
ALTER TABLE professional_services
ADD COLUMN commission numeric(5,2) DEFAULT 0.00 CHECK (commission >= 0 AND commission <= 100);

-- Add comment to explain the column
COMMENT ON COLUMN professional_services.commission IS 'Commission percentage for the professional on this service (0-100)';