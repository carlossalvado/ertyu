-- Create professional_commissions table to track paid commissions
CREATE TABLE IF NOT EXISTS professional_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    appointment_service_id UUID NOT NULL REFERENCES appointment_services(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_price DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Ensure one commission per appointment service
    UNIQUE(appointment_service_id)
);

-- Add RLS policies
ALTER TABLE professional_commissions ENABLE ROW LEVEL SECURITY;

-- Policy for users to see only their own commissions
CREATE POLICY "Users can view their own professional commissions" ON professional_commissions
    FOR SELECT USING (user_id = auth.uid());

-- Policy for users to insert their own commissions
CREATE POLICY "Users can insert their own professional commissions" ON professional_commissions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own commissions
CREATE POLICY "Users can update their own professional commissions" ON professional_commissions
    FOR UPDATE USING (user_id = auth.uid());

-- Policy for users to delete their own commissions
CREATE POLICY "Users can delete their own professional commissions" ON professional_commissions
    FOR DELETE USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_professional_commissions_professional_id ON professional_commissions(professional_id);
CREATE INDEX idx_professional_commissions_appointment_id ON professional_commissions(appointment_id);
CREATE INDEX idx_professional_commissions_user_id ON professional_commissions(user_id);
CREATE INDEX idx_professional_commissions_paid_at ON professional_commissions(paid_at);

-- Function to automatically create commission record when appointment is completed
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

-- Create trigger to automatically create commission when appointment is completed
CREATE TRIGGER trigger_create_professional_commission
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_professional_commission();