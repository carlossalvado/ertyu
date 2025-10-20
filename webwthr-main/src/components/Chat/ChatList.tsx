import { useState, useEffect } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Conversation {
  customer_phone: string;
  last_message: string;
  last_message_time: string;
  unread: number;
}

interface ChatListProps {
  onSelectChat: (phone: string) => void;
  selectedPhone: string | null;
}

export default function ChatList({ onSelectChat, selectedPhone }: ChatListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const grouped = data.reduce((acc: any, msg) => {
        if (!acc[msg.customer_phone]) {
          acc[msg.customer_phone] = {
            customer_phone: msg.customer_phone,
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread: 0
          };
        }
        return acc;
      }, {});

      setConversations(Object.values(grouped));
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.customer_phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageCircle className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-500">Nenhuma conversa ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              As conversas aparecem aqui quando os clientes entram em contato
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.customer_phone}
              onClick={() => onSelectChat(conv.customer_phone)}
              className={`w-full px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition text-left ${
                selectedPhone === conv.customer_phone ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-full mr-3 flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {conv.customer_phone}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date(conv.last_message_time).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {conv.last_message}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
