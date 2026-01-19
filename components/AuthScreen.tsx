
import * as React from 'react';
import { User } from '../types';
import { loginUser, registerUser, resetPassword } from '../services/storageService';
import { Lock, User as UserIcon, LogIn, UserPlus, AlertCircle, CheckCircle2, Loader2, Phone, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { APP_LOGO_AUTH } from '../constants';

interface Props {
  onLoginSuccess: (user: User) => void;
  onTermsClick?: () => void;
  onPrivacyClick?: () => void;
}

const AuthScreen: React.FC<Props> = ({ onLoginSuccess, onTermsClick, onPrivacyClick }) => {
  const [view, setView] = React.useState<'login' | 'register' | 'forgot'>('login');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState(''); 
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false); 
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
        .replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (view === 'login') {
        const result = await loginUser(email.trim(), password);
        if (result.success && result.user) {
          onLoginSuccess(result.user);
        } else {
          setError(String(result.message));
        }
      } else if (view === 'register') {
        const nameParts = name.trim().split(/\s+/);
        if (nameParts.length < 2) {
          setError("Por favor, digite seu nome completo.");
          setLoading(false);
          return;
        }

        if (!name.trim()) {
          setError("Nome é obrigatório");
          setLoading(false);
          return;
        }
        if (!phone.trim()) {
          setError("Telefone é obrigatório");
          setLoading(false);
          return;
        }
        // Password Match Validation
        if (password !== confirmPassword) {
          setError("As senhas não coincidem.");
          setLoading(false);
          return;
        }

        const result = await registerUser(name.trim(), email.trim(), phone.trim(), password);
        if (result.success) {
          setSuccessMsg('Conta criada! Faça login.');
          setTimeout(() => {
            setView('login');
            setPassword('');
            setConfirmPassword(''); 
            setSuccessMsg('');
          }, 1500);
        } else {
          setError(String(result.message));
        }
      } else if (view === 'forgot') {
        if (!email.trim()) {
          setError("Digite seu e-mail.");
          setLoading(false);
          return;
        }
        const result = await resetPassword(email.trim());
        if (result.success) {
          setSuccessMsg(result.message || 'Instruções enviadas.');
          setTimeout(() => setView('login'), 3000);
        } else {
          setError(result.message || 'Erro ao resetar.');
        }
      }
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView: 'login' | 'register' | 'forgot') => {
    setView(newView);
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">

        <div className="pt-10 pb-6 flex flex-col items-center justify-center">
          <img
            src={APP_LOGO_AUTH}
            className="h-32 w-auto object-contain mb-4"
            alt="Logo"
          />
          <h2 className="text-2xl font-bold text-gray-800">
            {view === 'login' && ''}
            {view === 'register' && ''}
            {view === 'forgot' && 'Recuperar Senha'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {view === 'login' && 'Gerencie suas finanças a dois.'}
            {view === 'register' && 'Comece a organizar hoje.'}
            {view === 'forgot' && 'Não se preocupe, acontece.'}
          </p>
        </div>

        <div className="px-8 pb-4">
          <form onSubmit={handleSubmit} className="space-y-4">

            {view === 'register' && (
              <div className="space-y-1">
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-gray-700"
                    placeholder="Nome Completo"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-gray-700"
                  placeholder="Seu e-mail"
                  required
                />
              </div>
            </div>

            {view === 'register' && (
              <div className="space-y-1">
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-gray-700"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>
            )}

            {view !== 'forgot' && (
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-gray-700"
                    placeholder="Sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {view === 'register' && (
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-gray-700"
                    placeholder="Confirme sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {view === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-xs text-indigo-600 font-bold hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2 animate-shake">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#827717] hover:bg-[#9e9d24] text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all flex justify-center gap-2 items-center disabled:opacity-70 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {view === 'login' ? 'Entrar' : view === 'register' ? 'Criar Conta' : 'Enviar Link'}
                </>
              )}
            </button>

            {view === 'login' ? (
              <p className="text-center text-xs text-gray-500 mt-4">
                Não tem uma conta?{' '}
                <button type="button" onClick={() => switchView('register')} className="text-indigo-600 font-bold hover:underline">
                  Cadastre-se
                </button>
              </p>
            ) : (
              <div className="text-center mt-4">
                <button type="button" onClick={() => switchView('login')} className="text-xs text-gray-500 font-bold hover:text-gray-800 flex items-center justify-center gap-1 mx-auto">
                  <ArrowLeft size={14} /> Voltar para Login
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="bg-gray-50 py-4 px-8 text-center text-[10px] text-gray-400 border-t border-gray-100 flex justify-center gap-4">
            <button onClick={onTermsClick} className="hover:text-indigo-600 transition-colors">Termos de Uso</button>
            <button onClick={onPrivacyClick} className="hover:text-indigo-600 transition-colors">Política de Privacidade</button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
