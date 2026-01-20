
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionStatus, TransactionType, User } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, History, Calculator, Crown, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  currentMonth: string;
  onManageAccount: () => void;
  onNavigateToTransactions: () => void;
  userStatus?: 'active' | 'inactive' | 'trial' | 'free';
  user: User;
}

const DashboardHome: React.FC<Props> = ({ transactions, currentMonth, onManageAccount, onNavigateToTransactions, userStatus, user }) => {
  // Estado para forçar atualização a cada segundo e manter o relógio preciso
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Atualiza o estado 'now' a cada segundo para o cronômetro funcionar
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Comparação de datas para lógica de exibição
  const [selectedYear, selectedMonthInt] = currentMonth.split('-').map(Number);
  const currentYear = now.getFullYear();
  const currentMonthReal = now.getMonth() + 1;

  // Verifica se o mês selecionado é futuro
  const isFutureMonth = selectedYear > currentYear || (selectedYear === currentYear && selectedMonthInt > currentMonthReal);

  // 1. CÁLCULO DE SALDO ANTERIOR (Acumulado até o início do mês selecionado)
  const previousBalance = transactions
    .filter(t => t.date < `${currentMonth}-01` && t.status === TransactionStatus.REALIZED)
    .reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);

  // Filtro do mês atual (selecionado na UI)
  const currentMonthTxs = transactions.filter(t => t.date.startsWith(currentMonth));

  // 2. DADOS REALIZADOS DO MÊS (Valores Puros do Mês)
  const rawIncomeRealized = currentMonthTxs
    .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.REALIZED)
    .reduce((acc, t) => acc + t.amount, 0);

  const expenseRealized = currentMonthTxs
    .filter(t => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.REALIZED)
    .reduce((acc, t) => acc + t.amount, 0);

  // Receita Realizada EXIBIDA
  // Soma o saldo anterior APENAS se NÃO for mês futuro
  const incomeRealizedDisplay = rawIncomeRealized + (isFutureMonth ? 0 : previousBalance);
  
  // Saldo Realizado = (Receitas [incluindo anterior] - Despesas)
  const balanceRealized = incomeRealizedDisplay - expenseRealized;

  // 3. DADOS TOTAIS/PROJETADOS DO MÊS (Valores Puros do Mês)
  const rawIncomeTotal = currentMonthTxs
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  const expenseTotal = currentMonthTxs
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => acc + t.amount, 0);

  // Receita Projetada EXIBIDA
  // Soma o saldo anterior APENAS se NÃO for mês futuro (mantendo a regra do realizado)
  const incomeTotalDisplay = rawIncomeTotal + (isFutureMonth ? 0 : previousBalance);

  // Saldo Projetado = (Receita Projetada [incluindo anterior] - Despesa Projetada)
  const balanceTotal = incomeTotalDisplay - expenseTotal;

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const isPro = userStatus === 'active';
  
  // Lógica de Tempo Restante Precisa
  let trialText = '';
  let isTrialExpired = false;

  if (userStatus === 'trial' && user?.subscription_end_date) {
      const end = new Date(user.subscription_end_date);
      const diffMs = end.getTime() - now.getTime(); // Diferença exata em milissegundos
      
      if (diffMs <= 0) {
          isTrialExpired = true;
          trialText = 'Período de teste expirado';
      } else {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

          if (days > 0) {
              trialText = `Teste grátis: resta ${days} dia${days > 1 ? 's' : ''} e ${hours}h`;
          } else {
              // Contagem regressiva final (menos de 24h)
              trialText = `Expira em: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          }
      }
  }

  // Se o status for trial mas o cálculo diz que expirou, visualmente tratamos como expirado imediatamente
  const showExpiredBanner = userStatus === 'trial' && isTrialExpired;

  return (
    <div className="space-y-4 pb-20 animate-fade-in">

      {/* UPGRADE BANNER */}
      {!isPro && (
        <button
          onClick={onManageAccount}
          className={`w-full rounded-2xl p-4 text-white shadow-lg flex flex-col justify-between group relative overflow-hidden transition-all ${showExpiredBanner ? 'bg-gradient-to-r from-red-500 to-pink-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
          
          <div className="flex items-center justify-between w-full z-10 mb-2">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  {showExpiredBanner ? (
                      <AlertTriangle size={24} className="text-yellow-300" fill="currentColor" />
                  ) : (
                      <Crown size={24} className="text-yellow-300" fill="currentColor" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-black text-sm uppercase tracking-wide">
                      {showExpiredBanner ? 'Teste Expirado' : 'Seja Pro'}
                  </p>
                  <p className="text-[10px] text-white/90 font-medium">
                      {showExpiredBanner ? 'Para continuar usando, ative o Plano Pro.' : 'Ative seu acesso total ao DUO.'}
                  </p>
                </div>
              </div>
              <div className="bg-white text-indigo-600 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow-sm group-hover:scale-105 transition-transform">
                {showExpiredBanner ? 'Ativar Agora' : 'Upgrade'}
              </div>
          </div>
          
          {userStatus === 'trial' && (
             <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 w-full mt-1 border ${showExpiredBanner ? 'bg-red-900/30 border-red-400/30' : 'bg-white/10 border-white/10'}`}>
                 <Clock size={14} className={showExpiredBanner ? "text-white" : "text-yellow-300"} />
                 <span className="text-[11px] font-bold text-white tabular-nums">
                    {trialText}
                 </span>
             </div>
          )}
        </button>
      )}

      {/* CARD 1: REALIZADO (Verde) */}
      <div 
        onClick={onNavigateToTransactions}
        className="bg-[#26a69a] rounded-3xl p-6 text-white shadow-lg shadow-[#26a69a]/30 relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
      >
        {/* Header do Card */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2 opacity-90">
            <Wallet size={20} />
            <span className="text-sm font-medium">
                Saldo Atual (Realizado)
            </span>
          </div>

          {/* Saldo Anterior Badge (Informativo) */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 opacity-70">
              <History size={12} />
              <span className="text-[10px] font-bold uppercase">Saldo Anterior</span>
            </div>
            <div className="bg-white/20 px-2 py-1 rounded-lg">
              <span className="text-xs font-bold">{formatMoney(previousBalance)}</span>
            </div>
          </div>
        </div>

        {/* Valor Principal */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold tracking-tight">{formatMoney(balanceRealized)}</h2>
          {isFutureMonth && (
              <p className="text-[10px] text-white/80 mt-1 font-medium">
                  * Não inclui saldo anterior (Mês Futuro).
              </p>
          )}
        </div>

        {/* Resumo Realizado */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 bg-white/10 p-2 pr-4 rounded-xl flex-1">
            <div className="bg-white/20 p-2 rounded-full">
              <ArrowUpCircle size={20} className="text-green-100" />
            </div>
            <div>
              <p className="text-[10px] text-green-100 uppercase font-bold opacity-80">
                 Receitas
                 {(!isFutureMonth && previousBalance !== 0) && <span className="text-[8px] ml-1">(+Ant)</span>}
              </p>
              <p className="font-bold text-sm">{formatMoney(incomeRealizedDisplay)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-2 pr-4 rounded-xl flex-1">
            <div className="bg-white/20 p-2 rounded-full">
              <ArrowDownCircle size={20} className="text-red-100" />
            </div>
            <div>
              <p className="text-[10px] text-red-100 uppercase font-bold opacity-80">Despesas</p>
              <p className="font-bold text-sm">{formatMoney(expenseRealized)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: PROJEÇÃO (Neutro/Branco) */}
      <div 
        onClick={onNavigateToTransactions}
        className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm cursor-pointer transition-all hover:border-indigo-200 hover:shadow-md active:scale-95"
      >
        <div className="flex items-center gap-2 mb-4 text-gray-500">
          <Calculator size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">
             SALDO PROJETADO
          </span>
        </div>

        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-3xl font-bold text-gray-700">{formatMoney(balanceTotal)}</p>
            <p className="text-[10px] text-gray-400 mt-1 font-medium">
              (Considerando pendências)
            </p>
          </div>
          <div className={`text-xs font-bold px-2 py-1 rounded-lg ${balanceTotal >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {balanceTotal >= 0 ? 'Positivo' : 'Negativo'}
          </div>
        </div>

        {/* Resumo Projetado */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-bold">
               Receita Total
               {(!isFutureMonth && previousBalance !== 0) && <span className="text-[8px] text-gray-300 ml-1">(+Ant)</span>}
            </p>
            <p className="text-sm font-bold text-green-600">{formatMoney(incomeTotalDisplay)}</p>
            <div className="w-full bg-green-100 h-1 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full" style={{ width: `${incomeTotalDisplay > 0 ? (incomeRealizedDisplay / incomeTotalDisplay) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Despesa Total</p>
            <p className="text-sm font-bold text-red-600">{formatMoney(expenseTotal)}</p>
            <div className="w-full bg-red-100 h-1 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full" style={{ width: `${expenseTotal > 0 ? (expenseRealized / expenseTotal) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardHome;
