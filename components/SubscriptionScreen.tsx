
import * as React from 'react';
import { User } from '../types';
import { createStripeCheckoutSession, logoutUser } from '../services/storageService';
import { Check, Star, Shield, Zap, Lock, CreditCard, LogOut, Loader2 } from 'lucide-react';
import { APP_LOGO_AUTH } from '../constants';

interface Props {
  user: User;
  onSuccess: (updatedUser: User) => void;
}

const SubscriptionScreen: React.FC<Props> = ({ user, onSuccess }) => {
  const [loading, setLoading] = React.useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    const result = await createStripeCheckoutSession(user);
    
    if (result.url) {
      // Redireciona para o Stripe
      window.location.href = result.url;
    } else {
      alert("Erro ao iniciar pagamento: " + (result.error || "Tente novamente mais tarde."));
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    window.location.reload();
  };

  const isExpired = user.subscription_status === 'inactive' || 
    (user.subscription_status === 'trial' && user.subscription_end_date && new Date(user.subscription_end_date) < new Date());

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
        
        <div className="pt-8 pb-4 text-center px-6">
          <img src={APP_LOGO_AUTH} className="h-16 w-auto mx-auto mb-4 drop-shadow-sm" alt="Logo" />
          <h1 className="text-2xl font-black text-gray-800 leading-tight">
            {isExpired ? (
                <>
                    Seu período de teste <br/>
                    <span className="text-red-500">Expirou</span>
                </>
            ) : (
                <>
                    Faça um Upgrade <br/>
                    <span className="text-indigo-500">Seja Pro</span>
                </>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {isExpired 
                ? "Obrigado por testar o DUO! Ative sua assinatura para continuar usando." 
                : "Desbloqueie todos os recursos e use sem limites."}
          </p>
        </div>

        <div className="px-8 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-700 rounded-full">
              <Zap size={18} fill="currentColor" />
            </div>
            <p className="text-sm font-medium text-gray-700">Modo Casal: Sincronização em tempo real</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-full">
              <Shield size={18} />
            </div>
            <p className="text-sm font-medium text-gray-700">Dados criptografados e seguros</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 text-yellow-700 rounded-full">
              <Star size={18} fill="currentColor" />
            </div>
            <p className="text-sm font-medium text-gray-700">Lançamentos ilimitados</p>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="mx-6 my-2 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl relative">
          <div className="absolute top-0 right-0 bg-[#dce775] text-[#827717] text-[10px] font-black uppercase px-2 py-1 rounded-bl-lg rounded-tr-lg shadow-sm">
            Preço Especial
          </div>
          <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">Plano Pro</p>
          <div className="flex items-end gap-1 mb-2">
            <span className="text-4xl font-black text-gray-800">R$ 4,99</span>
            <span className="text-sm text-gray-500 font-medium mb-1">/mês</span>
          </div>
          <p className="text-[11px] text-gray-400">Cancele quando quiser.</p>
        </div>

        <div className="p-6 pt-2">
          <button 
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all font-bold text-sm uppercase flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Redirecionando...
              </>
            ) : (
              <>
                <CreditCard size={18} /> Assinar Plano Pro
              </>
            )}
          </button>
          
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
            <Lock size={12} />
            Pagamento seguro via Stripe
          </div>
        </div>

        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-500 font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <LogOut size={12} /> Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionScreen;
