-- Adicionar campos faltantes na tabela whatsapp_agent_config
ALTER TABLE whatsapp_agent_config
ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT 'Olá! Sou o assistente virtual. Como posso ajudar você hoje? Posso agendar um horário, informar sobre serviços ou tirar dúvidas.',
ADD COLUMN IF NOT EXISTS default_response text DEFAULT 'Obrigado pela mensagem! Estou aqui para ajudar com agendamentos, informações sobre serviços ou dúvidas gerais. Como posso te ajudar melhor?',
ADD COLUMN IF NOT EXISTS gemini_prompt text DEFAULT 'Você é um assistente virtual amigável para um negócio de serviços.
Seja útil, educado e ajude os clientes com informações sobre agendamentos, serviços e preços.
Mantenha as respostas concisas e profissionais.
Se não souber algo específico, sugira que o cliente entre em contato diretamente.';