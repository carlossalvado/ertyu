import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

// Funções para configuração global do WhatsApp
export async function saveGlobalWhatsAppConfig(encryptedApiKey: string, phoneNumberId: string, businessAccountId?: string, webhookVerifyToken?: string) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_global_config')
    .upsert({
      api_key_encrypted: encryptedApiKey,
      phone_number_id: phoneNumberId,
      business_account_id: businessAccountId,
      webhook_verify_token: webhookVerifyToken
    }, { onConflict: '((true))' }); // Conflito na restrição singleton

  if (error) throw error;
  return data;
}

export async function getGlobalWhatsAppConfig() {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_global_config')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Funções para configurações por usuário (UltraMsg)
export async function saveEncryptedKey(userId: string, encrypted: string) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_keys')
    .upsert({
      user_id: userId,
      api_key_encrypted: encrypted,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) throw error;
  return data;
}

export async function getEncryptedKey(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_keys')
    .select('api_key_encrypted')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.api_key_encrypted || null;
}
