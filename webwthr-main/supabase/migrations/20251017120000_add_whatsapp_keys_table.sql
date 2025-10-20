-- Tabela global para configurações do WhatsApp Business API (chave única compartilhada)
create table if not exists whatsapp_global_config (
  id uuid primary key default gen_random_uuid(),
  api_key_encrypted text not null,
  phone_number_id text not null,
  business_account_id text,
  webhook_verify_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Apenas uma configuração global (única linha)
create unique index if not exists idx_whatsapp_global_config_singleton on whatsapp_global_config((true));

-- Trigger to update updated_at
create or replace function set_updated_at_whatsapp_global_config()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_set_updated_at_whatsapp_global_config
before update on whatsapp_global_config
for each row
execute function set_updated_at_whatsapp_global_config();

-- Tabela para configurações do agente WhatsApp por usuário
create table if not exists whatsapp_agent_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  agent_enabled boolean default false,
  is_connected boolean default false,
  whatsapp_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_agent_config_user foreign key (user_id) references users(id) on delete cascade
);

create index if not exists idx_whatsapp_agent_config_user_id on whatsapp_agent_config(user_id);

-- Trigger to update updated_at
create or replace function set_updated_at_whatsapp_agent_config()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_set_updated_at_whatsapp_agent_config
before update on whatsapp_agent_config
for each row
execute function set_updated_at_whatsapp_agent_config();

-- Políticas RLS para whatsapp_global_config (apenas admin pode acessar)
alter table whatsapp_global_config enable row level security;

create policy "Only authenticated users can read global config"
on whatsapp_global_config for select using (auth.role() = 'authenticated');

create policy "Only service role can modify global config"
on whatsapp_global_config for all using (auth.role() = 'service_role');

-- Políticas RLS para whatsapp_agent_config
alter table whatsapp_agent_config enable row level security;

create policy "Users can only access their own agent config"
on whatsapp_agent_config for all using (auth.uid() = user_id);
