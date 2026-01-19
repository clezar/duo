
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  currentMonth: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c'];

const ChartsView: React.FC<Props> = ({ transactions, currentMonth }) => {
  const [activeType, setActiveType] = useState<TransactionType>(TransactionType.INCOME);

  // Filter for current month AND Realized status only
  const currentMonthTxs = transactions.filter(t => 
    t.date.startsWith(currentMonth) && t.status === TransactionStatus.REALIZED
  );

  // --- DATA PROCESSING ---

  // 1. By Category
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    currentMonthTxs
      .filter(t => t.type === activeType)
      .forEach(t => {
        const current = map.get(t.category) || 0;
        map.set(t.category, current + t.amount);
      });
    
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTxs, activeType]);

  const total = useMemo(() => 
    categoryData.reduce((acc, curr) => acc + curr.value, 0)
  , [categoryData]);

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="px-2 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Análises Gráficas</h2>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider border border-gray-200 px-2 py-1 rounded-lg">
            Realizado
        </span>
      </div>

      {/* Type Toggle Buttons */}
      <div className="flex bg-gray-100 p-1 rounded-xl mx-2">
        <button
          onClick={() => setActiveType(TransactionType.INCOME)}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeType === TransactionType.INCOME 
              ? 'bg-white text-green-600 shadow-sm' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Receitas
        </button>
        <button
          onClick={() => setActiveType(TransactionType.EXPENSE)}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeType === TransactionType.EXPENSE 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Despesas
        </button>
      </div>

      {/* Charts Area */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 min-h-[300px] flex flex-col items-center justify-center relative">
        
        {total === 0 ? (
          <div className="text-center">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Wallet size={24} className="text-gray-300" />
             </div>
             <p className="text-gray-400 text-sm italic">Sem dados realizados neste período.</p>
          </div>
        ) : (
          <>
            {/* Total Value Display (Above Chart) */}
            <div className="text-center mb-4">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                  Total Realizado
                </p>
                <p className={`text-3xl font-black ${activeType === TransactionType.EXPENSE ? 'text-red-600' : 'text-green-600'}`}>
                  {formatMoney(total)}
                </p>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="w-full space-y-3 mt-4">
              {categoryData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-gray-600 font-medium truncate">{entry.name}</span>
                  </div>
                  <span className="font-bold text-gray-800">{formatMoney(entry.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChartsView;
