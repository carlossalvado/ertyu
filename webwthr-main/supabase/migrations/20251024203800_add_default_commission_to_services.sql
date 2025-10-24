-- Add default_commission column to services table
ALTER TABLE services
ADD COLUMN default_commission numeric(5,2) DEFAULT 0.00 CHECK (default_commission >= 0 AND default_commission <= 100);

-- Add comment to explain the column
COMMENT ON COLUMN services.default_commission IS 'Default commission percentage for professionals on this service (0-100)';