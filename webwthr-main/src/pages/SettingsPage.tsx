import { useState } from 'react';
import ProfessionalsManager from '../components/Settings/ProfessionalsManager';
import ServicesManager from '../components/Settings/ServicesManager';
import CustomersManager from '../components/Settings/CustomersManager';
import PackagesManager from '../components/Settings/PackagesManager';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'professionals' | 'services' | 'customers' | 'packages'>('professionals');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Configurações</h1>
          <p className="text-gray-600">Gerencie profissionais, serviços, clientes e pacotes</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('professionals')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'professionals'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Profissionais
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'services'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Serviços
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'customers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Clientes
              </button>
              <button
                onClick={() => setActiveTab('packages')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'packages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pacotes
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'professionals' && <ProfessionalsManager />}
            {activeTab === 'services' && <ServicesManager />}
            {activeTab === 'customers' && <CustomersManager />}
            {activeTab === 'packages' && <PackagesManager />}
          </div>
        </div>
      </div>
    </div>
  );
}