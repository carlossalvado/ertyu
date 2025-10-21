import { MessageCircle, BarChart3, Settings, Calendar, LogOut, Menu, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  currentView: 'chat' | 'dashboard' | 'settings' | 'appointments' | 'customers' | 'professionals' | 'whatsapp';
  onViewChange: (view: 'chat' | 'dashboard' | 'settings' | 'appointments' | 'customers' | 'professionals' | 'whatsapp') => void;
}

export default function Navbar({ currentView, onViewChange }: NavbarProps) {
  const { signOut } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="bg-green-600 p-2 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">WhatsApp AI</span>
          </div>

          <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewChange('whatsapp')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                currentView === 'whatsapp'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">WhatsApp</span>
            </button>
            <button
              onClick={() => onViewChange('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                currentView === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => onViewChange('chat')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                currentView === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Chat</span>
            </button>
            <button
              onClick={() => onViewChange('settings')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                currentView === 'settings'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Configurações</span>
            </button>
            <button
              onClick={() => onViewChange('appointments')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                currentView === 'appointments'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Agendamentos</span>
            </button>
            <button
              onClick={() => onViewChange('customers')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                currentView === 'customers'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Clientes</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="md:hidden">
            <Menu className="w-6 h-6 text-gray-600" />
          </div>
          <button
            onClick={signOut}
            className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden md:inline font-medium">Sair</span>
          </button>
        </div>
      </div>

      <div className="md:hidden mt-4 flex space-x-2">
        <button
          onClick={() => onViewChange('whatsapp')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition ${
            currentView === 'whatsapp'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">WhatsApp</span>
        </button>
        <button
          onClick={() => onViewChange('dashboard')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition ${
            currentView === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </button>
        <button
          onClick={() => onViewChange('chat')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition ${
            currentView === 'chat'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Chat</span>
        </button>
        <button
          onClick={() => onViewChange('settings')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition ${
            currentView === 'settings'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Config</span>
        </button>
        <button
          onClick={() => onViewChange('appointments')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition ${
            currentView === 'appointments'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Agenda</span>
        </button>
        <button
          onClick={() => onViewChange('customers')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition ${
            currentView === 'customers'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">Clientes</span>
        </button>
      </div>
    </nav>
  );
}
