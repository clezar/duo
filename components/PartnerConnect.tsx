
import * as React from 'react';
import { X, Heart, Link2, Unlink, Loader2, Mail, Info } from 'lucide-react';
import { connectPartnerByEmail, disconnectPartner } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  partnerId?: string;
  partnerName?: string;
  onConnectionChange: () => void;
}

const PartnerConnect: React.FC<Props> = ({ isOpen, onClose, currentUserId, partnerId, partnerName, onConnectionChange }) => {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
        setMsg('');
        setStatus('idle');
        setEmail('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!email.trim()) return;
    setStatus('loading');
    
    const result = await connectPartnerByEmail(currentUserId, email.trim().toLowerCase());
    
    if (result.success) {
        setStatus('success');
        setMsg(result.message);
        setTimeout(() => {
            onConnectionChange();
            onClose();
            // Force reload to ensure fresh data and clean cache
            window.location.reload();
        }, 2000);
    } else {
        setStatus('error');
        setMsg(result.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar? Isso criará um novo grupo separado para você.')) return;
    setStatus('loading');
    const result = await disconnectPartner(currentUserId);
    if (result.success) {
        setStatus('success');
        setMsg(result.message);
        setTimeout(() => {
            onConnectionChange();
            onClose();
            window.location.reload();
        }, 1500);
    } else {
        setStatus('error');
        setMsg(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all scale-100">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Heart className="fill-current animate-pulse" size={24} />
            <h2 className="text-xl font-bold">Modo Casal</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors bg-white/10 rounded-full p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Status Message Overlay */}
          {msg && (
            <div className={`text-center text-xs font-bold p-3 rounded-xl animate-bounce ${status === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                {msg}
            </div>
          )}

          {partnerId ? (
             <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                    <Link2 size={32} />
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Status: Conectado</p>
                    <p className="text-xl font-black text-gray-800">Você & {partnerName || 'Parceiro(a)'}</p>
                    <p className="text-xs text-gray-500 mt-2 px-2">Suas finanças agora são compartilhadas em tempo real.</p>
                </div>
                <button 
                    onClick={handleDisconnect}
                    disabled={status === 'loading'}
                    className="mt-2 py-2 px-4 bg-white border border-red-200 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                >
                    <Unlink size={14} />
                    Desconectar contas
                </button>
             </div>
          ) : (
            <>
                <div className="bg-blue-50 p-3 rounded-xl flex gap-3 items-start">
                    <InfoClassIcon className="text-blue-500 mt-0.5 shrink-0" size={18} />
                    <p className="text-xs text-blue-800 leading-relaxed">
                        <span className="font-bold">Conexão Automática:</span> Digite o e-mail do seu amor. Se a conta existir, vocês serão conectados instantaneamente.
                    </p>
                </div>

                {/* Input Partner Email */}
                <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-400 uppercase ml-1">
                        E-mail do Parceiro(a)
                    </label>
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="amor@email.com"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm font-medium text-gray-700 placeholder-gray-400"
                            />
                        </div>
                        <button 
                            onClick={handleConnect}
                            disabled={status === 'loading' || !email.includes('@')}
                            className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : <Link2 size={20} />}
                            Conectar Agora
                        </button>
                    </div>
                </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper icon component
const InfoClassIcon = ({ className, size }: { className?: string, size?: number }) => (
    <Info className={className} size={size} />
);

export default PartnerConnect;
