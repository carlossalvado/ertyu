import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfessionalAuth } from '../../contexts/ProfessionalAuthContext';
import { User, Phone, Plus, Edit, Trash2, Search, Calendar, Package, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

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

interface CustomerPackage {
  id: string;
  package: {
    name: string;
    price: number;
    expires_after_days: number | null;
    services: Array<{
      service_id: string;
      quantity: number;
      service: {
        name: string;
      };
      customer_sessions: Array<{
        sessions_remaining: number;
      }>;
    }>;
  };
  expiration_date: string | null;
  paid: boolean;
  created_at: string;
}

export default function ProfessionalCustomersManager({ onCustomerUpdate, onCustomerClickForAppointment }: ProfessionalCustomersManagerProps) {
  const { professional } = useProfessionalAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPackages, setCustomerPackages] = useState<Record<string, CustomerPackage[]>>({});
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

      // For professionals, we need to get the user_id from the professional's business
      // Since professionals use RPC authentication, we need to get user_id differently
      let userId: string | null = null;

      // First, try to get from auth session
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch (error) {
        console.log('Auth session not available, trying alternative approach');
      }

      // If no auth session, try to get user_id from the professional record
      if (!userId && professional) {
        try {
          // This might fail due to RLS, but let's try
          const { data: profData } = await supabase
            .from('professionals')
            .select('user_id')
            .eq('id', professional.id)
            .single();

          if (profData) {
            userId = profData.user_id;
          }
        } catch (error) {
          console.log('Could not get user_id from professionals table');
        }
      }

      if (!userId) {
        // As a last resort, try to get from localStorage or use a default approach
        // For now, let's skip the user_id filter and load all customers for this professional
        console.log('Using fallback: loading customers without user_id filter');
      }

      // Load customers from the customers table (same as admin panel)
      let customersQuery = supabase
        .from('customers')
        .select('id, name, phone, professional_id, created_at')
        .eq('professional_id', professional.id)
        .order('name');

      // Add user_id filter if we have it
      if (userId) {
        customersQuery = customersQuery.eq('user_id', userId);
      }

      const { data: customersData, error: customersError } = await customersQuery;

      if (customersError) throw customersError;

      setCustomers(customersData || []);

      // Load packages for each customer (same logic as ProfessionalsPage)
      const packagesMap: Record<string, CustomerPackage[]> = {};
      for (const customer of customersData || []) {
        // First get customer packages
        const packagesQuery = supabase
          .from('customer_packages')
          .select('id, package_id, expiration_date, paid, created_at')
          .eq('customer_id', customer.id)
          .eq('paid', true);

        // Add user_id filter if we have it
        if (userId) {
          packagesQuery.eq('user_id', userId);
        }

        const { data: customerPackages } = await packagesQuery;

        if (customerPackages && customerPackages.length > 0) {
          // For each customer package, load package details and services
          const packagesWithDetails = [];
          for (const cp of customerPackages) {
            // Skip expired packages
            const isExpired = cp.expiration_date && new Date(cp.expiration_date) < new Date();
            if (isExpired) continue;

            const { data: packageData } = await supabase
              .from('packages')
              .select(`
                name,
                price,
                expires_after_days,
                services:package_services(
                  service_id,
                  quantity,
                  service:services!inner(name)
                )
              `)
              .eq('id', cp.package_id)
              .single();

            if (packageData) {
              // Load sessions remaining for each service
              const servicesWithSessions = [];
              for (const service of packageData.services || []) {
                const { data: sessionData } = await supabase
                  .from('customer_package_services')
                  .select('sessions_remaining')
                  .eq('customer_package_id', cp.id)
                  .eq('service_id', service.service_id)
                  .single();

                servicesWithSessions.push({
                  service_id: service.service_id,
                  quantity: service.quantity,
                  service: {
                    name: (service.service as any).name
                  },
                  customer_sessions: sessionData ? [{ sessions_remaining: sessionData.sessions_remaining }] : [{ sessions_remaining: 0 }]
                });
              }

              packagesWithDetails.push({
                id: cp.id,
                expiration_date: cp.expiration_date,
                paid: cp.paid,
                created_at: cp.created_at,
                package: {
                  name: (packageData as any).name,
                  price: (packageData as any).price,
                  expires_after_days: (packageData as any).expires_after_days,
                  services: servicesWithSessions
                }
              });
            }
          }
          packagesMap[customer.id] = packagesWithDetails;
        } else {
          packagesMap[customer.id] = [];
        }
      }

      setCustomerPackages(packagesMap);
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
      // Get user_id from the current session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (editingCustomer) {
        // Update customer in customers table
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            phone: formData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
      } else {
        // Create customer in customers table
        const { error } = await supabase
          .from('customers')
          .insert({
            name: formData.name,
            phone: formData.phone,
            professional_id: professional.id,
            user_id: user.id
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
        .from('customers')
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

  const handleRenewPackage = async (customer: Customer, existingPackage: any) => {
    try {
      // Find the package by name since we don't have package_id in the existingPackage
      const packages = await loadAvailablePackages();
      const selectedPackage = packages.find((p: any) => p.name === existingPackage.package.name);
      if (!selectedPackage) {
        alert('Pacote não encontrado. Verifique se o pacote ainda está disponível.');
        return;
      }

      await createCustomerPackage(customer.id, selectedPackage);

      // Reload data
      loadCustomers();
    } catch (error) {
      console.error('Error renewing package:', error);
      alert('Erro ao renovar pacote. Tente novamente.');
    }
  };

  const loadAvailablePackages = async () => {
    if (!professional) return [];

    try {
      // Get user_id from the current session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: packagesData } = await supabase
        .from('packages')
        .select(`
          id,
          name,
          price,
          expires_after_days,
          services:package_services(
            service_id,
            quantity,
            service:services(name)
          )
        `)
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      return packagesData as any || [];
    } catch (error) {
      console.error('Error loading packages:', error);
      return [];
    }
  };

  const createCustomerPackage = async (customerId: string, selectedPackage: any) => {
    if (!professional) return;

    // For professionals, we need to get the user_id from the professional's business
    // Since professionals use RPC authentication, we need to get user_id differently
    let userId: string | null = null;

    // First, try to get from auth session
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (error) {
      console.log('Auth session not available, trying alternative approach');
    }

    // If no auth session, try to get user_id from the professional record
    if (!userId && professional) {
      try {
        // This might fail due to RLS, but let's try
        const { data: profData } = await supabase
          .from('professionals')
          .select('user_id')
          .eq('id', professional.id)
          .single();

        if (profData) {
          userId = profData.user_id;
        }
      } catch (error) {
        console.log('Could not get user_id from professionals table');
      }
    }

    if (!userId) {
      // As a last resort, try to get from localStorage or use a default approach
      // For now, let's skip the user_id filter and load all customers for this professional
      console.log('Using fallback: loading customers without user_id filter');
    }

    const profData = { user_id: userId };

    // Calculate expiration date if package has expires_after_days
    let expirationDate = null;
    if (selectedPackage.expires_after_days) {
      const purchaseDate = new Date();
      expirationDate = new Date(purchaseDate);
      expirationDate.setDate(purchaseDate.getDate() + selectedPackage.expires_after_days);
    }

    // Create customer package
    const { data: customerPackage, error: cpError } = await supabase
      .from('customer_packages')
      .insert({
        user_id: profData.user_id,
        customer_id: customerId,
        package_id: selectedPackage.id,
        paid: true,
        purchase_date: new Date().toISOString(),
        expiration_date: expirationDate?.toISOString()
      })
      .select()
      .single();

    if (cpError) throw cpError;

    // Create customer package services
    const servicesToInsert = selectedPackage.services.map((service: any) => ({
      customer_package_id: customerPackage.id,
      service_id: service.service_id,
      sessions_remaining: service.quantity
    }));

    const { error: cpsError } = await supabase
      .from('customer_package_services')
      .insert(servicesToInsert);

    if (cpsError) throw cpsError;
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
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">{searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}</p>
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                    <p className="text-gray-600">{customer.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCustomerClickForAppointment?.(customer)}
                    className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition"
                    title="Novo Agendamento"
                  >
                    <Calendar className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition"
                    title="Editar"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition"
                    title="Excluir"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Profissional Responsável</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-blue-800">{professional?.name}</span>
                        <span className="text-blue-600 ml-2">- {professional?.specialty}</span>
                      </div>
                      <button
                        onClick={() => handleEdit(customer)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                      >
                        Alterar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900">Pacotes Contratados</span>
                    </div>
                    {customerPackages[customer.id] && customerPackages[customer.id].length > 0 ? (
                      <div className="space-y-2">
                        {customerPackages[customer.id].map(pkg => (
                          <div key={pkg.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">{pkg.package.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-green-600">
                                  R$ {pkg.package.price?.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                              <div>
                                <span className="font-medium">Compra:</span> {new Date(pkg.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  timeZone: 'America/Sao_Paulo'
                                })}
                              </div>
                              <div>
                                <span className="font-medium">Expira:</span> {pkg.expiration_date ? new Date(pkg.expiration_date).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  timeZone: 'America/Sao_Paulo'
                                }) : 'Nunca'}
                              </div>
                            </div>
                            <div className="space-y-1">
                              {pkg.package.services.map(service => (
                                <div key={service.service_id} className="flex items-center justify-between text-xs">
                                  <span>{service.service.name}</span>
                                  <span className={service.customer_sessions[0]?.sessions_remaining === 0 ? 'text-red-600' : 'text-green-700'}>
                                    {service.customer_sessions[0]?.sessions_remaining || 0} restantes
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
                        Nenhum pacote contratado
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900">Status dos Pacotes</span>
                    </div>
                    {customerPackages[customer.id] && customerPackages[customer.id].length > 0 ? (
                      <div className="space-y-2">
                        {customerPackages[customer.id].map(pkg => {
                          const isExpired = pkg.expiration_date && new Date(pkg.expiration_date) < new Date();
                          const hasSessions = pkg.package.services.some(service =>
                            (service.customer_sessions[0]?.sessions_remaining || 0) > 0
                          );

                          return (
                            <div key={pkg.id} className={`border rounded-lg p-3 ${isExpired || !hasSessions ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{pkg.package.name}</span>
                                  {isExpired && <AlertTriangle className="w-4 h-4 text-red-600" />}
                                  {!isExpired && hasSessions && <CheckCircle className="w-4 h-4 text-green-600" />}
                                </div>
                                <button
                                  onClick={() => handleRenewPackage(customer, pkg)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Renovar pacote"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              </div>
                              {pkg.expiration_date && (
                                <div className={`text-sm mb-2 ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                  Válido até {new Date(pkg.expiration_date).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    timeZone: 'America/Sao_Paulo'
                                  })}
                                </div>
                              )}
                              <div className="space-y-1">
                                {pkg.package.services.map(service => (
                                  <div key={service.service_id} className="flex items-center justify-between text-sm">
                                    <span>{service.service.name}</span>
                                    <span className={service.customer_sessions[0]?.sessions_remaining === 0 ? 'text-red-600' : 'text-green-700'}>
                                      {service.customer_sessions[0]?.sessions_remaining || 0} sessões
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {isExpired && (
                                <div className="mt-2 text-xs text-red-600 font-medium">
                                  Pacote expirado
                                </div>
                              )}
                              {!hasSessions && !isExpired && (
                                <div className="mt-2 text-xs text-orange-600 font-medium">
                                  Sessões esgotadas
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
                        Nenhum pacote ativo
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}