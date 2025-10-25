-- Populate historical commissions for existing completed appointments
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
    COALESCE(aps.professional_id, a.professional_id) AS professional_id,
    aps.id,
    aps.appointment_id,
    aps.price,
    COALESCE(ps.commission, 0),
    (aps.price * COALESCE(ps.commission, 0) / 100),
    a.appointment_date,
    a.user_id
FROM appointment_services aps
JOIN appointments a ON aps.appointment_id = a.id
LEFT JOIN professional_services ps ON aps.service_id = ps.service_id AND ps.professional_id = COALESCE(aps.professional_id, a.professional_id)
WHERE a.status = 'completed'
AND COALESCE(aps.professional_id, a.professional_id) IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM professional_commissions pc
    WHERE pc.appointment_service_id = aps.id
)
ON CONFLICT (appointment_service_id) DO NOTHING;