import { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface WhatsAppConnectProps {
  onConnected: () => void;
}

export default function WhatsAppConnect({ onConnected }: WhatsAppConnectProps) {
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setBusinessName(data.business_name || '');
      setWhatsappNumber(data.whatsapp_number || '');
      setIsConnected(data.whatsapp_connected || false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await supabase
        .from('users')
        .update({
          business_name: businessName,
          whatsapp_number: whatsappNumber,
          whatsapp_connected: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      setIsConnected(true);
      setTimeout(() => onConnected(), 1000);
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-green-600 p-4 rounded-full">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            UltraMsg Conectado!
          </h2>
          <p className="text-gray-600 mb-6">
            Seu agente de IA está pronto para atender via WhatsApp
          </p>
          <button
            onClick={onConnected}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Ir para o Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-green-600 p-3 rounded-xl">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Conectar UltraMsg
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Configure seu agente de IA para atendimento via WhatsApp
        </p>

        <form onSubmit={handleConnect} className="space-y-6">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Negócio
            </label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="Meu Negócio"
              required
            />
          </div>

          <div>
            <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Número WhatsApp
            </label>
            <input
              id="whatsappNumber"
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="+55 11 99999-9999"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Settings className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Configuração do Agente de IA
                </p>
                <p className="text-xs text-blue-700">
                  O agente de IA será configurado automaticamente para atender seus clientes,
                  agendar serviços e responder dúvidas.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Conectando...' : 'Conectar UltraMsg'}
          </button>

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'whatsapp' } }))}
              className="text-sm text-blue-600 hover:underline"
            >
              Configurar Agente UltraMsg
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
