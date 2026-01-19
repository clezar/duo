import * as React from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { TransactionType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: { INCOME: string[]; EXPENSE: string[] };
  onUpdateCategories: (newCategories: { INCOME: string[]; EXPENSE: string[] }, oldName?: string, newName?: string) => void;
}

const CategoryManager: React.FC<Props> = ({ isOpen, onClose, categories, onUpdateCategories }) => {
  const [activeType, setActiveType] = React.useState<TransactionType>(TransactionType.EXPENSE);
  const [newCategory, setNewCategory] = React.useState('');
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState('');

  // Reset editing state when tab changes to avoid index conflicts
  React.useEffect(() => {
    setEditingIndex(null);
    setEditValue('');
  }, [activeType, isOpen]);

  if (!isOpen) return null;

  const currentList = activeType === TransactionType.EXPENSE ? categories.EXPENSE : categories.INCOME;

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    const updated = { ...categories };
    if (activeType === TransactionType.EXPENSE) {
      updated.EXPENSE = [...updated.EXPENSE, newCategory.trim()];
    } else {
      updated.INCOME = [...updated.INCOME, newCategory.trim()];
    }
    onUpdateCategories(updated);
    setNewCategory('');
  };

  const handleStartEdit = (index: number, val: string) => {
    setEditingIndex(index);
    setEditValue(val);
  };

  const handleSaveEdit = (index: number) => {
    if (!editValue.trim()) return;
    const oldName = currentList[index];
    const updated = { ...categories };
    const list = activeType === TransactionType.EXPENSE ? [...updated.EXPENSE] : [...updated.INCOME];
    list[index] = editValue.trim();

    if (activeType === TransactionType.EXPENSE) updated.EXPENSE = list;
    else updated.INCOME = list;

    onUpdateCategories(updated, oldName, editValue.trim());
    setEditingIndex(null);
    setEditValue('');
  };

  const handleDelete = (index: number) => {
    if (!confirm('Excluir esta categoria?')) return;
    const updated = { ...categories };
    const list = activeType === TransactionType.EXPENSE ? [...updated.EXPENSE] : [...updated.INCOME];
    list.splice(index, 1);

    if (activeType === TransactionType.EXPENSE) updated.EXPENSE = list;
    else updated.INCOME = list;

    onUpdateCategories(updated);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Gerenciar Categorias</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Type Toggles */}
        <div className="flex p-4 gap-2 border-b border-gray-100">
          <button
            onClick={() => setActiveType(TransactionType.EXPENSE)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeType === TransactionType.EXPENSE ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveType(TransactionType.INCOME)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeType === TransactionType.INCOME ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Receitas
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2 pb-6">
          {currentList.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              {editingIndex === idx ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 bg-white border border-indigo-300 rounded px-3 py-2 text-sm outline-none shadow-sm"
                  />
                  <button onClick={() => handleSaveEdit(idx)} className="text-green-600 p-2 hover:bg-green-50 rounded-full transition-colors cursor-pointer">
                    <Check size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-700 truncate mr-2">{cat}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(idx, cat);
                      }} 
                      className="text-blue-500 hover:text-blue-700 p-3 rounded-full hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(idx);
                      }} 
                      className="text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add New */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              placeholder="Nova categoria..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
            />
            <button
              onClick={handleAdd}
              disabled={!newCategory}
              className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;