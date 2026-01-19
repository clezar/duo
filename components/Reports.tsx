
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calculator } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  currentMonth: string; // YYYY-MM
  categories: { INCOME: string[]; EXPENSE: string[] }; 
}

const Reports: React.FC<Props> = ({ transactions, currentMonth }) => {
  const [viewMode, setViewMode] = useState<'REALIZED' | 'TOTAL'>('REALIZED');
  
  const currentYear = currentMonth.split('-')[0];
  const formatMoney = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- DATA AGGREGATION ---
  const data = useMemo(() => {
    // 1. Calcular Saldo Anterior (Tudo realizado antes do ano atual)
    const previousBalance = transactions
        .filter(t => t.date < `${currentYear}-01-01` && t.status === TransactionStatus.REALIZED)
        .reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);

    // Inicializa receitas com o saldo anterior
    let realizedIncome = previousBalance;
    let realizedExpense = 0;
    let totalIncome = previousBalance;
    let totalExpense = 0;
    
    const catMap = new Map<string, { realized: number; total: number; type: TransactionType }>();

    transactions.forEach(t => {
        // Filter by Year
        if (!t.date.startsWith(currentYear)) return;

        const val = t.amount;
        const isRealized = t.status === TransactionStatus.REALIZED;
        
        // Aggregate Totals
        if (t.type === TransactionType.INCOME) {
            totalIncome += val;
            if (isRealized) realizedIncome += val;
        } else {
            totalExpense += val;
            if (isRealized) realizedExpense += val;
        }

        // Aggregate by Category
        if (!catMap.has(t.category)) {
            catMap.set(t.category, { realized: 0, total: 0, type: t.type });
        }
        const entry = catMap.get(t.category)!;
        entry.total += val;
        if (isRealized) entry.realized += val;
    });

    const categoryList = Array.from(catMap.entries())
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => {
        // 1. Primary Sort: Type (INCOME first)
        if (a.type !== b.type) {
            return a.type === TransactionType.INCOME ? -1 : 1;
        }

        // 2. Secondary Sort: Value (Highest first)
        const valA = viewMode === 'REALIZED' ? a.realized : a.total;
        const valB = viewMode === 'REALIZED' ? b.realized : b.total;
        return valB - valA;
      });

    return {
        realized: {
            income: realizedIncome,
            expense: realizedExpense,
            balance: realizedIncome - realizedExpense
        },
        total: {
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense
        },
        categories: categoryList
    };
  }, [transactions, currentYear, viewMode]);

  const activeSummary = viewMode === 'REALIZED' ? data.realized : data.total;
  const isRealizedView = viewMode === 'REALIZED';

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
        {/* Toggle & Title */}
        <div className="flex flex-col items-center gap-3 pt-2">
            <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-xs shadow-inner">
                <button
                    onClick={() => setViewMode('REALIZED')}
                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${isRealizedView ? 'bg-white text-[#26a69a] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Realizado
                </button>
                <button
                    onClick={() => setViewMode('TOTAL')}
                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${!isRealizedView ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Projetado
                </button>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Relatório Anual • {currentYear}
            </p>
        </div>

        {/* Main Summary Card - Matches DashboardHome Aesthetics */}
        <div className={`rounded-3xl p-6 shadow-lg transition-all duration-300 relative overflow-hidden ${isRealizedView ? 'bg-[#26a69a] text-white shadow-[#26a69a]/30' : 'bg-white text-gray-800 border border-gray-100'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 opacity-90">
                    {isRealizedView ? <Wallet size={20} /> : <Calculator size={20} className="text-gray-400" />}
                    <span className={`text-sm font-bold uppercase tracking-wider ${!isRealizedView ? 'text-gray-500' : ''}`}>
                        {isRealizedView ? 'Saldo Realizado' : 'Saldo Projetado'}
                    </span>
                </div>
            </div>

            <div className="mb-8">
                <h2 className={`text-4xl font-black tracking-tight ${!isRealizedView && activeSummary.balance < 0 ? 'text-red-500' : ''}`}>
                    {formatMoney(activeSummary.balance)}
                </h2>
            </div>

            <div className="flex justify-between items-center gap-4 flex-col sm:flex-row">
                {/* Income */}
                <div className={`flex items-center gap-3 p-2 pr-4 rounded-2xl flex-1 w-full transition-colors ${isRealizedView ? 'bg-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                    <div className={`p-2 rounded-full ${isRealizedView ? 'bg-white/20' : 'bg-green-100'}`}>
                        <ArrowUpCircle size={20} className={isRealizedView ? 'text-green-100' : 'text-green-600'} />
                    </div>
                    <div>
                        <p className={`text-[10px] uppercase font-bold opacity-80 ${isRealizedView ? 'text-green-100' : 'text-gray-400'}`}>Receitas</p>
                        <p className="font-bold text-sm">{formatMoney(activeSummary.income)}</p>
                    </div>
                </div>

                {/* Expense */}
                <div className={`flex items-center gap-3 p-2 pr-4 rounded-2xl flex-1 w-full transition-colors ${isRealizedView ? 'bg-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                    <div className={`p-2 rounded-full ${isRealizedView ? 'bg-white/20' : 'bg-red-100'}`}>
                        <ArrowDownCircle size={20} className={isRealizedView ? 'text-red-100' : 'text-red-600'} />
                    </div>
                    <div>
                        <p className={`text-[10px] uppercase font-bold opacity-80 ${isRealizedView ? 'text-red-100' : 'text-gray-400'}`}>Despesas</p>
                        <p className="font-bold text-sm">{formatMoney(activeSummary.expense)}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Breakdown List */}
        <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Categorias
                </h3>
            </div>
            
            {data.categories.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                    Nenhum dado encontrado para {currentYear}.
                </div>
            ) : (
                data.categories.map((cat) => {
                    const val = isRealizedView ? cat.realized : cat.total;
                    if (val === 0) return null; 
                    
                    // Simple progress bar relative to total income/expense of that type
                    // Note: activeSummary.income now includes previous balance, so percentage might be skewed if categories don't reflect that.
                    // Ideally previous balance shouldn't be a category, but part of the total.
                    // Here we keep it relative to total flow of that type for the year + prev balance.
                    const totalOfType = cat.type === TransactionType.INCOME ? activeSummary.income : activeSummary.expense;
                    const percent = totalOfType > 0 ? (val / totalOfType) : 0;
                    
                    return (
                        <div key={cat.name} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-700 text-sm">{cat.name}</span>
                                <span className={`font-bold text-sm ${cat.type === TransactionType.INCOME ? 'text-green-600' : 'text-gray-800'}`}>
                                    {formatMoney(val)}
                                </span>
                            </div>
                            
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden flex">
                                <div 
                                    className={`h-full rounded-full ${cat.type === TransactionType.INCOME ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(percent * 100, 100)}%` }}
                                />
                            </div>
                            
                            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                                <span>{cat.type === TransactionType.INCOME ? 'Entrada' : 'Saída'}</span>
                                <span>{(percent * 100).toFixed(1)}% do total</span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default Reports;
