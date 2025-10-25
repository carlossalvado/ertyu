-- Script SQL para criar a tabela professional_commissions e popular dados históricos
-- Execute este script diretamente no SQL Editor do Supabase Dashboard

-- Criar tabela professional_commissions
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

    -- Garantir uma comissão por serviço de agendamento
    UNIQUE(appointment_service_id)
);

-- Adicionar políticas RLS
ALTER TABLE professional_commissions ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem suas próprias comissões
CREATE POLICY "Users can view their own professional commissions" ON professional_commissions
    FOR SELECT USING (user_id = auth.uid());

-- Política para usuários inserirem suas próprias comissões
CREATE POLICY "Users can insert their own professional commissions" ON professional_commissions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política para usuários atualizarem suas próprias comissões
CREATE POLICY "Users can update their own professional commissions" ON professional_commissions
    FOR UPDATE USING (user_id = auth.uid());

-- Política para usuários deletarem suas próprias comissões
CREATE POLICY "Users can delete their own professional commissions" ON professional_commissions
    FOR DELETE USING (user_id = auth.uid());

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_professional_commissions_professional_id ON professional_commissions(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_commissions_appointment_id ON professional_commissions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_professional_commissions_user_id ON professional_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_commissions_paid_at ON professional_commissions(paid_at);

-- Função para criar automaticamente registro de comissão quando agendamento é concluído
CREATE OR REPLACE FUNCTION create_professional_commission()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar comissão apenas se status do agendamento mudou para 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Inserir registros de comissão para cada serviço no agendamento
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
            -- appointment_services não armazena professional_id diretamente;
            -- usar o professional do agendamento (NEW.professional_id)
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

-- Criar trigger para criar comissão automaticamente quando agendamento é concluído
CREATE TRIGGER trigger_create_professional_commission
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_professional_commission();

-- Popular comissões históricas para agendamentos já concluídos
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
    a.professional_id,
    aps.id,
    aps.appointment_id,
    aps.price,
    COALESCE(ps.commission, 0),
    (aps.price * COALESCE(ps.commission, 0) / 100),
    a.appointment_date,
    a.user_id
FROM appointment_services aps
JOIN appointments a ON aps.appointment_id = a.id
LEFT JOIN professional_services ps ON aps.service_id = ps.service_id AND ps.professional_id = a.professional_id
WHERE a.status = 'completed'
AND a.professional_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM professional_commissions pc
    WHERE pc.appointment_service_id = aps.id
)
ON CONFLICT (appointment_service_id) DO NOTHING;