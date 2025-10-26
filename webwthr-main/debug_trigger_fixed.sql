-- Verificar se a tabela appointment_services tem a coluna professional_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointment_services'
ORDER BY ordinal_position;

-- Verificar estrutura da tabela appointment_services (usando information_schema)
SELECT
    'appointment_services' as table_name,
    string_agg(column_name || ' ' || data_type || CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END, ', ') as columns
FROM information_schema.columns
WHERE table_name = 'appointment_services'
GROUP BY table_name;

-- Verificar se existem triggers na tabela appointments
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments';

-- Verificar a função create_professional_commission atual
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'create_professional_commission';

-- Testar uma query simples para ver se funciona
SELECT
    aps.id,
    aps.appointment_id,
    aps.service_id,
    aps.price,
    a.professional_id,
    a.status
FROM appointment_services aps
JOIN appointments a ON aps.appointment_id = a.id
WHERE a.id = 'a857fbe7-f731-4f5c-a090-dc841c93c47d';

-- Verificar se existem registros na tabela professional_commissions
SELECT * FROM professional_commissions LIMIT 5;