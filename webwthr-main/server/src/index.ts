import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { encrypt, decrypt } from './crypto';
import { saveEncryptedKey, getEncryptedKey, saveGlobalWhatsAppConfig, getGlobalWhatsAppConfig } from './store';
import { supabaseAdmin } from './store';
import axios from 'axios';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// WAHA API configuration
const WAHA_API_BASE = 'http://localhost:3001';

dotenv.config();

// Google Gemini AI setup
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Gerenciamento de sessões WhatsApp por usuário
const whatsappSessions = new Map<string, Client>();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY_BASE64!;

// Auth middleware: validates supabase access token
app.use(async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  try {
    // Validate token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Add user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Erro na validação do token:', error);
    res.status(401).json({ error: 'Erro na autenticação' });
  }
});

// Endpoint para iniciar sessão WhatsApp do usuário usando WAHA
app.post('/api/whatsapp/start-session', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const sessionName = `user_${userId}`;

    // Verificar se já existe uma sessão ativa
    if (whatsappSessions.has(sessionName)) {
      return res.status(400).json({ error: 'Sessão já está ativa' });
    }

    // Iniciar sessão usando WAHA API
    const wahaResponse = await axios.post(`${WAHA_API_BASE}/api/sessions/start`, {
      name: sessionName,
      config: {
        webhooks: [
          {
            url: `${process.env.BASE_URL || 'http://localhost:4000'}/webhook/whatsapp`,
            events: ['message', 'session.status']
          }
        ]
      }
    });

    if (wahaResponse.data.success) {
      // Criar cliente WhatsApp para o usuário (para compatibilidade)
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionName,
          dataPath: path.join(__dirname, '../sessions', sessionName)
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });

      // Armazenar sessão
      whatsappSessions.set(sessionName, client);

      // Configurar eventos
      client.on('qr', async (qr) => {
        try {
          // Gerar QR code como base64
          const qrCodeDataURL = await qrcode.toDataURL(qr);

          // Salvar QR code na sessão do usuário
          await supabaseAdmin
            .from('users')
            .update({
              whatsapp_connected: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        } catch (error) {
          console.error('Erro gerando QR code:', error);
        }
      });

      client.on('ready', async () => {
        console.log(`WhatsApp conectado para usuário ${userId}`);

        // Atualizar status de conexão
        await supabaseAdmin
          .from('users')
          .update({
            whatsapp_connected: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        // Configurar agente IA
        await supabaseAdmin
          .from('whatsapp_agent_config')
          .upsert({
            user_id: userId,
            agent_enabled: true,
            updated_at: new Date().toISOString()
          });
      });

      client.on('message', async (message) => {
        try {
          // Processar mensagem recebida
          await processIncomingMessage(message, userId);
        } catch (error) {
          console.error('Erro processando mensagem:', error);
        }
      });

      client.on('disconnected', async (reason) => {
        console.log(`WhatsApp desconectado para usuário ${userId}:`, reason);

        // Atualizar status
        await supabaseAdmin
          .from('users')
          .update({
            whatsapp_connected: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      });

      // Inicializar cliente
      await client.initialize();

      res.json({
        ok: true,
        sessionName,
        message: 'Sessão WhatsApp iniciada. Aguarde o QR code.'
      });
    } else {
      throw new Error('Falha ao iniciar sessão WAHA');
    }

  } catch (err: any) {
    console.error('Erro iniciando sessão:', err);
    res.status(500).json({ error: err.message || 'Erro ao iniciar sessão' });
  }
});

// Endpoint para obter QR code do usuário usando WAHA
app.get('/api/whatsapp/qr', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const sessionName = `user_${userId}`;

    // Obter QR code da sessão WAHA
    const wahaResponse = await axios.get(`${WAHA_API_BASE}/api/sessions/${sessionName}/qr`);

    if (wahaResponse.data) {
      // Gerar QR code como base64
      const qrCodeDataURL = await qrcode.toDataURL(wahaResponse.data.qr);

      res.json({
        qrCode: qrCodeDataURL,
        connected: wahaResponse.data.status === 'WORKING'
      });
    } else {
      // Fallback para dados do banco
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('whatsapp_connected')
        .eq('id', userId)
        .single();

      res.json({
        qrCode: null,
        connected: user?.whatsapp_connected || false
      });
    }

  } catch (err: any) {
    console.error('Erro obtendo QR code:', err);

    // Fallback para dados do banco
    try {
      const userId = req.user.id;
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('whatsapp_connected')
        .eq('id', userId)
        .single();

      res.json({
        qrCode: null,
        connected: user?.whatsapp_connected || false
      });
    } catch (fallbackErr) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

app.post('/api/whatsapp/test', async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    // Buscar configurações do usuário
    const { data: userConfig } = await supabaseAdmin
      .from('whatsapp_keys')
      .select('instance_id, api_token_encrypted')
      .eq('user_id', userId)
      .single();

    if (!userConfig || !userConfig.api_token_encrypted) {
      return res.status(404).json({ error: 'Configuração UltraMsg não encontrada para o usuário' });
    }

    const apiKey = decrypt(userConfig.api_token_encrypted, ENCRYPTION_KEY);

    // Testar conexão usando UltraMsg API com instância do usuário
    const ultramsgUrl = `${process.env.ULTRAMSG_API_BASE}/${userConfig.instance_id}/messages/chat?token=${apiKey}`;
    const payload = {
      to: process.env.WHATSAPP_TEST_TO || '1234567890',
      body: 'Teste de conexão - WhatsApp AI Agent'
    };

    const resp = await axios.post(ultramsgUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Atualizar status de conexão
    await supabaseAdmin
      .from('whatsapp_agent_config')
      .update({ is_connected: true })
      .eq('user_id', userId);

    res.json({ ok: true, whatsapp: resp.data });
  } catch (err: any) {
    console.error('Erro no teste de envio:', err?.response?.data || err.message || err);

    // Atualizar status de conexão como desconectado
    await supabaseAdmin
      .from('whatsapp_agent_config')
      .update({ is_connected: false })
      .eq('user_id', req.user.id);

    res.status(500).json({ error: err?.response?.data || err.message || 'Erro no envio' });
  }
});

app.post('/api/whatsapp/qr', async (req: any, res: any) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user.id;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Número do WhatsApp é obrigatório' });
    }

    // Para UltraMsg, o QR Code é gerado automaticamente na plataforma
    // Aqui geramos um código simples para o usuário escanear no painel UltraMsg
    const qrData = `ultramsg_connect_${phoneNumber}_${userId}_${Date.now()}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    res.json({
      ok: true,
      qrCodeUrl,
      instructions: 'Acesse seu painel UltraMsg, vá para a seção de instâncias e configure o webhook para este número.'
    });
  } catch (err: any) {
    console.error('Erro gerando QR Code:', err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  }
});

app.post('/webhook/whatsapp', async (req: any, res: any) => {
  try {
    // Basic webhook receiver — in production validate signature
    console.log('Webhook WhatsApp payload:', req.body);

    const { entry } = req.body;
    if (entry && entry[0]?.changes) {
      const changes = entry[0].changes[0];
      if (changes?.value?.messages) {
        // Processar mensagens recebidas
        const messages = changes.value.messages;
        for (const message of messages) {
          await processIncomingMessage(message, changes.value.metadata);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.sendStatus(500);
  }
});

// Endpoint para desconectar WhatsApp
app.post('/api/whatsapp/disconnect', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const sessionName = `user_${userId}`;

    // Parar sessão no WAHA
    try {
      await axios.post(`${WAHA_API_BASE}/api/sessions/stop`, {
        name: sessionName
      });
    } catch (wahaError) {
      console.error('Erro ao parar sessão WAHA:', wahaError);
      // Continua mesmo se WAHA falhar
    }

    // Remover sessão local
    whatsappSessions.delete(sessionName);

    // Atualizar status no banco
    await supabaseAdmin
      .from('users')
      .update({
        whatsapp_connected: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    res.json({ ok: true, message: 'WhatsApp desconectado com sucesso' });

  } catch (err: any) {
    console.error('Erro ao desconectar:', err);
    res.status(500).json({ error: err.message || 'Erro ao desconectar' });
  }
});

async function processIncomingMessage(message: any, userId: string) {
  try {
    const from = message.from || message.payload?.from; // Número do cliente
    const messageText = message.body || message.payload?.body;

    if (!messageText) return;

    // Verificar se agente está habilitado
    const { data: agentConfig } = await supabaseAdmin
      .from('whatsapp_agent_config')
      .select('agent_enabled')
      .eq('user_id', userId)
      .single();

    if (!agentConfig || !agentConfig.agent_enabled) return;

    // Gerar resposta da IA
    const aiResponse = await generateAIResponse(messageText, userId);

    // Enviar resposta via WAHA API
    const sessionName = `user_${userId}`;
    try {
      await axios.post(`${WAHA_API_BASE}/api/sendText`, {
        session: sessionName,
        chatId: from,
        text: aiResponse
      });
    } catch (wahaError) {
      console.error('Erro enviando via WAHA:', wahaError);
      // Fallback para whatsapp-web.js
      const client = whatsappSessions.get(sessionName);
      if (client) {
        await client.sendMessage(from, aiResponse);
      }
    }

    // Salvar conversa no banco
    await supabaseAdmin.from('chat_messages').insert({
      user_id: userId,
      customer_phone: from,
      message: messageText,
      is_from_customer: true
    });

    await supabaseAdmin.from('chat_messages').insert({
      user_id: userId,
      customer_phone: from,
      message: aiResponse,
      is_from_customer: false
    });

  } catch (error) {
    console.error('Erro processando mensagem:', error);
  }
}

async function generateAIResponse(message: string, userId: string): Promise<string> {
  try {
    // Buscar configurações do usuário
    const { data: agentConfig } = await supabaseAdmin
      .from('whatsapp_agent_config')
      .select('agent_enabled, welcome_message, default_response, gemini_prompt')
      .eq('user_id', userId)
      .maybeSingle();

    // Se agente não estiver habilitado, não responde
    if (!agentConfig?.agent_enabled) {
      return '';
    }

    const lowerMessage = message.toLowerCase();

    // Saudação personalizada
    if (lowerMessage.includes('oi') || lowerMessage.includes('olá') || lowerMessage.includes('bom dia') || lowerMessage.includes('boa tarde')) {
      return agentConfig?.welcome_message || 'Olá! Sou o assistente virtual. Como posso ajudar você hoje?';
    }

    // Usar Gemini AI para respostas inteligentes
    if (process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'your-gemini-api-key-here') {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // Prompt personalizado ou padrão
        const systemPrompt = agentConfig?.gemini_prompt ||
          `Você é um assistente virtual amigável para um negócio de serviços.
          Seja útil, educado e ajude os clientes com informações sobre agendamentos, serviços e preços.
          Mantenha as respostas concisas e profissionais.
          Se não souber algo específico, sugira que o cliente entre em contato diretamente.`;

        const prompt = `${systemPrompt}\n\nCliente: ${message}\n\nResponda de forma natural e útil:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponse = response.text().trim();

        return aiResponse || agentConfig?.default_response || 'Obrigado pela mensagem! Como posso te ajudar?';

      } catch (geminiError) {
        console.error('Erro no Gemini AI:', geminiError);
        // Fallback para respostas básicas
      }
    }

    // Fallback para respostas básicas se Gemini não estiver configurado
    if (lowerMessage.includes('agendar') || lowerMessage.includes('horário') || lowerMessage.includes('marcar')) {
      return 'Para agendar um horário, preciso de algumas informações. Que serviço você gostaria? E qual seria a melhor data para você?';
    }

    if (lowerMessage.includes('serviços') || lowerMessage.includes('serviço')) {
      return 'Oferecemos diversos serviços. Posso listar os serviços disponíveis ou você pode me dizer qual tipo de serviço está procurando?';
    }

    if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('custo')) {
      return 'Os preços variam conforme o serviço. Posso informar os valores específicos se você me disser qual serviço te interessa.';
    }

    // Resposta padrão
    return agentConfig?.default_response || 'Obrigado pela mensagem! Estou aqui para ajudar com agendamentos, informações sobre serviços ou dúvidas gerais. Como posso te ajudar melhor?';

  } catch (error) {
    console.error('Erro ao gerar resposta IA:', error);
    return 'Desculpe, houve um erro. Como posso te ajudar?';
  }
}

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
