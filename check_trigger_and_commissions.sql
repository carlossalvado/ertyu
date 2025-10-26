-- Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_professional_commission';

-- Check current commissions
SELECT
  pc.id,
  pc.professional_id,
  pc.appointment_service_id,
  pc.appointment_id,
  pc.service_price,
  pc.commission_percentage,
  pc.commission_amount,
  pc.paid_at,
  pc.created_at,
  p.name as professional_name,
  a.customer_name,
  s.name as service_name
FROM professional_commissions pc
JOIN professionals p ON pc.professional_id = p.id
JOIN appointments a ON pc.appointment_id = a.id
JOIN appointment_services aps ON pc.appointment_service_id = aps.id
JOIN services s ON aps.service_id = s.id
ORDER BY pc.created_at DESC;

-- Get appointments with status 'completed' that should have commissions
SELECT
  a.id,
  a.customer_name,
  a.status,
  a.total_price,
  a.appointment_date,
  a.professional_id,
  p.name as professional_name,
  COUNT(aps.id) as services_count
FROM appointments a
LEFT JOIN professionals p ON a.professional_id = p.id
LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
WHERE a.status = 'completed'
GROUP BY a.id, a.customer_name, a.status, a.total_price, a.appointment_date, a.professional_id, p.name
ORDER BY a.appointment_date DESC;

-- Manual commission creation for existing completed appointments (run this if needed)
-- This will create commissions for appointments that are already completed but don't have commissions yet
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
    a.professional_id AS professional_id,
    aps.id AS appointment_service_id,
    a.id AS appointment_id,
    aps.price AS service_price,
    COALESCE(ps.commission, 0) AS commission_percentage,
    (aps.price * COALESCE(ps.commission, 0) / 100) AS commission_amount,
    a.appointment_date AS paid_at,
    a.user_id
FROM appointments a
JOIN appointment_services aps ON a.id = aps.appointment_id
LEFT JOIN professional_services ps
  ON aps.service_id = ps.service_id
  AND ps.professional_id = a.professional_id
WHERE a.status = 'completed'
AND NOT EXISTS (
    SELECT 1 FROM professional_commissions pc
    WHERE pc.appointment_service_id = aps.id
)
ON CONFLICT (appointment_service_id) DO NOTHING;