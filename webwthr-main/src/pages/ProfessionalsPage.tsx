import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User, Users, ArrowLeft, ChevronDown, Edit, Trash2, Package, ShoppingCart, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  professional_id?: string;
  created_at: string;
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

interface PackageOption {
  id: string;
  name: string;
  price: number;
  expires_after_days: number | null;
  services: Array<{
    service_id: string;
    quantity: number;
    service: {
      name: string;
    };
  }>;
}

export default function ProfessionalsPage() {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPackages, setCustomerPackages] = useState<Record<string, CustomerPackage[]>>({});
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [professionalCustomers, setProfessionalCustomers] = useState<Customer[]>([]);
  const [showCustomers, setShowCustomers] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showPackagePurchase, setShowPackagePurchase] = useState(false);
  const [purchasingCustomer, setPurchasingCustomer] = useState<Customer | null>(null);
  const [purchasePackages, setPurchasePackages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    professional_id: ''
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load professionals
      const { data: professionalsData, error: professionalsError } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      if (professionalsError) throw professionalsError;

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, professional_id, created_at')
        .eq('user_id', user.id)
        .order('name');

      if (customersError) throw customersError;

      setProfessionals(professionalsData || []);
      setCustomers(customersData || []);

      // Load packages for each customer
      const packagesMap: Record<string, CustomerPackage[]> = {};
      for (const customer of customersData || []) {
        // First get customer packages
        const { data: customerPackages } = await supabase
          .from('customer_packages')
          .select('id, package_id, expiration_date, paid, created_at')
          .eq('user_id', user.id)
          .eq('customer_id', customer.id)
          .eq('paid', true);

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

      // Load available packages for purchase
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

      setPackages(packagesData as any || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalClick = (professional: Professional) => {
    const profCustomers = customers.filter(customer => customer.professional_id === professional.id);
    setSelectedProfessional(professional);
    setProfessionalCustomers(profCustomers);
    setShowCustomers(true);
  };

  const handlePurchasePackage = (customer: Customer) => {
    setPurchasingCustomer(customer);
    setPurchasePackages([]);
    setShowPackagePurchase(true);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !purchasingCustomer || purchasePackages.length === 0) return;

    try {
      for (const packageId of purchasePackages) {
        const selectedPackage = packages.find(p => p.id === packageId);
        if (!selectedPackage) continue;

        await createCustomerPackage(purchasingCustomer.id, selectedPackage);
      }

      setShowPackagePurchase(false);
      setPurchasingCustomer(null);
      setPurchasePackages([]);

      // Reload data
      loadData();
    } catch (error) {
      console.error('Error purchasing packages:', error);
      alert('Erro ao comprar pacotes. Tente novamente.');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      professional_id: customer.professional_id || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingCustomer) {
        // Update customer
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            phone: formData.phone,
            professional_id: formData.professional_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
      }

      // Reset form
      setFormData({ name: '', phone: '', professional_id: '' });
      setEditingCustomer(null);
      setShowForm(false);

      // Reload data
      loadData();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      // Reload data
      loadData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Erro ao excluir cliente. Tente novamente.');
    }
  };

  const handleRenewPackage = async (customer: Customer, existingPackage: any) => {
    try {
      // Find the package by name since we don't have package_id in the existingPackage
      const selectedPackage = packages.find(p => p.name === existingPackage.package.name);
      if (!selectedPackage) {
        alert('Pacote não encontrado. Verifique se o pacote ainda está disponível.');
        return;
      }

      await createCustomerPackage(customer.id, selectedPackage);

      // Reload data
      loadData();
    } catch (error) {
      console.error('Error renewing package:', error);
      alert('Erro ao renovar pacote. Tente novamente.');
    }
  };

  const createCustomerPackage = async (customerId: string, selectedPackage: PackageOption) => {
    if (!user) return;

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
        user_id: user.id,
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
    const servicesToInsert = selectedPackage.services.map(service => ({
      customer_package_id: customerPackage.id,
      service_id: service.service_id,
      sessions_remaining: service.quantity
    }));

    const { error: cpsError } = await supabase
      .from('customer_package_services')
      .insert(servicesToInsert);

    if (cpsError) throw cpsError;
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita.')) return;

    try {
      // Delete customer package services first
      const { error: cpsError } = await supabase
        .from('customer_package_services')
        .delete()
        .eq('customer_package_id', packageId);

      if (cpsError) throw cpsError;

      // Delete customer package
      const { error: cpError } = await supabase
        .from('customer_packages')
        .delete()
        .eq('id', packageId);

      if (cpError) throw cpError;

      loadData();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Erro ao excluir pacote. Tente novamente.');
    }
  };

  const formatPhone = (phone: string) => {
    // Basic phone formatting for Brazilian numbers
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profissionais</h1>
        <p className="text-gray-600">Gerencie seus profissionais e veja seus clientes atribuídos</p>
      </div>

      {showCustomers && selectedProfessional ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCustomers(false)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar para Profissionais
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedProfessional.name}</h2>
                <p className="text-gray-600">{selectedProfessional.specialty}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {professionalCustomers.length} cliente{professionalCustomers.length !== 1 ? 's' : ''} atribuído{professionalCustomers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Clientes Atribuídos</h3>

              {showForm && editingCustomer && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold mb-4">Editar Cliente</h4>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        Atualizar Cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditingCustomer(null);
                          setFormData({ name: '', phone: '', professional_id: '' });
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showPackagePurchase && purchasingCustomer && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold mb-4">Comprar Pacotes para {purchasingCustomer.name}</h4>
                  <form onSubmit={handlePurchaseSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pacotes Disponíveis</label>
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                        {packages.map(pkg => (
                          <label key={pkg.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={purchasePackages.includes(pkg.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPurchasePackages(prev => [...prev, pkg.id]);
                                } else {
                                  setPurchasePackages(prev => prev.filter(id => id !== pkg.id));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{pkg.name}</div>
                              <div className="text-sm text-gray-600">R$ {pkg.price.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">
                                {pkg.services.map(s => `${s.service.name} (${s.quantity}x)`).join(', ')}
                              </div>
                            </div>
                          </label>
                        ))}
                        {packages.length === 0 && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            Nenhum pacote disponível
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        disabled={purchasePackages.length === 0}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Comprar Pacotes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPackagePurchase(false);
                          setPurchasingCustomer(null);
                          setPurchasePackages([]);
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {professionalCustomers.length > 0 ? (
                <div className="grid gap-4">
                  {professionalCustomers.map(customer => (
                    <div key={customer.id} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                            <p className="text-gray-600">{formatPhone(customer.phone)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePurchasePackage(customer)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Comprar Pacote"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
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
                                <span className="font-medium text-blue-800">{selectedProfessional.name}</span>
                                <span className="text-blue-600 ml-2">- {selectedProfessional.specialty}</span>
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
                                        <button
                                          onClick={() => handleDeletePackage(pkg.id)}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                          title="Excluir pacote"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Nenhum cliente atribuído a este profissional</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {professionals.map(professional => {
            const professionalCustomerCount = customers.filter(customer => customer.professional_id === professional.id).length;

            return (
              <div
                key={professional.id}
                onClick={() => handleProfessionalClick(professional)}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{professional.name}</h3>
                    <p className="text-sm text-gray-600">{professional.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{professionalCustomerCount} cliente{professionalCustomerCount !== 1 ? 's' : ''}</span>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            );
          })}

          {professionals.length === 0 && (
            <div className="col-span-full text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum profissional cadastrado</h3>
              <p className="text-gray-600">Adicione profissionais nas configurações para visualizá-los aqui.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}