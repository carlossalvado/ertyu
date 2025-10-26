-- Corrigir a função create_professional_commission
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

-- Verificar se o trigger existe e recriá-lo se necessário
DROP TRIGGER IF EXISTS trigger_create_professional_commission ON appointments;
CREATE TRIGGER trigger_create_professional_commission
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_professional_commission();