
import * as React from 'react';
import { User } from '../types';
import { getUsers, adminDeleteUser, adminUpdateUser } from '../services/storageService';
import { Trash2, User as UserIcon, Shield, Search, Loader2, Edit2, X, Save, Calendar, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  currentUser: User;
}

const AdminPanel: React.FC<Props> = ({ currentUser }) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  // Form states for editing
  const [editName, setEditName] = React.useState('');
  const [editStatus, setEditStatus] = React.useState('');
  const [editEndDate, setEditEndDate] = React.useState('');
  const [editDaysToAdd, setEditDaysToAdd] = React.useState(0);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza? Isso apagará o usuário e TODOS os dados dele permanentemente.')) {
      setLoading(true);
      await adminDeleteUser(id);
      await loadUsers();
    }
  };

  const handleEditClick = (user: User) => {
      setEditingUser(user);
      setEditName(user.name);
      setEditStatus(user.subscription_status);
      setEditEndDate(user.subscription_end_date ? user.subscription_end_date.split('T')[0] : '');
      setEditDaysToAdd(0);
  };

  const handleSaveEdit = async () => {
      if (!editingUser) return;
      setLoading(true);

      let newEndDate = editEndDate;
      if (editDaysToAdd !== 0 && editingUser.subscription_end_date) {
          const currentEnd = new Date(editingUser.subscription_end_date);
          currentEnd.setDate(currentEnd.getDate() + editDaysToAdd);
          newEndDate = currentEnd.toISOString();
      } else if (editEndDate) {
          // If manually changed date (from date input which is YYYY-MM-DD), append time
          if (editEndDate.indexOf('T') === -1) {
              newEndDate = new Date(editEndDate).toISOString();
          }
      }

      const updates = {
          name: editName,
          subscription_status: editStatus as any,
          subscription_end_date: newEndDate
      };

      const result = await adminUpdateUser(editingUser.id, updates);
      
      if (result.success) {
          await loadUsers();
          setEditingUser(null);
      } else {
          alert('Erro ao atualizar: ' + result.message);
      }
      setLoading(false);
  };

  const addDays = (days: number) => {
      setEditDaysToAdd(prev => prev + days);
  };

  // Safe filtering logic
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (u.name || '').toLowerCase().includes(term);
    const usernameMatch = (u.username || '').toLowerCase().includes(term);
    const emailMatch = (u.email || '').toLowerCase().includes(term);
    return nameMatch || usernameMatch || emailMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-yellow-400" size={28} />
          <h2 className="text-xl font-bold">Painel Administrativo</h2>
        </div>
        <p className="text-indigo-200 text-sm">Gerencie os usuários cadastrados no banco de dados.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, usuário ou email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
            />
          </div>
          <button 
             onClick={loadUsers} 
             className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
             title="Atualizar lista"
          >
             {loading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredUsers.map(user => (
            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${user.is_admin ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                  {user.is_admin ? <Shield size={20} /> : <UserIcon size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{user.name || 'Sem nome'}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-500">
                    <span className="font-mono bg-gray-100 px-1 rounded truncate max-w-[150px]">
                        {user.email || 'sem email'}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold w-fit ${user.subscription_status === 'active' ? 'bg-green-100 text-green-700' : user.subscription_status === 'trial' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.subscription_status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditClick(user)}
                    className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors bg-indigo-50 rounded-lg"
                    title="Editar Usuário"
                  >
                    <Edit2 size={18} />
                  </button>
                  {user.id !== currentUser.id && (
                    <button 
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors bg-red-50 rounded-lg"
                      title="Excluir Usuário"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
              <p>{users.length === 0 ? "Nenhum usuário carregado." : "Nenhum usuário encontrado na busca."}</p>
              
              {users.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-xs text-yellow-800 max-w-sm mt-4 text-left">
                      <div className="flex items-center gap-2 font-bold mb-2">
                          <AlertTriangle size={16} />
                          Atenção: Permissões RLS
                      </div>
                      <p className="mb-2">
                          Se você é Admin mas não vê outros usuários, é necessário configurar as Políticas de Segurança (RLS) no Supabase.
                      </p>
                      <p>Execute o SQL de permissão "Admins can view all profiles".</p>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                          <Edit2 size={18} /> Editar Usuário
                      </h3>
                      <button onClick={() => setEditingUser(null)} className="text-white/80 hover:text-white">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-5 overflow-y-auto">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                          <input 
                              type="text" 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status do Plano</label>
                          <select 
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                          >
                              <option value="trial">Trial (Teste)</option>
                              <option value="active">Active (Pro)</option>
                              <option value="free">Free (Gratuito)</option>
                              <option value="inactive">Inactive (Bloqueado)</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Expiração</label>
                          <div className="flex items-center gap-2">
                              <input 
                                  type="date" 
                                  value={editEndDate}
                                  onChange={(e) => setEditEndDate(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg"
                              />
                          </div>
                          {editingUser.subscription_status === 'trial' && (
                              <div className="flex gap-2 mt-2">
                                  <button onClick={() => addDays(7)} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100">+7 Dias</button>
                                  <button onClick={() => addDays(30)} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100">+30 Dias</button>
                                  {editDaysToAdd > 0 && <span className="text-xs text-green-600 font-bold self-center">+{editDaysToAdd} dias adicionados (ao salvar)</span>}
                              </div>
                          )}
                      </div>

                      <div className="pt-4 flex gap-3">
                          <button 
                              onClick={() => setEditingUser(null)}
                              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={handleSaveEdit}
                              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2"
                          >
                              <Save size={18} /> Salvar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;
