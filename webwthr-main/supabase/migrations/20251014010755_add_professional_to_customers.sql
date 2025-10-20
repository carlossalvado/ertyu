/*
  # Add Professional Assignment to Customers

  ## Modified Tables

  ### `customers`
  - Add `professional_id` (uuid, foreign key) - Assigned professional for this customer
*/

-- Add professional_id to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES professionals(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_professional_id ON customers(professional_id);