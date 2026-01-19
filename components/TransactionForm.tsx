
import * as React from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';
import { Save, X, Settings2, Calendar, Repeat, Hash } from 'lucide-react';

interface Props {
  onSave: (transaction: Omit<Transaction, 'id'>, recurrences?: number) => void;
  onUpdate: (id: string, transaction: Partial<Transaction>, updateRecurring?: boolean, newRecurrenceCount?: number) => void;
  onCancel: () => void;
  defaultMonth?: string;
  categories: { INCOME: string[]; EXPENSE: string[] };
  onManageCategories: () => void;
  initialData?: Transaction | null;
  initialCategory?: string;
  initialType?: TransactionType;
  currentRecurrenceCount?: number;
}

const TransactionForm: React.FC<Props> = ({ 
  onSave, 
  onUpdate, 
  onCancel, 
  defaultMonth, 
  categories, 
  onManageCategories,
  initialData,
  initialCategory,
  initialType,
  currentRecurrenceCount
}) => {
  // Inicializa a data principal
  const [date, setDate] = React.useState(() => {
    if (initialData) return initialData.date;
    const now = new Date();
    if (defaultMonth) {
        const [y, m] = defaultMonth.split('-').map(Number);
        if (y === now.getFullYear() && m === (now.getMonth() + 1)) {
            return `${y}-${String(m).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        } else {
             return `${defaultMonth}-01`;
        }
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  const [type, setType] = React.useState<TransactionType>(() => {
    if (initialData) return initialData.type;
    if (initialType) return initialType;
    return TransactionType.EXPENSE;
  });

  const [amount, setAmount] = React.useState(initialData ? initialData.amount.toString() : '');
  const [description, setDescription] = React.useState(initialData?.description || '');
  // Remove (1/X) from description for editing if present
  React.useEffect(() => {
    if (initialData && initialData.recurrenceId) {
        const cleanDesc = initialData.description.replace(/\s\(\d+\/\d+\)$/, '');
        setDescription(cleanDesc);
    }
  }, [initialData]);

  const [category, setCategory] = React.useState(() => {
    if (initialData) return initialData.category;
    if (initialCategory) return initialCategory;
    return '';
  });

  const [isRecurring, setIsRecurring] = React.useState(false);
  const [recurrenceMonths, setRecurrenceMonths] = React.useState(12);
  
  // Edit mode states
  const [updateRecurring, setUpdateRecurring] = React.useState(false);
  const [editRecurrenceTotal, setEditRecurrenceTotal] = React.useState(currentRecurrenceCount || 1);
  
  // Set default category
  React.useEffect(() => {
    const cats = type === TransactionType.INCOME ? categories.INCOME : categories.EXPENSE;
    if (category && cats.includes(category)) return;
    if (!category || !cats.includes(category)) setCategory(cats[0] || '');
  }, [type, categories]);

  React.useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
    if (initialType) setType(initialType);
  }, [initialCategory, initialType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    // Se estiver editando apenas uma, mantém a descrição original (se não foi alterada) ou usa a nova.
    // Se for recorrente, o App.tsx vai gerenciar a renumeração (X/Y).
    let finalDescription = description;
    if (initialData && !updateRecurring && initialData.recurrenceId) {
       // Se não vai atualizar a série toda, tentamos manter o sufixo original se o usuário não o apagou
       // Mas aqui o 'description' state está limpo. Então apenas enviamos o limpo e deixamos como está
       // Ou, idealmente, para edição única, o usuário edita o texto completo.
       // Simplificação: enviamos o texto limpo, o App que lide, ou o usuário edita.
       // Melhor UX: Ao editar APENAS UM, volta o sufixo original se o usuário não mudou tudo.
       // Mas vamos mandar o description como está no input.
    }

    const payload = {
      date,
      type,
      amount: parseFloat(amount.toString().replace(',', '.')) || 0,
      description: finalDescription,
      category,
      account: initialData?.account || 'Carteira',
      status: initialData ? initialData.status : TransactionStatus.PROJECTED,
      realizedDate: initialData?.realizedDate
    };

    if (initialData) {
      onUpdate(initialData.id, payload, updateRecurring, editRecurrenceTotal);
    } else {
      onSave(payload, isRecurring ? recurrenceMonths : 1);
    }
  };

  const availableCategories = type === TransactionType.INCOME ? categories.INCOME : categories.EXPENSE;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] w-full">
      <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">
          {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
        
        {/* Type Switch */}
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="type" 
              checked={type === TransactionType.EXPENSE} 
              onChange={() => setType(TransactionType.EXPENSE)}
              className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 bg-white"
            />
            <span className="text-sm font-medium text-gray-700">Despesa</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="type" 
              checked={type === TransactionType.INCOME} 
              onChange={() => setType(TransactionType.INCOME)}
              className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 bg-white"
            />
            <span className="text-sm font-medium text-gray-700">Receita</span>
          </label>
        </div>

        {/* Category */}
        <div>
          <div className="flex justify-between items-center mb-1">
             <label className="block text-xs font-bold text-gray-500 uppercase">Categoria</label>
             <button 
               type="button" 
               onClick={onManageCategories}
               className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 hover:underline"
             >
               <Settings2 size={12} />
               Gerenciar
             </button>
          </div>
          <div className="relative">
              <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-700 appearance-none font-medium"
              >
              {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
              ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-800 placeholder-gray-300 font-medium"
            placeholder="Ex: Aluguel, Salário..."
          />
        </div>

        {/* Amount & Date/Recurrence Logic */}
        <div className={`grid gap-4 grid-cols-2`}>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-bold text-gray-800 placeholder-gray-300"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                {isRecurring ? 'Data 1ª Parcela' : 'Data'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-700 font-medium"
              />
            </div>
        </div>

        {/* Recurring Section (New Mode) */}
        {!initialData && (
          <div className={`p-4 rounded-xl border transition-all ${isRecurring ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input 
                  type="checkbox" 
                  checked={isRecurring} 
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex flex-col flex-1">
                <span className="text-sm font-bold text-gray-700">Repetir Lançamento?</span>
                <span className="text-[10px] text-gray-500 font-medium">Cria parcelas automaticamente</span>
              </div>
            </label>

            {isRecurring && (
              <div className="animate-fade-in flex flex-col gap-4 pt-2 border-t border-indigo-100">
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase mb-1">Repetir por (Meses)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="2" 
                      max="60" 
                      value={recurrenceMonths} 
                      onChange={(e) => setRecurrenceMonths(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg outline-none font-bold text-indigo-900 text-sm focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editing Recurring Transaction */}
        {initialData && initialData.recurrenceId && (
           <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={updateRecurring} 
                    onChange={(e) => setUpdateRecurring(e.target.checked)}
                    className="w-5 h-5 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
                />
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-bold text-yellow-900">Aplicar a todas as parcelas?</span>
                  <span className="text-[10px] text-yellow-700 font-medium">Atualiza série inteira</span>
                </div>
              </label>

              {updateRecurring && (
                <div className="pt-2 border-t border-yellow-200 animate-fade-in">
                    <label className="block text-[10px] font-black text-yellow-700 uppercase mb-1 flex items-center gap-1">
                        <Hash size={10} />
                        Total de Parcelas
                    </label>
                    <input 
                        type="number" 
                        min="1" 
                        max="60"
                        value={editRecurrenceTotal}
                        onChange={(e) => setEditRecurrenceTotal(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-white border border-yellow-300 text-yellow-900 font-bold rounded-lg focus:ring-2 focus:ring-yellow-500/50 outline-none"
                    />
                    <p className="text-[10px] text-yellow-600 mt-1">
                        Ao alterar, novas parcelas serão criadas ou removidas do final.
                    </p>
                </div>
              )}
           </div>
        )}

        {/* Actions */}
        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-3 bg-[#dce775] text-[#827717] font-bold rounded-lg hover:bg-[#d4e157] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Save size={20} />
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
