import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Plus, Edit, Trash2, DollarSign, Calendar, CheckCircle, X, CheckSquare, Square, Trash } from 'lucide-react';

interface PackageData {
  id: string;
  name: string;
  description: string;
  price: number;
  expires_after_days: number | null;
  active: boolean;
  created_at: string;
  services?: PackageService[];
}

interface PackageService {
  id: string;
  service_id: string;
  quantity: number;
  service: {
    name: string;
    price: number;
  };
}

interface Service {
  id: string;
  name: string;
  price: number;
}

export default function PackagesManager() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packageSales, setPackageSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSales, setShowSales] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageData | null>(null);
  const [packageServices, setPackageServices] = useState<{ service_id: string; quantity: number }[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    expires_after_days: '',
    active: true
  });

  useEffect(() => {
    loadPackages();
    if (showSales) {
      loadPackageSales();
    }
  }, [user, showSales]);

  const loadPackages = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load packages with their services
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select(`
          *,
          services:package_services(
            id,
            service_id,
            quantity,
            service:services(name, price)
          )
        `)
        .eq('user_id', user.id)
        .order('name');

      if (packagesError) throw packagesError;

      // Load services for the form
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, price')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('name');

      if (servicesError) throw servicesError;

      setPackages(packagesData || []);
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPackageSales = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_packages')
        .select(`
          id,
          purchase_date,
          paid,
          customer:customers(name, phone),
          package:packages(name, price)
        `)
        .eq('user_id', user.id)
        .eq('paid', true)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setPackageSales(data || []);
    } catch (error) {
      console.error('Error loading package sales:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || packageServices.length === 0) return;

    try {
      const packageData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        expires_after_days: formData.expires_after_days ? parseInt(formData.expires_after_days) : null,
        active: formData.active
      };

      let packageId: string;

      if (editingPackage) {
        // Update package
        const { error } = await supabase
          .from('packages')
          .update(packageData)
          .eq('id', editingPackage.id);

        if (error) throw error;
        packageId = editingPackage.id;

        // Delete existing package services
        await supabase
          .from('package_services')
          .delete()
          .eq('package_id', packageId);
      } else {
        // Create package
        const { data, error } = await supabase
          .from('packages')
          .insert({
            ...packageData,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        packageId = data.id;
      }

      // Insert package services
      const servicesToInsert = packageServices.map(ps => ({
        package_id: packageId,
        service_id: ps.service_id,
        quantity: ps.quantity
      }));

      const { error: servicesError } = await supabase
        .from('package_services')
        .insert(servicesToInsert);

      if (servicesError) throw servicesError;

      // Reset form
      setFormData({
        name: '',
        description: '',
        price: 0,
        expires_after_days: '',
        active: true
      });
      setPackageServices([]);
      setEditingPackage(null);
      setShowForm(false);

      // Reload packages
      loadPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      alert(`Erro ao salvar pacote: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
    }
  };

  const handleEdit = (pkg: PackageData) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      expires_after_days: pkg.expires_after_days?.toString() || '',
      active: pkg.active
    });
    setPackageServices(
      pkg.services?.map(ps => ({
        service_id: ps.service_id,
        quantity: ps.quantity
      })) || []
    );
    setShowForm(true);
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pacote?')) return;

    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;

      loadPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Erro ao excluir pacote. Tente novamente.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPackages.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedPackages.size} pacote(s)?`)) return;

    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .in('id', Array.from(selectedPackages));

      if (error) throw error;
      setSelectedPackages(new Set());
      loadPackages();
    } catch (error) {
      console.error('Error bulk deleting packages:', error);
      alert('Erro ao excluir pacotes. Tente novamente.');
    }
  };

  const togglePackageSelection = (packageId: string) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(packageId)) {
      newSelected.delete(packageId);
    } else {
      newSelected.add(packageId);
    }
    setSelectedPackages(newSelected);
  };

  const selectAllPackages = () => {
    if (selectedPackages.size === packages.length) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(packages.map(p => p.id)));
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Pacotes</h2>
          {selectedPackages.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Trash className="w-4 h-4" />
              Excluir Selecionados ({selectedPackages.size})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllPackages}
            className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg flex items-center gap-2 transition"
          >
            {selectedPackages.size === packages.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {selectedPackages.size === packages.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
          <button
            onClick={() => {
              setEditingPackage(null);
              setFormData({
                name: '',
                description: '',
                price: 0,
                expires_after_days: '',
                active: true
              });
              setPackageServices([]);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Novo Pacote
          </button>
          <button
            onClick={() => setShowSales(!showSales)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            <DollarSign className="w-4 h-4" />
            Vendas
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingPackage ? 'Editar Pacote' : 'Novo Pacote'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Pacote
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Pacote Barba + Cabelo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Descrição do pacote..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço Total
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dias para Expirar
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.expires_after_days}
                  onChange={(e) => setFormData({ ...formData, expires_after_days: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Serviços Incluídos
                </label>
                <button
                  type="button"
                  onClick={() => setPackageServices(prev => [...prev, { service_id: '', quantity: 1 }])}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Serviço
                </button>
              </div>

              {packageServices.map((ps, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Serviço {index + 1}</h4>
                    {packageServices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPackageServices(prev => prev.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Serviço
                      </label>
                      <select
                        value={ps.service_id}
                        onChange={(e) => setPackageServices(prev => prev.map((item, i) =>
                          i === index ? { ...item, service_id: e.target.value } : item
                        ))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione um serviço</option>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>
                            {service.name} - R$ {service.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={ps.quantity}
                        onChange={(e) => setPackageServices(prev => prev.map((item, i) =>
                          i === index ? { ...item, quantity: parseInt(e.target.value) || 1 } : item
                        ))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              {packageServices.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  Adicione pelo menos um serviço ao pacote
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Pacote ativo
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {editingPackage ? 'Atualizar' : 'Criar'} Pacote
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPackage(null);
                  setFormData({
                    name: '',
                    description: '',
                    price: 0,
                    expires_after_days: '',
                    active: true
                  });
                  setPackageServices([]);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {showSales && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Vendas de Pacotes</h3>
            <button
              onClick={() => setShowSales(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {packageSales.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma venda registrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {packageSales.map(sale => (
                <div key={sale.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800">{(sale.customer as any)?.name}</h4>
                      <p className="text-sm text-gray-600">{(sale.customer as any)?.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">R$ {(sale.package as any)?.price?.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(sale.purchase_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">{(sale.package as any)?.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4">
        {packages.map(pkg => (
          <div key={pkg.id} className={`bg-white border rounded-lg p-6 transition ${
            selectedPackages.has(pkg.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => togglePackageSelection(pkg.id)}
                  className="text-gray-400 hover:text-blue-600 transition"
                >
                  {selectedPackages.has(pkg.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                  <p className="text-gray-600">{pkg.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(pkg)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-900">R$ {pkg.price.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                {pkg.expires_after_days ? (
                  <>
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-600">{pkg.expires_after_days} dias</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Ilimitado</span>
                  </>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Serviços Incluídos:</span>
                </div>
                <div className="space-y-1">
                  {pkg.services?.map(service => (
                    <div key={service.id} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      <span>{service.service.name}</span>
                      <span className="font-medium">{service.quantity}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {!pkg.active && (
              <div className="mt-4 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Inativo
              </div>
            )}
          </div>
        ))}

        {packages.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pacote cadastrado</h3>
            <p className="text-gray-600">Comece criando seu primeiro pacote de serviços.</p>
          </div>
        )}
      </div>
    </div>
  );
}