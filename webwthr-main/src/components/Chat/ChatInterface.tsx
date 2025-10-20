import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  message: string;
  is_from_customer: boolean;
  created_at: string;
  customer_phone: string;
}

interface ChatInterfaceProps {
  selectedPhone: string | null;
}

export default function ChatInterface({ selectedPhone }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPhone) {
      loadMessages();
    }
  }, [selectedPhone]);

  const loadMessages = async () => {
    if (!user || !selectedPhone) return;

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('customer_phone', selectedPhone)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPhone || !newMessage.trim()) return;

    setSending(true);
    try {
      const { data } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          customer_phone: selectedPhone,
          message: newMessage,
          is_from_customer: false
        })
        .select()
        .single();

      if (data) {
        setMessages([...messages, data]);
        setNewMessage('');
        scrollToBottom();

        setTimeout(async () => {
          const aiResponse = `Olá! Sou o assistente virtual. Recebi sua mensagem: "${newMessage}". Como posso ajudar com agendamentos?`;

          const { data: aiMsg } = await supabase
            .from('chat_messages')
            .insert({
              user_id: user.id,
              customer_phone: selectedPhone,
              message: aiResponse,
              is_from_customer: true
            })
            .select()
            .single();

          if (aiMsg) {
            setMessages(prev => [...prev, aiMsg]);
            scrollToBottom();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!selectedPhone) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 shadow-md">
        <div className="flex items-center">
          <div className="bg-white/20 p-2 rounded-full mr-3">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{selectedPhone}</h3>
            <p className="text-green-100 text-sm">Cliente via WhatsApp</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.is_from_customer ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                msg.is_from_customer
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-green-600 text-white'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.message}</p>
              <p className={`text-xs mt-1 ${msg.is_from_customer ? 'text-gray-500' : 'text-green-100'}`}>
                {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
