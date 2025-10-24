import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, User, Settings, Key, CheckSquare, Square, Trash, Percent } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export default function ProfessionalsManager() {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isCommissionsModalOpen, setIsCommissionsModalOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [selectedProfessionals, setSelectedProfessionals] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    loadProfessionals();
    loadServices();
  }, [user]);

  const loadProfessionals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error loading professionals:', error);
    } else {
      setProfessionals(data || []);
    }
    setLoading(false);
  };

  const loadServices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error loading services:', error);
    } else {
      setServices(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (editingProfessional) {
        const { error } = await supabase
          .from('professionals')
          .update({
            name: formData.name,
            specialty: formData.specialty
          })
          .eq('id', editingProfessional.id);

        if (error) throw error;
      } else {
        // Create the professional record
        const { error } = await supabase
          .from('professionals')
          .insert({
            user_id: user.id,
            name: formData.name,
            specialty: formData.specialty,
            email: formData.email,
            password_hash: '', // Not used anymore since we use Supabase Auth
            role: 'professional',
            active: true
          });

        if (error) throw error;

        // Note: Professional will need to create their own account through signup
        // The system will automatically associate the account when they log in
      }

      setIsModalOpen(false);
      setEditingProfessional(null);
      setFormData({ name: '', specialty: '', email: '', password: '' });
      loadProfessionals();
    } catch (error) {
      console.error('Error saving professional:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (professional: Professional) => {
    setEditingProfessional(professional);
    setFormData({
      name: professional.name,
      specialty: professional.specialty,
      email: '',
      password: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;

    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadProfessionals();
    } catch (error) {
      console.error('Error deleting professional:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProfessionals.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedProfessionals.size} profissional(is)?`)) return;

    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .in('id', Array.from(selectedProfessionals));

      if (error) throw error;
      setSelectedProfessionals(new Set());
      loadProfessionals();
    } catch (error) {
      console.error('Error bulk deleting professionals:', error);
      alert('Erro ao excluir profissionais. Tente novamente.');
    }
  };

  const toggleProfessionalSelection = (professionalId: string) => {
    const newSelected = new Set(selectedProfessionals);
    if (newSelected.has(professionalId)) {
      newSelected.delete(professionalId);
    } else {
      newSelected.add(professionalId);
    }
    setSelectedProfessionals(newSelected);
  };

  const selectAllProfessionals = () => {
    if (selectedProfessionals.size === professionals.length) {
      setSelectedProfessionals(new Set());
    } else {
      setSelectedProfessionals(new Set(professionals.map(p => p.id)));
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      loadProfessionals();
    } catch (error) {
      console.error('Error updating professional:', error);
    }
  };

  const openServicesModal = (professional: Professional) => {
    setSelectedProfessional(professional);
    setIsServicesModalOpen(true);
  };

  const openCredentialsModal = (professional: Professional) => {
    setSelectedProfessional(professional);
    setIsCredentialsModalOpen(true);
  };

  const openCommissionsModal = (professional: Professional) => {
    setSelectedProfessional(professional);
    setIsCommissionsModalOpen(true);
  };

  const loadProfessionalServices = async (professionalId: string) => {
    const { data, error } = await supabase
      .from('professional_services')
      .select('service_id, commission')
      .eq('professional_id', professionalId);

    if (error) {
      console.error('Error loading professional services:', error);
      return [];
    }

    return data?.map(item => ({
      serviceId: item.service_id,
      commission: item.commission || 0
    })) || [];
  };

  const updateProfessionalServices = async (professionalId: string, serviceIds: string[]) => {
    try {
      // First, remove all existing assignments
      await supabase
        .from('professional_services')
        .delete()
        .eq('professional_id', professionalId);

      // Then, add the new assignments with default commission from service
      if (serviceIds.length > 0) {
        // Get default commissions for these services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, default_commission')
          .in('id', serviceIds);

        if (servicesError) throw servicesError;

        const assignments = serviceIds.map(serviceId => {
          const service = servicesData?.find(s => s.id === serviceId);
          return {
            professional_id: professionalId,
            service_id: serviceId,
            commission: service?.default_commission || 0
          };
        });

        const { error } = await supabase
          .from('professional_services')
          .insert(assignments);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating professional services:', error);
      throw error;
    }
  };

  const updateProfessionalCommissions = async (professionalId: string, serviceAssignments: { serviceId: string; commission: number }[]) => {
    try {
      // First, remove all existing assignments
      await supabase
        .from('professional_services')
        .delete()
        .eq('professional_id', professionalId);

      // Then, add the new assignments with custom commissions
      if (serviceAssignments.length > 0) {
        const assignments = serviceAssignments.map(({ serviceId, commission }) => ({
          professional_id: professionalId,
          service_id: serviceId,
          commission: commission
        }));

        const { error } = await supabase
          .from('professional_services')
          .insert(assignments);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating professional commissions:', error);
      throw error;
    }
  };

  const updateProfessionalCredentials = async (professionalId: string, email: string, password: string) => {
    try {
      // For now, use direct update since the RPC function has issues
      // Hash the password using a simple approach (in production, use proper hashing)
      const hashedPassword = btoa(password); // Simple base64 encoding - NOT SECURE for production!

      const { error } = await supabase
        .from('professionals')
        .update({
          email: email,
          password_hash: hashedPassword
        })
        .eq('id', professionalId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating professional credentials:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Credentials Modal Component
  function CredentialsModal({
    professional,
    onClose,
    onUpdate
  }: {
    professional: Professional;
    onClose: () => void;
    onUpdate: (professionalId: string, email: string, password: string) => Promise<void>;
  }) {
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
  
      if (!formData.email || !formData.password) {
        setError('Preencha todos os campos');
        return;
      }
  
      if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }
  
      if (formData.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        return;
      }
  
      setLoading(true);
      try {
        await onUpdate(professional.id, formData.email, formData.password);
        onClose();
      } catch (error) {
        console.error('Error updating credentials:', error);
        setError('Erro ao atualizar credenciais. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            Alterar Credenciais - {professional.name}
          </h3>
  
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="novo@email.com"
                required
              />
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
  
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
  
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Profissionais</h2>
          {selectedProfessionals.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Trash className="w-4 h-4" />
              Excluir Selecionados ({selectedProfessionals.size})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllProfessionals}
            className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg flex items-center gap-2 transition"
          >
            {selectedProfessionals.size === professionals.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {selectedProfessionals.size === professionals.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
          <button
            onClick={() => {
              setEditingProfessional(null);
              setFormData({ name: '', specialty: '', email: '', password: '' });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Novo Profissional
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {professionals.map((professional) => (
          <div key={professional.id} className={`bg-white border rounded-lg p-4 transition ${
            selectedProfessionals.has(professional.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleProfessionalSelection(professional.id)}
                  className="text-gray-400 hover:text-blue-600 transition"
                >
                  {selectedProfessionals.has(professional.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="bg-blue-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{professional.name}</h3>
                  <p className="text-sm text-gray-600">{professional.specialty}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(professional.id, professional.active)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    professional.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {professional.active ? 'Ativo' : 'Inativo'}
                </button>
                <button
                  onClick={() => handleEdit(professional)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openCredentialsModal(professional)}
                  className="p-2 text-gray-400 hover:text-green-600 transition"
                  title="Alterar Email/Senha"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openServicesModal(professional)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition"
                  title="Gerenciar Serviços"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openCommissionsModal(professional)}
                  className="p-2 text-gray-400 hover:text-green-600 transition"
                  title="Editar Comissões"
                >
                  <Percent className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(professional.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {professionals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum profissional cadastrado
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidade
                </label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Cabeleireiro, Manicure..."
                />
              </div>

              {!editingProfessional && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Services Assignment Modal */}
      {isServicesModalOpen && selectedProfessional && (
        <ServicesAssignmentModal
          professional={selectedProfessional}
          services={services}
          onClose={() => setIsServicesModalOpen(false)}
          onUpdate={updateProfessionalServices}
          loadProfessionalServices={loadProfessionalServices}
        />
      )}

      {/* Credentials Modal */}
      {isCredentialsModalOpen && selectedProfessional && (
        <CredentialsModal
          professional={selectedProfessional}
          onClose={() => setIsCredentialsModalOpen(false)}
          onUpdate={updateProfessionalCredentials}
        />
      )}

      {/* Commissions Modal */}
      {isCommissionsModalOpen && selectedProfessional && (
        <CommissionsModal
          professional={selectedProfessional}
          services={services}
          onClose={() => setIsCommissionsModalOpen(false)}
          onUpdate={updateProfessionalCommissions}
          loadProfessionalServices={loadProfessionalServices}
        />
      )}
    </div>
  );
}

// Commissions Modal Component
function CommissionsModal({
  professional,
  services,
  onClose,
  onUpdate,
  loadProfessionalServices
}: {
  professional: Professional;
  services: Service[];
  onClose: () => void;
  onUpdate: (professionalId: string, serviceAssignments: { serviceId: string; commission: number }[]) => Promise<void>;
  loadProfessionalServices: (professionalId: string) => Promise<{ serviceId: string; commission: number }[]>;
}) {
  const [assignedServices, setAssignedServices] = useState<{ serviceId: string; commission: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAssignedServices();
  }, [professional.id]);

  const loadAssignedServices = async () => {
    try {
      const assigned = await loadProfessionalServices(professional.id);
      setAssignedServices(assigned);
    } catch (error) {
      console.error('Error loading assigned services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommissionChange = (serviceId: string, commission: number) => {
    setAssignedServices(prev =>
      prev.map(item =>
        item.serviceId === serviceId
          ? { ...item, commission: Math.max(0, Math.min(100, commission)) }
          : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(professional.id, assignedServices);
      onClose();
    } catch (error) {
      console.error('Error saving services:', error);
      alert('Erro ao salvar serviços. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          Comissões de {professional.name}
        </h3>

        <div className="space-y-3 mb-6">
          {assignedServices.map(serviceAssignment => {
            const service = services.find(s => s.id === serviceAssignment.serviceId);
            if (!service) return null;

            return (
              <div key={service.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">{service.name}</div>
                  <div className="text-sm text-gray-600">
                    R$ {service.price.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Comissão (%):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={serviceAssignment.commission}
                    onChange={(e) => handleCommissionChange(service.id, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            );
          })}

          {assignedServices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum serviço atribuído a este profissional
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Services Assignment Modal Component
function ServicesAssignmentModal({
  professional,
  services,
  onClose,
  onUpdate,
  loadProfessionalServices
}: {
  professional: Professional;
  services: Service[];
  onClose: () => void;
  onUpdate: (professionalId: string, serviceIds: string[]) => Promise<void>;
  loadProfessionalServices: (professionalId: string) => Promise<string[]>;
}) {
  const [assignedServices, setAssignedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAssignedServices();
  }, [professional.id]);

  const loadAssignedServices = async () => {
    try {
      const assigned = await loadProfessionalServices(professional.id);
      setAssignedServices(assigned);
    } catch (error) {
      console.error('Error loading assigned services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setAssignedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(professional.id, assignedServices);
      onClose();
    } catch (error) {
      console.error('Error saving services:', error);
      alert('Erro ao salvar serviços. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          Serviços de {professional.name}
        </h3>

        <div className="space-y-3 mb-6">
          {services.map(service => (
            <label key={service.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={assignedServices.includes(service.id)}
                onChange={() => handleServiceToggle(service.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{service.name}</div>
                <div className="text-sm text-gray-600">
                  R$ {service.price.toFixed(2)} • {service.duration_minutes} min
                </div>
              </div>
            </label>
          ))}

          {services.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum serviço disponível
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}