
import * as React from 'react';
import { X, Heart, Link2, Unlink, Loader2, Check, User as UserIcon, CreditCard, Shield, AlertTriangle, Edit2, Phone, Mail, Save, Copy, Camera, Calendar, HelpCircle, MessageCircle, FileText, Lock } from 'lucide-react';
import { User } from '../types';
import { connectPartnerByEmail, disconnectPartner, updateUserProfile, manageSubscription, createStripeCheckoutSession } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partnerId?: string;
  partnerName?: string;
  onConnectionChange: () => void;
  onUpdateUser: (updatedUser: User) => void;
  onTermsClick: () => void;
  onPrivacyClick: () => void;
}

const AccountSettings: React.FC<Props> = ({ isOpen, onClose, currentUser, partnerId, partnerName, onConnectionChange, onUpdateUser, onTermsClick, onPrivacyClick }) => {
  const [activeTab, setActiveTab] = React.useState<'profile' | 'plan' | 'partner'>('profile');
  const [partnerEmail, setPartnerEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = React.useState('');
  const [now, setNow] = React.useState(new Date());

  // Edit Profile States
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(currentUser.name);
  const [editPhone, setEditPhone] = React.useState(currentUser.phone || '');
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'success'>('idle');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
        setMsg('');
        setStatus('idle');
        setPartnerEmail('');
        setActiveTab('profile');
        setIsEditing(false);
        setEditName(currentUser.name);
        setEditPhone(currentUser.phone || '');
        setNow(new Date()); 
    }
    
    let timer: any;
    if (isOpen && currentUser.subscription_status === 'trial') {
        timer = setInterval(() => setNow(new Date()), 1000);
    }
    return () => {
        if(timer) clearInterval(timer);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!partnerEmail.trim()) return;
    setStatus('loading');
    const result = await connectPartnerByEmail(currentUser.id, partnerEmail.trim().toLowerCase());
    if (result.success) {
        setStatus('success');
        setMsg(result.message);
        setTimeout(() => {
            onConnectionChange();
        }, 1500);
    } else {
        setStatus('error');
        setMsg(result.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar? As contas deixarão de ser sincronizadas.')) return;
    setStatus('loading');
    const result = await disconnectPartner(currentUser.id);
    if (result.success) {
        setStatus('success');
        setMsg(result.message);
        setTimeout(() => {
            onConnectionChange();
        }, 1500);
    } else {
        setStatus('error');
        setMsg(result.message);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          if (file.size > 1024 * 1024) { 
              alert("A imagem é muito grande. Escolha uma menor que 1MB.");
              return;
          }

          const reader = new FileReader();
          reader.onload = async (ev) => {
              const base64 = ev.target?.result as string;
              // Save immediately
              const result = await updateUserProfile(currentUser.id, {
                  name: currentUser.name,
                  phone: currentUser.phone,
                  avatar_url: base64
              });
              if(result.success && result.user) {
                  onUpdateUser(result.user);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveProfile = async () => {
      if (!editName.trim()) {
          alert("Nome é obrigatório");
          return;
      }
      setSaveStatus('saving');
      const result = await updateUserProfile(currentUser.id, {
          name: editName.trim(),
          phone: editPhone.trim()
      });

      if (result.success && result.user) {
          setSaveStatus('success');
          onUpdateUser(result.user);
          setTimeout(() => {
              setIsEditing(false);
              setSaveStatus('idle');
          }, 1000);
      } else {
          alert(result.message);
          setSaveStatus('idle');
      }
  };

  const handleSubscribe = async () => {
      setStatus('loading');
      const result = await createStripeCheckoutSession(currentUser);
      
      if (result.url) {
        window.location.href = result.url;
      } else {
        alert("Erro ao iniciar pagamento: " + (result.error || "Tente novamente mais tarde."));
        setStatus('idle');
      }
  };

  const handleSupportContact = () => {
      const message = "Olá, gostaria de falar sobre minha assinatura do Duo Finanças.";
      const url = `https://wa.me/5551982888705?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                    .replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Vitalício';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Calculate remaining trial logic
  let trialLabel = 'Free';
  let isTrialExpired = false;

  if (currentUser.subscription_status === 'trial' && currentUser.subscription_end_date) {
      const end = new Date(currentUser.subscription_end_date);
      const diffMs = end.getTime() - now.getTime();
      
      if (diffMs <= 0) {
          isTrialExpired = true;
          trialLabel = 'Expirado';
      } else {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          if (days > 0) {
               trialLabel = `${days}d ${hours}h`;
          } else {
               trialLabel = `${hours}h ${minutes}m`;
          }
      }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#dce775] px-6 py-4 flex justify-between items-center text-[#827717] border-b border-[#c0ca33]">
          <div className="flex items-center gap-2">
            <UserIcon size={20} />
            <h2 className="text-lg font-bold">Minha Conta</h2>
          </div>
          <button onClick={onClose} className="text-[#827717]/80 hover:text-[#827717] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-3 text-xs font-bold text-center transition-colors uppercase ${activeTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                Perfil
            </button>
            <button 
                onClick={() => setActiveTab('plan')}
                className={`flex-1 py-3 text-xs font-bold text-center transition-colors uppercase ${activeTab === 'plan' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                Plano
            </button>
            <button 
                onClick={() => setActiveTab('partner')}
                className={`flex-1 py-3 text-xs font-bold text-center transition-colors uppercase ${activeTab === 'partner' ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                Casal
            </button>
        </div>

        <div className="p-6 overflow-y-auto">
          
          {/* ----- TAB: PERFIL ----- */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
                
                {/* Avatar Section */}
                <div className="flex justify-center">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                            {currentUser.avatar_url ? (
                                <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500 text-3xl font-black uppercase">
                                    {currentUser.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-colors"
                        >
                            <Camera size={14} />
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                    </div>
                </div>

                {/* Info / Edit */}
                <div className="bg-gray-50 rounded-xl p-1">
                    {!isEditing ? (
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{currentUser.name}</h3>
                                    <p className="text-sm text-gray-500">{currentUser.email}</p>
                                    {currentUser.phone && <p className="text-xs text-gray-400 mt-1">{currentUser.phone}</p>}
                                </div>
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="text-indigo-500 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3 animate-fade-in">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
                                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                                    <UserIcon size={16} className="text-gray-400" />
                                    <input 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="bg-transparent w-full text-sm font-medium text-gray-800 outline-none"
                                        placeholder="Seu nome"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Telefone</label>
                                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                                    <Phone size={16} className="text-gray-400" />
                                    <input 
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                                        className="bg-transparent w-full text-sm font-medium text-gray-800 outline-none"
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-2 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
                                    disabled={saveStatus === 'saving'}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSaveProfile}
                                    className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                    disabled={saveStatus === 'saving'}
                                >
                                    {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Salvar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={onTermsClick} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-500 flex flex-col items-center gap-1 transition-colors">
                        <FileText size={18} /> Termos
                    </button>
                    <button onClick={onPrivacyClick} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-500 flex flex-col items-center gap-1 transition-colors">
                        <Lock size={18} /> Privacidade
                    </button>
                </div>
            </div>
          )}

          {/* ----- TAB: PLANO ----- */}
          {activeTab === 'plan' && (
             <div className="space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-200/20 rounded-full -mr-10 -mt-10 blur-xl"></div>
                    
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Seu Plano</p>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-black text-gray-800">
                                {currentUser.subscription_status === 'active' ? 'Duo Pro' : 
                                 currentUser.subscription_status === 'trial' ? 'Período de Teste' : 'Gratuito'}
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${currentUser.subscription_status === 'active' ? 'bg-green-200 text-green-800' : isTrialExpired ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                                {currentUser.subscription_status === 'active' ? 'Ativo' : 
                                 currentUser.subscription_status === 'trial' ? trialLabel : 'Free'}
                            </span>
                        </div>

                        {currentUser.subscription_status === 'active' ? (
                            <div className="flex items-center gap-2 text-sm text-green-800 bg-white/50 p-2 rounded-lg">
                                <Calendar size={16} />
                                <span>Renova em: <b>{formatDate(currentUser.subscription_end_date)}</b></span>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500">
                                Aproveite todos os recursos desbloqueados no plano Pro.
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {currentUser.subscription_status !== 'active' && (
                        <button 
                            onClick={handleSubscribe}
                            disabled={status === 'loading'}
                            className="w-full py-3 bg-[#e91e63] hover:bg-[#d81b60] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-pink-200"
                        >
                            {status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                            ASSINAR PLANO PRO
                        </button>
                    )}

                    <button 
                        onClick={handleSupportContact}
                        className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <MessageCircle size={18} className="text-green-600" />
                        Falar com Suporte no WhatsApp
                    </button>
                    <p className="text-[10px] text-gray-400 text-center px-4">
                        Para cancelar, alterar plano ou resolver problemas de pagamento, fale diretamente com nossa equipe.
                    </p>
                </div>
             </div>
          )}

          {/* ----- TAB: CASAL (Partner) ----- */}
          {activeTab === 'partner' && (
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-[#fce4ec] rounded-full flex items-center justify-center mx-auto text-[#e91e63]">
                        <Heart size={24} className="fill-current" />
                    </div>
                    <p className="text-sm text-gray-600">
                        Conecte-se para somar as finanças.
                    </p>
                </div>
                
                {partnerId ? (
                    <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-pink-500 shadow-sm">
                            <Link2 size={24} />
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-pink-400 uppercase">Conectado com</p>
                            <p className="text-lg font-bold text-gray-800">{partnerName || 'Parceiro'}</p>
                        </div>
                        <button 
                            onClick={handleDisconnect}
                            disabled={status === 'loading'}
                            className="mt-2 text-xs text-red-500 font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                            <Unlink size={12} />
                            Desconectar conta
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail do Parceiro(a)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="email"
                                    value={partnerEmail}
                                    onChange={(e) => setPartnerEmail(e.target.value)}
                                    placeholder="Ex: amor@email.com"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#e91e63] transition-all text-sm font-medium"
                                />
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleConnect}
                            disabled={status === 'loading' || !partnerEmail.includes('@')}
                            className="w-full py-3 bg-[#e91e63] hover:bg-[#d81b60] text-white font-bold rounded-xl shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : <Link2 size={20} />}
                            Conectar Automaticamente
                        </button>
                    </div>
                )}

                {msg && (
                    <div className={`text-center text-xs font-bold p-3 rounded-lg ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {msg}
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
