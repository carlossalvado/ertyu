import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfessionalAuth } from '../../contexts/ProfessionalAuthContext';
import { User, Phone, Plus, Edit, Trash2, Search, Calendar } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  professional_id: string;
  created_at: string;
}

interface ProfessionalCustomersManagerProps {
  onCustomerUpdate?: () => void;
  onCustomerClickForAppointment?: (customer: Customer) => void;
}

export default function ProfessionalCustomersManager({ onCustomerUpdate, onCustomerClickForAppointment }: ProfessionalCustomersManagerProps) {
  const { professional } = useProfessionalAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });

  useEffect(() => {
    if (professional) {
      loadCustomers();
    }
  }, [professional]);

  const loadCustomers = async () => {
    if (!professional) return;

    try {
      setLoading(true);
      // Use shared_customers table for professionals
      const { data, error } = await supabase
        .from('shared_customers')
        .select('id, name, phone, professional_id, created_at')
        .eq('professional_id', professional.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional) return;

    try {
      if (editingCustomer) {
        // Update customer in shared_customers table
        const { error } = await supabase
          .from('shared_customers')
          .update({
            name: formData.name,
            phone: formData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
      } else {
        // Create customer in shared_customers table
        // Get user_id from professionals table
        const { data: profData, error: profError } = await supabase
          .from('professionals')
          .select('user_id')
          .eq('id', professional.id)
          .single();

        if (profError) throw profError;

        const { error } = await supabase
          .from('shared_customers')
          .insert({
            name: formData.name,
            phone: formData.phone,
            professional_id: professional.id,
            user_id: profData.user_id
          });

        if (error) throw error;
      }

      setFormData({ name: '', phone: '' });
      setShowForm(false);
      setEditingCustomer(null);
      loadCustomers();
      onCustomerUpdate?.();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('shared_customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      loadCustomers();
      onCustomerUpdate?.();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Erro ao excluir cliente. Tente novamente.');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', phone: '' });
    setShowForm(false);
    setEditingCustomer(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Meus Clientes</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome completo"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+55 11 99999-9999"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                {editingCustomer ? 'Atualizar' : 'Criar'} Cliente
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customers List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredCustomers.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
            </li>
          ) : (
            filteredCustomers.map((customer) => (
              <li key={customer.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {customer.phone}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCustomerClickForAppointment?.(customer)}
                      className="text-green-600 hover:text-green-900 p-1"
                      title="Novo Agendamento"
                    >
                      <Calendar className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(customer)}
                      className="text-blue-600 hover:text-blue-900 p-1"
                      title="Editar"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Excluir"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}