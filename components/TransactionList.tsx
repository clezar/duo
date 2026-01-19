
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';
import { CheckCircle, Trash2, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Edit2, Plus, Users } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  currentUserId: string;
  onToggleStatus: (id: string, currentStatus: TransactionStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onAddTransactionToCategory: (category: string, type: TransactionType) => void;
}

const TransactionList: React.FC<Props> = ({ 
  transactions, 
  currentUserId,
  onToggleStatus, 
  onDelete, 
  onEdit,
  onAddTransactionToCategory
}) => {
  // Alterado de false para true para iniciar aberto
  const [openSections, setOpenSections] = useState({
    income: true,
    expense: true,
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleSection = (section: 'income' | 'expense') => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };

  const groupedByType = useMemo(() => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE);
    return { income, expense };
  }, [transactions]);

  const groupByCategory = (items: Transaction[]) => {
    const groups: Record<string, Transaction[]> = {};
    items.forEach(t => {
      if (!groups[t.category]) {
        groups[t.category] = [];
      }
      groups[t.category].push(t);
    });
    return groups;
  };

  const renderGroup = (
    mainTitle: string, 
    items: Transaction[], 
    isOpen: boolean, 
    onToggle: () => void, 
    icon: React.ReactNode, 
    colorClass: string,
    type: TransactionType
  ) => {
    const totalGroup = items.reduce((acc, t) => acc + t.amount, 0);
    const categoryGroups = groupByCategory(items);
    const sortedCategories = Object.keys(categoryGroups).sort();

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <button 
          onClick={onToggle}
          className={`w-full flex items-center justify-between p-4 ${isOpen ? 'bg-gray-50 border-b border-gray-200' : 'bg-white'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
               {icon}
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-700 text-lg">{mainTitle}</h3>
              <p className="text-xs text-gray-400">{items.length} lançamentos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className={`font-bold text-lg ${colorClass.replace('text-', '')}`}>{formatMoney(totalGroup)}</span>
             {isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
          </div>
        </button>

        {isOpen && (
          <div className="pb-2 bg-gray-50/50">
            {items.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm italic">
                Nenhum lançamento nesta seção.
              </div>
            ) : (
              sortedCategories.map(catName => {
                const catItems = categoryGroups[catName];
                const catTotal = catItems.reduce((acc, t) => acc + t.amount, 0);
                const isCatExpanded = expandedCategories[catName];

                return (
                  <div key={catName} className="mb-2 bg-white border-b border-gray-100 last:border-0 last:mb-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div 
                        onClick={() => toggleCategory(catName)}
                        className="flex items-center justify-between px-4 py-3 bg-gray-100/50 border-l-4 border-l-indigo-300 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                             {isCatExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                             <h4 className="font-bold text-xs text-gray-600 uppercase tracking-wider">{catName}</h4>
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddTransactionToCategory(catName, type);
                                }}
                                className="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-1 rounded-full transition-colors ml-2"
                                title={`Adicionar novo em ${catName}`}
                             >
                                <Plus size={12} strokeWidth={3} />
                             </button>
                        </div>
                        <span className="font-bold text-sm text-gray-700">{formatMoney(catTotal)}</span>
                    </div>

                    {isCatExpanded && (
                        <div className="divide-y divide-gray-50 pl-2 animate-fade-in">
                            {catItems.map(t => {
                                const isOwner = !t.userId || t.userId === currentUserId;
                                return (
                                <div key={t.id} className={`p-3 pl-4 flex items-center justify-between hover:bg-gray-50 group transition-colors ${!isOwner ? 'bg-indigo-50/20' : ''}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleStatus(t.id, t.status);
                                    }}
                                    className={`flex-shrink-0 transition-all cursor-pointer ${
                                      t.status === TransactionStatus.REALIZED ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'
                                    }`}
                                    title="Alterar status"
                                    >
                                    <CheckCircle size={20} fill={t.status === TransactionStatus.REALIZED ? "currentColor" : "none"} />
                                    </button>
                                    
                                    <div className="min-w-0 flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium text-sm truncate ${t.status === TransactionStatus.REALIZED ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                            {t.description}
                                        </span>
                                        {!isOwner && (
                                            <span className="flex items-center gap-1 text-indigo-400 text-[10px]" title="Criado pelo parceiro">
                                                <Users size={10} />
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400">
                                        {formatDate(t.date)}
                                    </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 ml-2">
                                    <span className={`font-semibold text-sm ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-gray-800'}`}>
                                    {t.type === TransactionType.EXPENSE && '- '}
                                    {formatMoney(t.amount)}
                                    </span>
                                    
                                    <div className="flex items-center">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(t);
                                        }}
                                        className="text-blue-400 hover:text-blue-600 p-2 cursor-pointer"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(t.id);
                                        }}
                                        className="text-red-400 hover:text-red-600 p-2 cursor-pointer"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    </div>
                                </div>
                                </div>
                            )})}
                        </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-20">
      {renderGroup(
        'Entradas', 
        groupedByType.income, 
        openSections.income, 
        () => toggleSection('income'), 
        <TrendingUp size={24} className="text-green-600" />,
        'text-green-600',
        TransactionType.INCOME
      )}
      
      {renderGroup(
        'Saídas', 
        groupedByType.expense, 
        openSections.expense, 
        () => toggleSection('expense'), 
        <TrendingDown size={24} className="text-red-600" />,
        'text-red-600',
        TransactionType.EXPENSE
      )}
    </div>
  );
};

export default TransactionList;
