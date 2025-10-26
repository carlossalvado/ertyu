-- Debug script to check commissions data

-- 1. Check if appointments exist with status 'completed'
SELECT
  id,
  customer_name,
  status,
  total_price,
  appointment_date,
  professional_id,
  user_id
FROM appointments
WHERE status = 'completed'
ORDER BY appointment_date DESC;

-- 2. Check appointment_services for completed appointments
SELECT
  aps.id,
  aps.appointment_id,
  aps.service_id,
  aps.price,
  s.name as service_name,
  a.customer_name,
  a.status,
  a.professional_id
FROM appointment_services aps
JOIN appointments a ON aps.appointment_id = a.id
JOIN services s ON aps.service_id = s.id
WHERE a.status = 'completed'
ORDER BY a.appointment_date DESC;

-- 3. Check professional_services assignments
SELECT
  ps.professional_id,
  ps.service_id,
  ps.commission,
  p.name as professional_name,
  s.name as service_name
FROM professional_services ps
JOIN professionals p ON ps.professional_id = p.id
JOIN services s ON ps.service_id = s.id
ORDER BY p.name, s.name;

-- 4. Check if commissions were created
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

-- 5. Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_professional_commission';

-- 6. Check if function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'create_professional_commission'
AND routine_type = 'FUNCTION';

-- 7. Manual trigger test - simulate appointment completion
-- (Uncomment and modify the appointment_id below to test)
-- UPDATE appointments
-- SET status = 'completed'
-- WHERE id = 'your-appointment-id-here';