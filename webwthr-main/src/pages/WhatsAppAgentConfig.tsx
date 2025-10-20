import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, QrCode, Bot, CheckCircle, AlertCircle } from 'lucide-react';

export default function WhatsAppAgentConfig() {
  const { user } = useAuth();
  const [startingSession, setStartingSession] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Configurações avançadas do agente IA
  const [welcomeMessage, setWelcomeMessage] = useState('Olá! Sou o assistente virtual. Como posso ajudar você hoje? Posso agendar um horário, informar sobre serviços ou tirar dúvidas.');
  const [defaultResponse, setDefaultResponse] = useState('Obrigado pela mensagem! Estou aqui para ajudar com agendamentos, informações sobre serviços ou dúvidas gerais. Como posso te ajudar melhor?');
  const [geminiPrompt, setGeminiPrompt] = useState(`Você é um assistente virtual amigável para um negócio de serviços.
Seja útil, educado e ajude os clientes com informações sobre agendamentos, serviços e preços.
Mantenha as respostas concisas e profissionais.
Se não souber algo específico, sugira que o cliente entre em contato diretamente.`);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [priceInquiry, setPriceInquiry] = useState(true);

  useEffect(() => {
    loadConfiguration();
  }, [user]);

  const loadConfiguration = async () => {
    if (!user) return;

    try {
      // Carregar status de conexão
      const { data: userData } = await supabase
        .from('users')
        .select('whatsapp_connected')
        .eq('id', user.id)
        .maybeSingle();

      if (userData) {
        setIsConnected(userData.whatsapp_connected || false);
      }

      // Verificar configurações do agente IA
      const { data: agentConfig } = await supabase
        .from('whatsapp_agent_config')
        .select('agent_enabled, welcome_message, default_response, gemini_prompt')
        .eq('user_id', user.id)
        .maybeSingle();

      if (agentConfig) {
        setAgentEnabled(agentConfig.agent_enabled || false);
        setWelcomeMessage(agentConfig.welcome_message || welcomeMessage);
        setDefaultResponse(agentConfig.default_response || defaultResponse);
        setGeminiPrompt(agentConfig.gemini_prompt || geminiPrompt);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      // Em caso de erro, assume valores padrão
      setIsConnected(false);
      setAgentEnabled(false);
    }
  };


  const startWhatsAppSession = async () => {
    if (!user) return setMessage('Usuário não autenticado');

    setStartingSession(true);
    setMessage('Iniciando sessão WhatsApp...');

    try {
      const res = await fetch('/api/whatsapp/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao iniciar sessão');

      setMessage('Sessão iniciada! Aguarde o QR code aparecer.');
      // QR code será atualizado automaticamente via polling
      pollForQRCode();
    } catch (err: any) {
      setMessage('Erro ao iniciar sessão: ' + (err?.message || String(err)));
      setStartingSession(false);
    }
  };

  const pollForQRCode = async () => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/qr', {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        });

        const data = await res.json();
        if (res.ok && data.qrCode) {
          setQrCode(data.qrCode);
          setStartingSession(false);
          setMessage('QR Code gerado! Escaneie com seu WhatsApp.');
          clearInterval(pollInterval);
        } else if (data.connected) {
          setIsConnected(true);
          setQrCode(null);
          setStartingSession(false);
          setMessage('WhatsApp conectado com sucesso!');
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Erro ao verificar QR code:', error);
      }
    }, 2000); // Verificar a cada 2 segundos

    // Timeout após 5 minutos
    setTimeout(() => {
      clearInterval(pollInterval);
      if (!isConnected) {
        setStartingSession(false);
        setMessage('Timeout: Tente iniciar a sessão novamente.');
      }
    }, 300000);
  };

  const toggleAgent = async () => {
    if (!user) return;

    const newState = !agentEnabled;
    setAgentEnabled(newState);

    try {
      // Primeiro, verificar se já existe um registro
      const { data: existing } = await supabase
        .from('whatsapp_agent_config')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update
        await supabase
          .from('whatsapp_agent_config')
          .update({
            agent_enabled: newState,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Insert
        await supabase
          .from('whatsapp_agent_config')
          .insert({
            user_id: user.id,
            agent_enabled: newState
          });
      }

      setMessage(`Agente IA ${newState ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar agente:', error);
      setAgentEnabled(!newState); // Reverte estado
      setMessage('Erro ao atualizar status do agente');
    }
  };

  const checkConnection = async () => {
    if (!user) return setMessage('Usuário não autenticado');

    try {
      const res = await fetch('/api/whatsapp/qr', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      const data = await res.json();
      if (res.ok && data.connected) {
        setIsConnected(true);
        setQrCode(null);
        setMessage('WhatsApp conectado com sucesso!');
        loadConfiguration(); // Recarrega configuração
      } else {
        setMessage('WhatsApp ainda não conectado. Verifique se escaneou o QR code no WAHA.');
      }
    } catch (err: any) {
      console.error('Erro ao verificar conexão:', err);
      setMessage('Erro ao verificar conexão');
    }
  };

  const disconnectWhatsApp = async () => {
    if (!user) return setMessage('Usuário não autenticado');

    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao desconectar');

      setIsConnected(false);
      setQrCode(null);
      setMessage('WhatsApp desconectado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao desconectar:', err);
      // Mesmo com erro, desconecta localmente
      setIsConnected(false);
      setQrCode(null);
      setMessage('WhatsApp desconectado localmente');
    }
  };

  const saveAgentConfig = async () => {
    if (!user) return setMessage('Usuário não autenticado');

    try {
      // Primeiro, verificar se já existe um registro
      const { data: existing } = await supabase
        .from('whatsapp_agent_config')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update
        await supabase
          .from('whatsapp_agent_config')
          .update({
            agent_enabled: agentEnabled,
            welcome_message: welcomeMessage,
            default_response: defaultResponse,
            gemini_prompt: geminiPrompt,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Insert
        await supabase
          .from('whatsapp_agent_config')
          .insert({
            user_id: user.id,
            agent_enabled: agentEnabled,
            welcome_message: welcomeMessage,
            default_response: defaultResponse,
            gemini_prompt: geminiPrompt
          });
      }

      setMessage('🤖 Configurações do Gemini IA salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setMessage('❌ Erro ao salvar configurações do Gemini IA');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-3 mb-6">
          <Bot className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-800">WhatsApp AI Agent</h1>
        </div>

        <div className="space-y-6">
          {/* Conexão WhatsApp */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800">Conexão WhatsApp</h2>
            </div>

            <div className="space-y-4">
              {!isConnected && !qrCode ? (
                <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <MessageCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Conectar WhatsApp
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Para conectar seu WhatsApp, você precisa acessar a interface do WAHA.
                    Clique no botão abaixo para abrir a página de configuração.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.open('http://localhost:3001', '_blank')}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition block w-full"
                    >
                      🔗 Abrir WAHA (localhost:3001)
                    </button>
                    <p className="text-xs text-gray-600">
                      1. Clique no botão acima para abrir o WAHA<br/>
                      2. Na interface do WAHA, crie uma nova sessão<br/>
                      3. Escaneie o QR code com seu WhatsApp<br/>
                      4. Volte aqui e clique em "Verificar Conexão"
                    </p>
                    <button
                      onClick={checkConnection}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                    >
                      🔄 Verificar Conexão
                    </button>
                  </div>
                </div>
              ) : qrCode ? (
                <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                  <QrCode className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    QR Code Gerado
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    Escaneie o QR code abaixo com seu WhatsApp no celular.
                  </p>
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR Code WhatsApp" className="max-w-xs border rounded-lg" />
                  </div>
                  <p className="text-xs text-gray-600 mt-4">
                    Aguarde a conexão automática após escanear.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        WhatsApp Conectado!
                      </p>
                      <p className="text-xs text-green-700">
                        Sua sessão está ativa e pronta para receber mensagens.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnectWhatsApp()}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
                  >
                    Desconectar
                  </button>
                </div>
              )}
            </div>
          </div>


          {/* Controle do Agente IA */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-purple-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Agente IA</h2>
                  <p className="text-sm text-gray-600">Ativar respostas automáticas inteligentes</p>
                </div>
              </div>

              <button
                onClick={toggleAgent}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  agentEnabled ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    agentEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-800">
                Quando ativado, o agente IA responderá automaticamente às mensagens dos clientes,
                oferecendo agendamentos, informações sobre serviços e suporte básico.
              </p>
            </div>

            {/* Configurações Avançadas do Agente IA */}
            <div className="mt-4 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Configurações Avançadas</h3>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    🤖 <strong>Agente Gemini IA:</strong> Configure o prompt personalizado para seu assistente virtual.
                    O agente usará inteligência artificial para responder às mensagens dos clientes de forma inteligente e personalizada.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt do Gemini IA
                  </label>
                  <textarea
                    value={geminiPrompt}
                    onChange={(e) => setGeminiPrompt(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={6}
                    placeholder="Digite as instruções para o agente IA..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este prompt define como o agente IA se comporta e responde às mensagens dos clientes.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem de Boas-vindas
                  </label>
                  <textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Digite a mensagem que será enviada quando um cliente iniciar uma conversa..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resposta Padrão
                  </label>
                  <textarea
                    value={defaultResponse}
                    onChange={(e) => setDefaultResponse(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Digite a resposta padrão para mensagens não reconhecidas..."
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoSchedule"
                      checked={autoSchedule}
                      onChange={(e) => setAutoSchedule(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      disabled
                    />
                    <label htmlFor="autoSchedule" className="ml-2 text-sm text-gray-500">
                      Agendamento automático (em breve)
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="priceInquiry"
                      checked={priceInquiry}
                      onChange={(e) => setPriceInquiry(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      disabled
                    />
                    <label htmlFor="priceInquiry" className="ml-2 text-sm text-gray-500">
                      Responder perguntas de preço (em breve)
                    </label>
                  </div>
                </div>

                <button
                  onClick={saveAgentConfig}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  💾 Salvar Configurações do Gemini IA
                </button>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
            message.includes('Erro') || message.includes('erro')
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}