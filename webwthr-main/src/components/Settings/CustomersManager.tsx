import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, Phone, Plus, Edit, Trash2, Package, ShoppingCart, RefreshCw, AlertTriangle, CheckCircle, Search, Calendar, CheckSquare, Square, Trash } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  professional_id?: string;
  professional?: {
    id: string;
    name: string;
    specialty: string;
  };
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

export default function CustomersManager() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPackages, setCustomerPackages] = useState<Record<string, CustomerPackage[]>>({});
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [professionals, setProfessionals] = useState<{ id: string; name: string; specialty: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [showPackagePurchase, setShowPackagePurchase] = useState(false);
  const [purchasingCustomer, setPurchasingCustomer] = useState<Customer | null>(null);
  const [purchasePackages, setPurchasePackages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    professional_id: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCustomers();
  }, [user]);

  const loadCustomers = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*, professional:professionals(id, name, specialty)')
        .eq('user_id', user.id)
        .order('name');

      if (customersError) throw customersError;

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

      // Load professionals
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('id, name, specialty')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      setProfessionals(professionalsData || []);

    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let customerId: string;

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
        customerId = editingCustomer.id;
      } else {
        // Create customer
        const { data, error } = await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            name: formData.name,
            phone: formData.phone,
            professional_id: formData.professional_id || null
          })
          .select()
          .single();

        if (error) throw error;
        customerId = data.id;

        // Create customer packages if selected
        for (const packageId of selectedPackages) {
          const selectedPackage = packages.find(p => p.id === packageId);
          if (!selectedPackage) continue;

          await createCustomerPackage(customerId, selectedPackage);
        }
      }

      // Reset form
      setFormData({ name: '', phone: '', professional_id: '' });
      setSelectedPackages([]);
      setEditingCustomer(null);
      setShowForm(false);

      // Reload customers
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
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

      // Reload customers
      loadCustomers();
    } catch (error) {
      console.error('Error purchasing packages:', error);
      alert('Erro ao comprar pacotes. Tente novamente.');
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

      // Reload customers
      loadCustomers();
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
        expiration_date: expirationDate?.toISOString(),
        sessions_remaining: selectedPackage.services.reduce((total, service) => total + service.quantity, 0)
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

      loadCustomers();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Erro ao excluir pacote. Tente novamente.');
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

      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Erro ao excluir cliente. Tente novamente.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedCustomers.size} cliente(s)?`)) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', Array.from(selectedCustomers));

      if (error) throw error;
      setSelectedCustomers(new Set());
      loadCustomers();
    } catch (error) {
      console.error('Error bulk deleting customers:', error);
      alert('Erro ao excluir clientes. Tente novamente.');
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const selectAllCustomers = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleNewAppointment = (customer: Customer) => {
    console.log('Navigating to appointments with customer:', customer);
    // Navigate to appointments page with customer pre-selected
    const url = '/#/appointments?customer=' + encodeURIComponent(JSON.stringify(customer));
    console.log('URL:', url);
    // Use window.location.assign instead of href for better navigation
    window.location.assign(url);
    console.log('Navigation triggered');
    // Also try to force navigation by setting currentView in parent component
    // This is a workaround since the navigation isn't working
    const event = new CustomEvent('navigateToAppointments', { detail: { customer } });
    window.dispatchEvent(event);
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

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          {selectedCustomers.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Trash className="w-4 h-4" />
              Excluir Selecionados ({selectedCustomers.size})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllCustomers}
            className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg flex items-center gap-2 transition"
          >
            {selectedCustomers.size === filteredCustomers.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {selectedCustomers.size === filteredCustomers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
          <button
            onClick={() => {
              setEditingCustomer(null);
              setFormData({ name: '', phone: '', professional_id: '' });
              setSelectedPackages([]);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Buscar por nome ou telefone..."
          />
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} encontrado{filteredCustomers.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profissional Responsável
              </label>
              <select
                value={formData.professional_id}
                onChange={(e) => setFormData({ ...formData, professional_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Nenhum profissional atribuído</option>
                {professionals.map(prof => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name} - {prof.specialty}
                  </option>
                ))}
              </select>
            </div>

            {!editingCustomer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pacotes para Comprar
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {packages.map(pkg => (
                    <label key={pkg.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPackages.includes(pkg.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPackages(prev => [...prev, pkg.id]);
                          } else {
                            setSelectedPackages(prev => prev.filter(id => id !== pkg.id));
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
                      <ShoppingCart className="w-4 h-4 text-gray-400" />
                    </label>
                  ))}
                  {packages.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Nenhum pacote disponível
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {editingCustomer ? 'Atualizar' : 'Criar'} Cliente
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                  setFormData({ name: '', phone: '', professional_id: '' });
                  setSelectedPackages([]);
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
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Comprar Pacotes para {purchasingCustomer.name}
          </h3>
          <form onSubmit={handlePurchaseSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pacotes Disponíveis
              </label>
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

      <div className="grid gap-4">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className={`bg-white border rounded-lg p-6 transition ${
            selectedCustomers.has(customer.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleCustomerSelection(customer.id)}
                  className="text-gray-400 hover:text-blue-600 transition"
                >
                  {selectedCustomers.has(customer.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
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
                  onClick={() => handleNewAppointment(customer)}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                  title="Novo Agendamento"
                >
                  <Calendar className="w-4 h-4" />
                  Novo Agendamento
                </button>
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
                  {customer.professional ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-blue-800">{customer.professional.name}</span>
                        <span className="text-blue-600 ml-2">- {customer.professional.specialty}</span>
                      </div>
                      <button
                        onClick={() => handleEdit(customer)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                      >
                        Alterar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600">Nenhum profissional atribuído</span>
                      <button
                        onClick={() => handleEdit(customer)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                      >
                        Atribuir
                      </button>
                    </div>
                  )}
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
                                year: 'numeric'
                              })}
                            </div>
                            <div>
                              <span className="font-medium">Expira:</span> {pkg.expiration_date ? new Date(pkg.expiration_date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
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
                                  year: 'numeric'
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

        {filteredCustomers.length === 0 && customers.length > 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
            <p className="text-gray-600">Tente ajustar os termos da busca.</p>
          </div>
        )}

        {customers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-gray-600">Comece adicionando seu primeiro cliente.</p>
          </div>
        )}
      </div>
    </div>
  );
}