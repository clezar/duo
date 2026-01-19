
import React, { useState } from 'react';
import { Goal } from '../types';
import { Plus, Target, Trash2, TrendingUp, PiggyBank, X, Check } from 'lucide-react';

interface Props {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoal: (id: string, amount: number) => void;
  onDeleteGoal: (id: string) => void;
}

const GoalsManager: React.FC<Props> = ({ goals, onAddGoal, onUpdateGoal, onDeleteGoal }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [type, setType] = useState<'SPENDING' | 'INVESTMENT'>('INVESTMENT');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !target) return;

    onAddGoal({
      title,
      targetAmount: parseFloat(target),
      currentAmount: parseFloat(current) || 0,
      type
    });

    setShowForm(false);
    setTitle('');
    setTarget('');
    setCurrent('');
  };

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-bold text-gray-800">Minhas Metas</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-xs font-bold uppercase"
        >
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 animate-fade-in-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">Criar Nova Meta</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400"><X size={20}/></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Título</label>
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ex: Viagem, Carro Novo, Mercado..." 
                required
              />
            </div>
            
            <div className="flex gap-2">
               <button 
                 type="button" 
                 onClick={() => setType('INVESTMENT')}
                 className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${type === 'INVESTMENT' ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-gray-400'}`}
               >
                 Investimento
               </button>
               <button 
                 type="button" 
                 onClick={() => setType('SPENDING')}
                 className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${type === 'SPENDING' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'border-gray-200 text-gray-400'}`}
               >
                 Gasto (Teto)
               </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Meta (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={target} 
                  onChange={e => setTarget(e.target.value)} 
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 transition-colors font-bold"
                  placeholder="0,00" 
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Atual (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={current} 
                  onChange={e => setCurrent(e.target.value)} 
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 transition-colors"
                  placeholder="0,00" 
                />
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
              Salvar Meta
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {goals.length === 0 && !showForm && (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
            <Target className="mx-auto text-gray-300 mb-2" size={48} />
            <p className="text-gray-400 text-sm">Nenhuma meta definida ainda.</p>
          </div>
        )}

        {goals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const isInvestment = goal.type === 'INVESTMENT';
          
          return (
            <div key={goal.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${isInvestment ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    {isInvestment ? <PiggyBank size={24} /> : <TrendingUp size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{goal.title}</h3>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{isInvestment ? 'Investimento' : 'Teto de Gasto'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onDeleteGoal(goal.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="mb-2 flex justify-between items-end">
                <span className="text-2xl font-bold text-gray-800">{formatMoney(goal.currentAmount)}</span>
                <span className="text-xs font-bold text-gray-400 mb-1">de {formatMoney(goal.targetAmount)}</span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isInvestment ? 'bg-green-500' : 'bg-orange-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                    onClick={() => {
                        const add = prompt("Adicionar valor:");
                        if(add) onUpdateGoal(goal.id, goal.currentAmount + parseFloat(add));
                    }}
                    className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-lg transition-colors"
                 >
                    + Adicionar
                 </button>
                 <button 
                    onClick={() => {
                        const sub = prompt("Remover valor:");
                        if(sub) onUpdateGoal(goal.id, goal.currentAmount - parseFloat(sub));
                    }}
                    className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-lg transition-colors"
                 >
                    - Retirar
                 </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GoalsManager;
