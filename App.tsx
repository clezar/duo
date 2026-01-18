
import * as React from 'react';
import { Transaction, TransactionStatus, TransactionType, User, Goal } from './types';
import { getUserData, saveUserData, getCurrentSession, logoutUser, checkSubscription, supabase, refreshUser } from './services/storageService';
import { CATEGORIES as DEFAULT_CATEGORIES, APP_LOGO_HEADER } from './constants';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import DashboardHome from './components/DashboardHome';
import ChartsView from './components/ChartsView';
import Reports from './components/Reports';
import CategoryManager from './components/CategoryManager';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import AccountSettings from './components/AccountSettings';
import SubscriptionScreen from './components/SubscriptionScreen';
import GoalsManager from './components/GoalsManager';
import TermsOfUse from './components/TermsOfUse';
import PrivacyPolicy from './components/PrivacyPolicy';
import { Plus, PieChart, ChevronLeft, ChevronRight, ListTodo, Home, LogOut, Shield, Loader2, AlertTriangle, Settings, Heart, Trash2, Repeat, CalendarRange, CheckCircle, ChevronDown, Target } from 'lucide-react';

enum Tab {
  HOME = 'INÍCIO',
  TRANSACTIONS = 'LANÇAMENTOS',
  GOALS = 'METAS',
  CHARTS = 'GRÁFICOS',
  REPORTS = 'ANUAL',
  ADMIN = 'ADMIN',
}

enum ViewState {
  APP = 'APP',
  TERMS = 'TERMS',
  PRIVACY = 'PRIVACY'
}

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = React.useState(false);

  // --- NAVIGATION STATE ---
  const [viewState, setViewState] = React.useState<ViewState>(ViewState.APP);

  // --- APP STATE ---
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState(DEFAULT_CATEGORIES);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [partnerInfo, setPartnerInfo] = React.useState<{ id?: string, name?: string }>({});
  
  // Use Refs to access latest state inside Realtime callbacks without re-triggering effects
  const partnerIdRef = React.useRef<string | undefined>(undefined);
  const currentUserIdRef = React.useRef<string | undefined>(undefined);
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);
  
  const [currentTab, setCurrentTab] = React.useState<Tab>(Tab.HOME);
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  
  const [showForm, setShowForm] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [editingRecurrenceCount, setEditingRecurrenceCount] = React.useState<number | undefined>(undefined);
  
  const [initialFormCategory, setInitialFormCategory] = React.useState<string | undefined>(undefined);
  const [initialFormType, setInitialFormType] = React.useState<TransactionType | undefined>(undefined);

  const [showCategoryManager, setShowCategoryManager] = React.useState(false);
  const [showAccountSettings, setShowAccountSettings] = React.useState(false);
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);

  // Delete Modal State
  const [itemToDelete, setItemToDelete] = React.useState<Transaction | null>(null);

  // Update refs when state changes
  React.useEffect(() => {
    partnerIdRef.current = partnerInfo.id;
  }, [partnerInfo.id]);

  React.useEffect(() => {
    currentUserIdRef.current = currentUser?.id;
  }, [currentUser]);

  // --- INITIALIZATION ---
  React.useEffect(() => {
    const session = getCurrentSession();
    const query = new URLSearchParams(window.location.search);
    const isSuccessReturn = query.get('success') === 'true';

    if (session) {
      if (isSuccessReturn) {
          setShowSuccessToast(true);
          window.history.replaceState({}, document.title, "/");
          const updatedUser = { ...session, subscription_status: 'active' as const };
          setCurrentUser(updatedUser);
          setHasActiveSubscription(true);
      } else {
          setCurrentUser(session);
          setHasActiveSubscription(checkSubscription(session));
      }
    }
  }, []);

  // LOAD DATA
  const loadData = React.useCallback(async (silent = false, userIdToLoad?: string) => {
    const targetId = userIdToLoad || currentUserIdRef.current;
    
    if (targetId) {
      if (!silent && transactions.length === 0) setIsLoading(true);
      
      setLoadError(null);
      try {
        // 1. Refresh User Profile
        const freshUser = await refreshUser(targetId);
        
        if (freshUser) {
             setCurrentUser(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(freshUser)) {
                    setHasActiveSubscription(checkSubscription(freshUser));
                    return freshUser;
                }
                return prev;
             });
        }

        // 2. Load Data
        const userData = await getUserData(targetId);
        
        setTransactions(userData.transactions || []);
        setCategories(userData.categories || DEFAULT_CATEGORIES);
        setGoals(userData.goals || []);
        setPartnerInfo({ id: userData.partnerId, name: userData.partnerName });
        
        setLastSync(new Date());
      } catch (err) {
        if (!silent) setLoadError("Falha ao carregar dados.");
      } finally {
        if (!silent) setIsLoading(false);
      }
    }
  }, [transactions.length]);

  // Trigger load only when user ID changes initially
  React.useEffect(() => {
    if (currentUser?.id) {
        loadData(false, currentUser.id);
    }
  }, [currentUser?.id, loadData]);
  
  React.useEffect(() => {
      const onFocus = () => {
          if (currentUserIdRef.current) loadData(true, currentUserIdRef.current);
      };
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
  }, [loadData]);

  // --- REALTIME SYNC (SIMULTANEOUS UPDATE) ---
  React.useEffect(() => {
    if (!currentUser || !supabase) return;

    // Se inscreve para mudanças na tabela user_data filtrando pelo ID do Grupo
    // Isso garante que se o parceiro (que tem o mesmo group_id) fizer algo, você receba o aviso.
    const channelFilters = currentUser.group_id 
        ? `group_id=eq.${currentUser.group_id}` 
        : `user_id=eq.${currentUser.id}`;

    const channel = supabase
      .channel(`room-${currentUser.group_id || currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Insert, Update ou Delete
          schema: 'public',
          table: 'user_data',
          filter: channelFilters 
        },
        (payload) => {
           // Quando receber um aviso de mudança, recarrega os dados silenciosamente
           console.log("Alteração detectada em tempo real:", payload);
           loadData(true, currentUser.id);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.group_id, loadData]);

  // Persistence
  const syncData = React.useCallback(async (
    allTxs: Transaction[], 
    cats: any, 
    currentGoals: Goal[], 
    pId?: string
  ) => {
    const uid = currentUserIdRef.current;
    if (uid) {
      setIsSyncing(true);
      try {
        const result = await saveUserData(uid, {
          transactions: allTxs, 
          categories: cats,
          partnerId: pId,
          goals: currentGoals
        });
        
        if (!result.success) {
            console.error("Erro ao salvar:", result.message);
        } else {
            setLastSync(new Date());
        }
      } catch (err) {
        console.error("Erro crítico na sincronização:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  // --- HANDLERS ---

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setHasActiveSubscription(false);
    setTransactions([]);
    setGoals([]);
    setCategories(DEFAULT_CATEGORIES);
    setPartnerInfo({});
    setCurrentTab(Tab.HOME);
    partnerIdRef.current = undefined;
    currentUserIdRef.current = undefined;
  };

  const handleSubscriptionSuccess = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setHasActiveSubscription(true);
  };

  const handleUpdateUser = (updatedUser: User) => {
      setCurrentUser(updatedUser);
      setHasActiveSubscription(checkSubscription(updatedUser));
  };

  // --- GOAL HANDLERS ---
  const handleAddGoal = (newGoal: Omit<Goal, 'id'>) => {
    const goal: Goal = { 
        ...newGoal, 
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser?.id 
    };
    const updatedGoals = [...goals, goal];
    setGoals(updatedGoals);
    syncData(transactions, categories, updatedGoals, partnerInfo.id);
  };

  const handleUpdateGoal = (id: string, amount: number) => {
      const updatedGoals = goals.map(g => g.id === id ? { ...g, currentAmount: amount } : g);
      setGoals(updatedGoals);
      syncData(transactions, categories, updatedGoals, partnerInfo.id);
  };

  const handleDeleteGoal = (id: string) => {
      if(!confirm("Excluir meta?")) return;
      const updatedGoals = goals.filter(g => g.id !== id);
      setGoals(updatedGoals);
      syncData(transactions, categories, updatedGoals, partnerInfo.id);
  };

  // --- TRANSACTION HANDLERS ---
  const handleSaveTransaction = (newTx: Omit<Transaction, 'id'>, recurrences: number = 1) => {
    if (!currentUser) return;

    const newTxs: Transaction[] = [];
    const [year, month, day] = newTx.date.split('-').map(Number);
    
    const recurrenceId = recurrences > 1 ? Math.random().toString(36).substr(2, 9) : undefined;

    for (let i = 0; i < recurrences; i++) {
      const id = Math.random().toString(36).substr(2, 9);
      const targetMonthIndex = (month - 1) + i;
      const targetDate = new Date(year, targetMonthIndex, 1);
      const lastDayOfTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
      const safeDay = Math.min(day, lastDayOfTargetMonth);
      const d = new Date(targetDate.getFullYear(), targetDate.getMonth(), safeDay);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      newTxs.push({ 
        ...newTx, 
        id,
        userId: currentUser.id, 
        date: dateStr,
        description: recurrences > 1 ? `${newTx.description} (${i + 1}/${recurrences})` : newTx.description,
        recurrenceId
      });
    }

    const updated = [...transactions, ...newTxs];
    setTransactions(updated);
    syncData(updated, categories, goals, partnerInfo.id);
    setShowForm(false);
    setEditingTransaction(null);
  };

  const handleUpdateTransaction = (id: string, updatedFields: Partial<Transaction>, updateRecurring: boolean = false, newRecurrenceCount?: number) => {
    const originalTx = transactions.find(t => t.id === id);
    if (!originalTx) return;
    
    let updatedTransactions = [...transactions];

    if (updateRecurring && originalTx.recurrenceId) {
        let series = transactions.filter(t => t.recurrenceId === originalTx.recurrenceId);
        series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const currentCount = series.length;
        const targetCount = newRecurrenceCount || currentCount;

        if (targetCount > currentCount) {
            const lastTx = series[series.length - 1];
            const [y, m, d] = lastTx.date.split('-').map(Number);
            const itemsToAdd = targetCount - currentCount;
            for (let i = 1; i <= itemsToAdd; i++) {
                const nextId = Math.random().toString(36).substr(2, 9);
                const nextDateObj = new Date(y, (m - 1) + i, d); 
                const safeD = Math.min(d, new Date(nextDateObj.getFullYear(), nextDateObj.getMonth() + 1, 0).getDate());
                const finalDate = new Date(nextDateObj.getFullYear(), nextDateObj.getMonth(), safeD);
                const dateStr = `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, '0')}-${String(finalDate.getDate()).padStart(2, '0')}`;
                
                const newTx: Transaction = {
                    ...lastTx, ...updatedFields, id: nextId, date: dateStr,
                    status: TransactionStatus.PROJECTED, realizedDate: undefined, recurrenceId: originalTx.recurrenceId,
                    userId: lastTx.userId 
                };
                series.push(newTx);
                updatedTransactions.push(newTx);
            }
        } else if (targetCount < currentCount) {
            const itemsToRemove = currentCount - targetCount;
            const idsToRemove = series.slice(series.length - itemsToRemove).map(t => t.id);
            updatedTransactions = updatedTransactions.filter(t => !idsToRemove.includes(t.id));
            series = series.slice(0, targetCount);
        }

        const baseDesc = updatedFields.description || originalTx.description.replace(/\s\(\d+\/\d+\)$/, '');
        let targetDay: number | undefined;
        if (updatedFields.date) targetDay = parseInt(updatedFields.date.split('-')[2], 10);

        updatedTransactions = updatedTransactions.map(t => {
            const index = series.findIndex(s => s.id === t.id);
            if (index !== -1) {
                const newTx = { ...t, ...updatedFields };
                if (targetDay && t.date) {
                     const [y, m] = t.date.split('-').map(Number);
                     const maxDays = new Date(y, m, 0).getDate();
                     const clampedDay = Math.min(targetDay, maxDays);
                     const finalDate = new Date(y, m - 1, clampedDay);
                     newTx.date = `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, '0')}-${String(finalDate.getDate()).padStart(2, '0')}`;
                }
                if (targetCount > 1) newTx.description = `${baseDesc} (${index + 1}/${targetCount})`;
                else newTx.description = baseDesc;

                if (t.id !== id) {
                    delete newTx.status; 
                    delete newTx.realizedDate;
                    return { ...newTx, status: t.status, realizedDate: t.realizedDate };
                }
                return newTx;
            }
            return t;
        });
    } else {
        updatedTransactions = updatedTransactions.map(t => {
          if (t.id === id) return { ...t, ...updatedFields };
          return t;
        });
    }

    setTransactions(updatedTransactions);
    syncData(updatedTransactions, categories, goals, partnerInfo.id);
    setShowForm(false);
    setEditingTransaction(null);
  };

  const handleToggleStatus = (id: string, currentStatus: TransactionStatus) => {
    const updated = transactions.map(t => {
      if (t.id !== id) return t;
      const newStatus = currentStatus === TransactionStatus.PROJECTED ? TransactionStatus.REALIZED : TransactionStatus.PROJECTED;
      return {
        ...t,
        status: newStatus,
        realizedDate: newStatus === TransactionStatus.REALIZED ? new Date().toISOString().split('T')[0] : undefined
      };
    });
    setTransactions(updated);
    syncData(updated, categories, goals, partnerInfo.id);
  };

  const handleOpenDeleteModal = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      setItemToDelete(tx);
    }
  };

  const handleConfirmDelete = (deleteAllRecurrences: boolean) => {
    if (!itemToDelete) return;
    let updated: Transaction[] = [];
    if (deleteAllRecurrences && itemToDelete.recurrenceId) {
      updated = transactions.filter(t => t.recurrenceId !== itemToDelete.recurrenceId);
    } else {
      updated = transactions.filter(t => t.id !== itemToDelete.id);
    }
    setTransactions(updated);
    syncData(updated, categories, goals, partnerInfo.id);
    setItemToDelete(null);
  };

  // --- MISC HANDLERS ---
  const handleEditClick = (t: Transaction) => {
    setEditingTransaction(t);
    if (t.recurrenceId) {
        const count = transactions.filter(tx => tx.recurrenceId === t.recurrenceId).length;
        setEditingRecurrenceCount(count);
    } else {
        setEditingRecurrenceCount(undefined);
    }
    setShowForm(true);
  };

  const handleOpenFormWithCategory = (category: string, type: TransactionType) => {
    setEditingTransaction(null);
    setInitialFormCategory(category);
    setInitialFormType(type);
    setShowForm(true);
  };

  const handleUpdateCategories = (newCategories: { INCOME: string[]; EXPENSE: string[] }, oldName?: string, newName?: string) => {
    setCategories(newCategories);
    let updatedTxs = transactions;
    if (oldName && newName) {
      updatedTxs = transactions.map(t => t.category === oldName ? { ...t, category: newName } : t);
      setTransactions(updatedTxs);
    }
    syncData(updatedTxs, newCategories, goals, partnerInfo.id);
  };

  const handleReferenceChange = (increment: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    if (currentTab === Tab.REPORTS) {
      const newYear = year + increment;
      setSelectedMonth(`${newYear}-${String(month).padStart(2, '0')}`);
    } else {
      const date = new Date(year, month - 1 + increment, 1);
      setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const referenceLabel = React.useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    if (currentTab === Tab.REPORTS) {
      return year.toString();
    }

    const date = new Date(year, month - 1, 1);
    const name = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [selectedMonth, currentTab]);

  // --- VIEW RENDER ---
  if (viewState === ViewState.TERMS) {
    return <TermsOfUse onBack={() => setViewState(ViewState.APP)} />;
  }

  if (viewState === ViewState.PRIVACY) {
    return <PrivacyPolicy onBack={() => setViewState(ViewState.APP)} />;
  }

  if (!currentUser) {
    return (
      <AuthScreen 
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          setHasActiveSubscription(checkSubscription(u));
        }}
        onTermsClick={() => setViewState(ViewState.TERMS)}
        onPrivacyClick={() => setViewState(ViewState.PRIVACY)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-40">
      {/* Bloqueador de Assinatura Expirada */}
      {!hasActiveSubscription && (
        <SubscriptionScreen user={currentUser} onSuccess={handleSubscriptionSuccess} />
      )}

      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-fade-in-down">
            <CheckCircle size={20} />
            <span className="font-bold text-sm">Assinatura ativada com sucesso!</span>
            <button onClick={() => setShowSuccessToast(false)} className="ml-2 hover:text-green-200">
                <ChevronDown size={16} />
            </button>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#dce775] shadow-sm border-b border-[#c0ca33]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src={APP_LOGO_HEADER}
              className="h-10 w-auto drop-shadow-sm object-contain"
              alt="Logo"
            />
          </div>

          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                   {isSyncing ? (
                     <Loader2 size={14} className="animate-spin text-[#827717]" />
                   ) : (
                     <div className="w-2 h-2 rounded-full bg-green-50 shadow-sm" />
                   )}
                   <span className="text-[10px] font-bold text-[#827717] uppercase">
                     {partnerInfo.id ? 'Modo Casal' : 'Individual'}
                   </span>
                </div>
                {lastSync && !isSyncing && (
                  <span className="text-[8px] text-[#827717]/60 font-medium">
                    {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
             </div>

             <div className="h-8 w-[1px] bg-[#c0ca33] mx-1" />

             <button 
                onClick={() => setShowAccountSettings(true)}
                className="flex items-center gap-2 p-1.5 bg-white/20 hover:bg-white/40 rounded-lg transition-all"
                title="Configurações e Parcerias"
             >
                <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-[#827717] uppercase">Olá,</p>
                    <p className="text-sm font-bold text-gray-800 leading-none">{currentUser.name.split(' ')[0]}</p>
                </div>
                {partnerInfo.id ? (
                     <Heart size={20} className="text-[#ec407a] fill-[#ec407a]" />
                ) : (
                     <Settings size={20} className="text-[#827717]" />
                )}
             </button>

             <button onClick={handleLogout} className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-[#827717] transition-all" title="Sair">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 size={40} className="animate-spin text-indigo-500" />
            <p className="font-bold text-sm uppercase tracking-widest">Sincronizando finanças...</p>
          </div>
        )}

        {loadError && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="text-red-500" size={40} />
            <div>
              <h3 className="text-red-800 font-bold uppercase text-sm mb-1">Erro de Conexão</h3>
              <p className="text-red-600 text-xs">{loadError}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        <AccountSettings 
            isOpen={showAccountSettings}
            onClose={() => setShowAccountSettings(false)}
            currentUser={currentUser}
            partnerId={partnerInfo.id}
            partnerName={partnerInfo.name}
            onConnectionChange={() => loadData(true)}
            onUpdateUser={handleUpdateUser}
            onTermsClick={() => setViewState(ViewState.TERMS)}
            onPrivacyClick={() => setViewState(ViewState.PRIVACY)}
        />

        {!isLoading && !loadError && showForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
              <TransactionForm 
                onSave={handleSaveTransaction} 
                onUpdate={handleUpdateTransaction}
                onCancel={() => { setShowForm(false); setEditingTransaction(null); }}
                defaultMonth={selectedMonth} 
                categories={categories}
                onManageCategories={() => setShowCategoryManager(true)}
                initialData={editingTransaction}
                initialCategory={initialFormCategory}
                initialType={initialFormType}
                currentRecurrenceCount={editingRecurrenceCount}
              />
            </div>
          </div>
        )}

        {itemToDelete && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-red-600" />
                </div>
                <h3 className="text-lg font-black text-gray-800 mb-2">Excluir Lançamento?</h3>
                <p className="text-sm text-gray-500 mb-6">
                  {itemToDelete.description} <br/>
                  <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(itemToDelete.amount)}</span>
                </p>

                <div className="space-y-3">
                  <button 
                    onClick={() => handleConfirmDelete(false)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200"
                  >
                    Excluir Apenas Este
                  </button>
                  
                  {itemToDelete.recurrenceId && (
                    <button 
                      onClick={() => handleConfirmDelete(true)}
                      className="w-full py-3 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Repeat size={18} />
                      Excluir Todas as Recorrentes
                    </button>
                  )}

                  <button 
                    onClick={() => setItemToDelete(null)}
                    className="w-full py-3 text-gray-500 font-bold hover:text-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <CategoryManager
          isOpen={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          categories={categories}
          onUpdateCategories={handleUpdateCategories}
        />

        {/* Content Render based on Tabs */}
        {!isLoading && !loadError && (
          <>
            {currentTab === Tab.HOME && (
              <DashboardHome 
                transactions={transactions} 
                currentMonth={selectedMonth} 
                onManageAccount={() => setShowAccountSettings(true)}
                userStatus={currentUser.subscription_status}
                user={currentUser}
              />
            )}
            
            {currentTab === Tab.TRANSACTIONS && (
              <TransactionList 
                transactions={transactions.filter(t => t.date.startsWith(selectedMonth))} 
                currentUserId={currentUser.id}
                onToggleStatus={handleToggleStatus} 
                onDelete={handleOpenDeleteModal}
                onEdit={handleEditClick}
                onAddTransactionToCategory={handleOpenFormWithCategory}
              />
            )}

            {currentTab === Tab.GOALS && (
               <GoalsManager 
                  goals={goals}
                  onAddGoal={handleAddGoal}
                  onUpdateGoal={handleUpdateGoal}
                  onDeleteGoal={handleDeleteGoal}
               />
            )}
            
            {currentTab === Tab.CHARTS && (
              <ChartsView transactions={transactions} currentMonth={selectedMonth} />
            )}
            
            {currentTab === Tab.REPORTS && (
              <Reports transactions={transactions} currentMonth={selectedMonth} categories={categories} />
            )}
            
            {currentTab === Tab.ADMIN && currentUser.is_admin && (
               <AdminPanel currentUser={currentUser} />
            )}
          </>
        )}
      </main>

      {/* Floating Add Button - Only on Transactions Tab */}
      {currentTab === Tab.TRANSACTIONS && !showForm && (
        <button
          onClick={() => {
            setEditingTransaction(null);
            setInitialFormCategory(undefined);
            setInitialFormType(undefined);
            setShowForm(true);
          }}
          className="fixed bottom-44 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 z-30"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        
        {/* Month Selector inside Nav */}
        {(currentTab === Tab.TRANSACTIONS || currentTab === Tab.HOME || currentTab === Tab.CHARTS || currentTab === Tab.REPORTS) && (
            <div className="flex items-center justify-center py-2 bg-gray-50 border-b border-gray-200">
                <button onClick={() => handleReferenceChange(-1)} className="p-2 text-gray-400 hover:text-indigo-600">
                    <ChevronLeft size={20} strokeWidth={3} />
                </button>
                <div className="flex flex-col items-center mx-4">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-0.5">
                       {currentTab === Tab.REPORTS ? 'Ano de Referência' : 'Mês de Referência'}
                    </span>
                    <span className="text-sm font-black text-gray-800 uppercase leading-none">{referenceLabel}</span>
                </div>
                <button onClick={() => handleReferenceChange(1)} className="p-2 text-gray-400 hover:text-indigo-600">
                    <ChevronRight size={20} strokeWidth={3} />
                </button>
            </div>
        )}

        <div className="flex justify-around items-center p-2 pb-4 max-w-4xl mx-auto">
          <button 
            onClick={() => setCurrentTab(Tab.HOME)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentTab === Tab.HOME ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Home size={20} strokeWidth={currentTab === Tab.HOME ? 2.5 : 2} />
            <span className="text-[10px] font-bold">INÍCIO</span>
          </button>
          
          <button 
            onClick={() => setCurrentTab(Tab.TRANSACTIONS)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentTab === Tab.TRANSACTIONS ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ListTodo size={20} strokeWidth={currentTab === Tab.TRANSACTIONS ? 2.5 : 2} />
            <span className="text-[10px] font-bold">LANÇAR</span>
          </button>

          <button 
            onClick={() => setCurrentTab(Tab.GOALS)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentTab === Tab.GOALS ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Target size={20} strokeWidth={currentTab === Tab.GOALS ? 2.5 : 2} />
            <span className="text-[10px] font-bold">METAS</span>
          </button>
          
          <button 
            onClick={() => setCurrentTab(Tab.CHARTS)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentTab === Tab.CHARTS ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <PieChart size={20} strokeWidth={currentTab === Tab.CHARTS ? 2.5 : 2} />
            <span className="text-[10px] font-bold">GRÁFICOS</span>
          </button>

          <button 
            onClick={() => setCurrentTab(Tab.REPORTS)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentTab === Tab.REPORTS ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <CalendarRange size={20} strokeWidth={currentTab === Tab.REPORTS ? 2.5 : 2} />
            <span className="text-[10px] font-bold">ANUAL</span>
          </button>

          {currentUser.is_admin && (
             <button 
               onClick={() => setCurrentTab(Tab.ADMIN)}
               className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentTab === Tab.ADMIN ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <Shield size={20} strokeWidth={currentTab === Tab.ADMIN ? 2.5 : 2} />
               <span className="text-[10px] font-bold">ADMIN</span>
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
