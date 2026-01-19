
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Transaction, User, UserData } from '../types';
import { CATEGORIES } from '../constants';

// --- CONFIGURAÇÃO ---
const STRIPE_PRICE_ID = 'price_1Sn1zCBquMQ9KUa6ZDtv3kjb'; 

const getEnvVar = (key: string, fallbackKey: string) => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] || process.env[fallbackKey];
        }
    } catch (e) {}
    return '';
};

// Fallback credentials
let supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'SUPABASE_URL') || 'https://aohmfdcxxsdqfzxuswok.supabase.co';
let supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvaG1mZGN4eHNkcWZ6eHVzd29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDg4MTcsImV4cCI6MjA4MzM4NDgxN30.Lwi6cbjxlpUzFW9H3lMR4tN1U1W2iIUb_sdGWOG6bHo';

supabaseUrl = supabaseUrl ? supabaseUrl.trim() : '';
supabaseKey = supabaseKey ? supabaseKey.trim() : '';

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    } catch (error) {
        console.warn('Supabase client failed to initialize:', error);
    }
} else {
    console.error('Supabase credentials missing or invalid. App running in offline mode.');
}

const generateShareKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// --- AUTHENTICATION ---

export const getCurrentSession = (): User | null => {
  // 1. Prioridade: Cache Local (para UI imediata e persistência de dados críticos como is_admin)
  const localUserStr = localStorage.getItem('duo_fin_user');
  let localUser: User | null = null;
  if (localUserStr) {
      try {
          localUser = JSON.parse(localUserStr);
      } catch (e) {
          console.error("Error parsing local user", e);
      }
  }
  return localUser;
};

export const refreshUser = async (userId: string, existingAuthUser?: any): Promise<User | null> => {
    // Recupera dados locais para preservar flags importantes (admin, grupo) em caso de falha de rede
    const localUserStr = localStorage.getItem('duo_fin_user');
    let localUser: User | null = null;
    if (localUserStr) {
        try {
            localUser = JSON.parse(localUserStr);
            if (localUser && localUser.id !== userId) localUser = null; 
        } catch {}
    }

    if (!supabase) return localUser;

    try {
        let authUser = existingAuthUser;
        
        // 1. Verifica Auth
        if (!authUser) {
            const { data, error } = await supabase.auth.getUser();
            if (error) {
                console.warn("Auth check failed:", error.message);
                // Fix for "Invalid Refresh Token" error preventing offline fallback or re-login
                if (error.message && (error.message.includes("Refresh Token") || error.message.includes("refresh_token"))) {
                    console.warn("Invalid refresh token detected. Clearing Supabase session.");
                    await supabase.auth.signOut().catch(() => {});
                }
                return localUser; // Retorna cache se auth falhar (offline)
            }
            authUser = data.user;
        }

        if (!authUser || authUser.id !== userId) {
            return localUser;
        }

        // 2. Busca perfil no banco
        let profile = null;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) {
                if (error.code !== 'PGRST116') { // PGRST116 é "Row not found"
                     console.warn("Profile fetch error:", error.message);
                     // Não lançamos erro fatal aqui para permitir fallback
                }
            } else {
                profile = data;
            }
        } catch (dbError) {
            console.warn("Database inaccessible, using local fallback.");
            if (localUser) return localUser;
        }

        const meta = authUser.user_metadata || {};
        
        // 3. Lógica de Construção/Correção do Perfil
        if (!profile && localUser) {
            profile = localUser; // Fallback total
        } else if (!profile) {
            // Criar perfil em memória se não existe em lugar nenhum
            profile = {
                id: userId,
                email: authUser.email,
                name: meta.full_name || meta.name || 'Usuário',
                username: meta.username || authUser.email?.split('@')[0] + Math.floor(Math.random()*1000),
                phone: meta.phone,
                avatar_url: meta.avatar_url,
                share_key: meta.share_key || generateShareKey(),
                is_admin: localUser?.is_admin || false, 
                group_id: localUser?.group_id || null,
                subscription_status: meta.subscription_status || 'trial',
                subscription_end_date: meta.subscription_end_date
            };
            
            // Tenta criar no banco 'users' se estiver online
            supabase.from('users').upsert(profile).then(() => {}, () => {});
        }

        // 4. Verificação de Integridade e Expiração do Trial
        if (profile) {
            let needsUpdate = false;
            let updates: any = {};

            // Garante Username e Share Key
            if (!profile.username) {
                updates.username = authUser.email?.split('@')[0] + Math.floor(Math.random()*1000);
                needsUpdate = true;
            }
            if (!profile.share_key) {
                updates.share_key = generateShareKey();
                needsUpdate = true;
            }

            // --- LÓGICA DE EXPIRAÇÃO DE TRIAL ---
            // Se for trial e a data expirou, muda status para INACTIVE no banco
            if (profile.subscription_status === 'trial' && profile.subscription_end_date) {
                const endDate = new Date(profile.subscription_end_date);
                const now = new Date();
                
                if (now > endDate) {
                    console.log("Trial expirado. Atualizando para inactive.");
                    updates.subscription_status = 'inactive';
                    needsUpdate = true;
                    // Atualiza objeto local imediatamente para refletir na UI
                    profile.subscription_status = 'inactive';
                }
            }

            // Garante Grupo
            let currentGroupId = profile.group_id;
            if (!currentGroupId) {
                try {
                    const { data: groupData } = await supabase
                        .from('family_groups')
                        .insert({ name: 'Família ' + (profile.name || 'Usuário') })
                        .select()
                        .single();
                    if (groupData) {
                        updates.group_id = groupData.id;
                        currentGroupId = groupData.id;
                        needsUpdate = true;
                    }
                } catch {}
            }

            // Aplica updates no perfil se necessário
            if (needsUpdate) {
                const { data: updatedProfile } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', userId)
                    .select()
                    .single();
                if (updatedProfile) {
                    profile = { ...profile, ...updatedProfile };
                }
            }

            // Garante User Data (Tabela de transações)
            if (currentGroupId) {
                const { count } = await supabase
                    .from('user_data')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId);
                
                if (count === 0) {
                     await supabase.from('user_data').insert({
                        user_id: userId,
                        group_id: currentGroupId,
                        content: { transactions: [], categories: CATEGORIES, goals: [] }
                    });
                }
            }
        }

        // 5. ESTABILIDADE DO ADMIN
        const isLocalAdmin = localUser?.is_admin === true;
        const isRemoteAdmin = profile?.is_admin === true;
        const finalIsAdmin = isLocalAdmin || isRemoteAdmin;

        // Atualiza objeto final
        const updatedUser: User = {
            id: profile.id,
            email: authUser.email || '',
            name: profile.name,
            username: profile.username || '',
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            share_key: profile.share_key,
            password: '',
            is_admin: finalIsAdmin, 
            group_id: profile.group_id,
            created_at: profile.created_at || new Date().toISOString(),
            subscription_status: profile.subscription_status || 'trial', 
            subscription_end_date: profile.subscription_end_date,
        };
        
        localStorage.setItem('duo_fin_user', JSON.stringify(updatedUser));
        return updatedUser;

    } catch (e) {
        console.error("refreshUser fatal:", e);
        return localUser;
    }
};

export const checkSubscription = (user: User): boolean => {
  if (user.subscription_status === 'active') return true;
  if (user.subscription_status === 'free') return true;
  
  // Se estiver explicitamente como inactive, bloqueia.
  if (user.subscription_status === 'inactive') return false;

  // Se estiver como trial, verifica a data (camada extra de segurança caso o refreshUser falhe)
  if (user.subscription_status === 'trial') {
    if (!user.subscription_end_date) return true;
    const endDate = new Date(user.subscription_end_date);
    const now = new Date();
    return endDate > now;
  }
  
  return false;
};

export const registerUser = async (name: string, email: string, phone: string, password: string) => {
  // Configura 7 dias de trial
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7); 
  const trialEndDateISO = trialEndDate.toISOString();
  
  // Gera dados cruciais localmente para garantir
  const shareKey = generateShareKey();
  const username = email.split('@')[0] + Math.floor(Math.random() * 1000);

  if (supabase) {
      try {
        // 1. Cria usuário no Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    username: username,
                    share_key: shareKey,
                    subscription_status: 'trial',
                    subscription_end_date: trialEndDateISO
                }
            }
        });

        if (error) return { success: false, message: error.message };
        
        // 2. Garante a criação dos registros no banco de dados
        if (data.user) {
            const userId = data.user.id;

            // A. Cria entrada na tabela 'users' (Perfil)
            const userPayload = {
                id: userId,
                email: email,
                name: name,
                username: username,
                share_key: shareKey,
                phone: phone,
                is_admin: false,
                subscription_status: 'trial',
                subscription_end_date: trialEndDateISO
            };
            
            // Tenta criar o perfil. Se já existir (por trigger), atualiza.
            await supabase.from('users').upsert(userPayload);

            // B. Cria o Grupo Familiar
            const groupName = 'Família ' + name.split(' ')[0];
            const { data: groupData, error: groupError } = await supabase
                .from('family_groups')
                .insert({ name: groupName })
                .select()
                .single();

            if (groupData && !groupError) {
                // C. Vincula usuário ao grupo
                await supabase
                    .from('users')
                    .update({ group_id: groupData.id })
                    .eq('id', userId);
                
                // D. Inicializa tabela de dados (user_data)
                await supabase.from('user_data').insert({
                    user_id: userId,
                    group_id: groupData.id,
                    content: { 
                        transactions: [], 
                        categories: CATEGORIES, 
                        goals: [] 
                    }
                });
            }

            // Sincroniza estado local final
            await refreshUser(userId);
        }
        return { success: true, message: 'Conta criada com sucesso!' };
      } catch (e: any) {
        return { success: false, message: 'Erro de conexão: ' + e.message };
      }
  } else {
      return { success: false, message: 'Modo offline não suportado para cadastro.' };
  }
};

export const loginUser = async (email: string, password: string) => {
  if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, message: 'Credenciais inválidas ou erro de rede.' };

        // Tenta sincronizar o perfil completo
        const updatedUser = await refreshUser(data.user.id, data.user);
        
        if (updatedUser) {
             return { success: true, user: updatedUser };
        }

        return { success: false, message: 'Erro ao carregar perfil. Verifique sua conexão.' };

      } catch (e: any) {
        return { success: false, message: 'Erro ao conectar: ' + e.message };
      }
  }
  return { success: false, message: 'Offline.' };
};

export const logoutUser = async () => {
  if (supabase) {
      try { await supabase.auth.signOut(); } catch {}
  }
  localStorage.removeItem('duo_fin_user');
  localStorage.removeItem('duo_fin_data');
};

export const resetPassword = async (email: string) => {
    if (supabase) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/update-password',
            });
            if (error) return { success: false, message: error.message };
            return { success: true, message: 'Email enviado.' };
        } catch (e: any) {
            return { success: false, message: 'Erro de rede.' };
        }
    }
    return { success: false };
};

// --- DATA FETCHING (SUPABASE ONLY) ---

export const getUserData = async (userId: string): Promise<UserData> => {
  if (!supabase) {
      throw new Error("Cliente Supabase não inicializado.");
  }

  // 1. Cache Local (Resposta Instantânea)
  const localDataStr = localStorage.getItem(`duo_fin_data_${userId}`);
  let localData: UserData | null = null;
  if (localDataStr) {
      try { localData = JSON.parse(localDataStr); } catch {}
  }

  let allTransactions: Transaction[] = [];
  let finalCategories = { INCOME: [], EXPENSE: [] };
  let allGoals: any[] = [];
  let partnerIdFound: string | undefined = undefined;
  let partnerNameFound: string | undefined = undefined;

  try {
      // 2. TENTA BUSCAR DADOS DO SERVIDOR
      
      // TENTA VIA RPC PRIMEIRO
      const { data: familyData, error: rpcError } = await supabase.rpc('get_family_data', {
          current_user_id: userId
      });

      let records: any[] = [];

      if (!rpcError && familyData) {
          records = familyData;
      } else {
          // FALLBACK MANUAL (Se RPC falhar ou não existir)
          // Tenta descobrir o grupo localmente se o fetch falhar
          const localUser = getCurrentSession();
          let groupId = localUser?.group_id;

          if (!groupId) {
             // Tenta buscar do banco se não tiver no local
             const { data: userProfile } = await supabase.from('users').select('group_id').eq('id', userId).single();
             groupId = userProfile?.group_id;
          }

          if (groupId) {
              // 2. Buscar usuários do grupo
              const { data: groupUsers } = await supabase.from('users').select('id, name').eq('group_id', groupId);
              
              if (groupUsers && groupUsers.length > 0) {
                  const userIds = groupUsers.map(u => u.id);
                  // 3. Buscar dados de todos do grupo
                  const { data: groupUserData } = await supabase.from('user_data').select('user_id, content').in('user_id', userIds);
                  
                  records = groupUsers.map(u => {
                      const dataRow = groupUserData?.find(d => d.user_id === u.id);
                      const content = dataRow?.content || { transactions: [], categories: CATEGORIES, goals: [] };
                      return {
                          user_id: u.id,
                          name: u.name || 'Parceiro',
                          content: content
                      };
                  });
              }
          } else {
              // Sem grupo, busca apenas do usuário
               const { data: myData } = await supabase.from('user_data').select('content').eq('user_id', userId).single();
               if (myData) {
                   records = [{ user_id: userId, name: 'Me', content: myData.content }];
               }
          }
      }
      
      // Processa os registros
      records.forEach(row => {
          if (row.user_id !== userId) {
              partnerIdFound = row.user_id;
              partnerNameFound = row.name;
          }

          if (row.content?.transactions) {
              allTransactions = [...allTransactions, ...row.content.transactions];
          }
          if (row.content?.goals) {
              allGoals = [...allGoals, ...row.content.goals];
          }
          
          if (row.content?.categories?.INCOME?.length > 0) {
              if (row.user_id === userId || finalCategories.INCOME.length === 0) {
                   finalCategories = row.content.categories;
              }
          }
      });

      if (finalCategories.INCOME.length === 0) finalCategories = CATEGORIES;
      
      const uniqueTx = Array.from(new Map(allTransactions.map(item => [item.id, item])).values());
      const uniqueGoals = Array.from(new Map(allGoals.map(item => [item.id, item])).values());

      const result = {
          transactions: uniqueTx,
          categories: finalCategories,
          goals: uniqueGoals,
          partnerId: partnerIdFound,
          partnerName: partnerNameFound
      };

      // Atualiza Cache Local
      localStorage.setItem(`duo_fin_data_${userId}`, JSON.stringify(result));
      
      return result;

  } catch (error: any) {
      console.warn("Data Load Error (using cache):", error.message);
      
      // Se falhar a rede, retorna o cache se existir
      if (localData) return localData;
      
      // Se não tiver cache nem rede, retorna vazio
      return {
          transactions: [],
          categories: CATEGORIES,
          goals: []
      };
  }
};

export const saveUserData = async (userId: string, data: UserData) => {
  if (!supabase) return { success: false, message: 'Offline.' };

  // Atualiza cache local imediatamente
  localStorage.setItem(`duo_fin_data_${userId}`, JSON.stringify(data));

  try {
      // 1. Get Group ID & Validate User
      // Tenta usar dados locais primeiro para evitar roundtrip desnecessário
      let groupId = getCurrentSession()?.group_id;

      if (!groupId) {
        const { data: userProfile, error: userError } = await supabase
            .from('users')
            .select('group_id')
            .eq('id', userId)
            .single();
        
        if (!userError && userProfile) {
            groupId = userProfile.group_id;
        }
      }

      // Se ainda não tiver grupo, tenta criar um on-the-fly se for o caso, ou alerta
      if (!groupId) {
         // Lógica de criar grupo novo se usuário não tiver (auto-fix)
         const { data: newGroup } = await supabase.from('family_groups').insert({ name: 'Família' }).select().single();
         if (newGroup) {
             await supabase.from('users').update({ group_id: newGroup.id }).eq('id', userId);
             groupId = newGroup.id;
         }
      }

      if (!groupId) throw new Error("Não foi possível determinar o grupo do usuário.");

      // 2. Separate Data (Owner vs Partner)
      // Owner transactions are those created by current user OR legacy ones without userId
      const ownerTxs = data.transactions.filter(t => !t.userId || t.userId === userId);
      
      // Partner transactions for updates
      const partnerTxs = data.transactions.filter(t => t.userId && t.userId !== userId);
      
      const ownerGoals = data.goals?.filter(g => !g.userId || g.userId === userId) || [];
      const partnerGoals = data.goals?.filter(g => g.userId && g.userId !== userId) || [];

      // 3. Save Owner Data (Upsert)
      const ownerContent = {
          transactions: ownerTxs.map(t => ({ ...t, userId })), 
          categories: data.categories, 
          goals: ownerGoals.map(g => ({ ...g, userId }))
      };

      const { error: ownerError } = await supabase
        .from('user_data')
        .upsert({ 
            user_id: userId, 
            group_id: groupId, 
            content: ownerContent 
        }, { onConflict: 'user_id' });

      if (ownerError) throw ownerError;

      // 4. Save Partner Data (Update ONLY if partner exists in data context)
      // This allows editing partner's transactions/goals
      if (data.partnerId) {
           const partnerContent = {
               transactions: partnerTxs,
               categories: data.categories, // Shared categories
               goals: partnerGoals
           };

           // We assume RLS allows update if in the same group_id
           const { error: partnerError } = await supabase
              .from('user_data')
              .update({ content: partnerContent })
              .eq('user_id', data.partnerId)
              .eq('group_id', groupId); // Extra safety check

           if (partnerError) console.warn("Failed to sync partner data:", partnerError.message);
      }

      return { success: true };

  } catch (e: any) {
      console.error("Save Exception:", e);
      // Mesmo com erro de rede, retornamos sucesso falso mas os dados estão no LocalStorage
      return { success: false, message: e.message };
  }
};

// --- REST OF SERVICES ---

export const connectPartner = async (currentUserId: string, partnerShareKey: string) => {
    return { success: false, message: 'Função depreciada. Use conexão por e-mail.' };
};

export const connectPartnerByEmail = async (currentUserId: string, partnerEmail: string) => {
    if (!supabase) return { success: false, message: 'Offline.' };

    try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('connect_partners', {
            my_id: currentUserId,
            partner_email: partnerEmail.trim().toLowerCase()
        });

        if (!rpcError && rpcData) {
            if (rpcData.success) {
                await refreshUser(currentUserId);
                return { success: true, message: rpcData.message || 'Conectado com sucesso!' };
            } else {
                return { success: false, message: rpcData.message || 'Falha ao conectar.' };
            }
        }
        
        console.warn("RPC connect_partners error/unavailable, using client-side fallback.");
        
        // --- FALLBACK LOGIC ---
        // 1. Encontra o parceiro
        const { data: partner, error: pError } = await supabase
            .from('users')
            .select('id, group_id')
            .eq('email', partnerEmail.trim().toLowerCase())
            .single();

        if (pError || !partner) return { success: false, message: "E-mail não encontrado." };
        if (partner.id === currentUserId) return { success: false, message: "Não pode conectar consigo mesmo." };

        // 2. Define o grupo alvo
        // Se parceiro tem grupo, vou pro dele. Se não, se eu tenho, ele vem pro meu. Se nenhum tem, crio novo.
        let targetGroupId = partner.group_id;
        
        if (!targetGroupId) {
            const { data: me } = await supabase.from('users').select('group_id').eq('id', currentUserId).single();
            targetGroupId = me?.group_id;
        }

        if (!targetGroupId) {
             const { data: newGroup } = await supabase.from('family_groups').insert({ name: 'Família' }).select().single();
             if (newGroup) targetGroupId = newGroup.id;
        }

        if (!targetGroupId) return { success: false, message: "Erro ao criar grupo familiar." };

        // 3. Atualiza ambos usuários
        const { error: u1 } = await supabase.from('users').update({ group_id: targetGroupId }).eq('id', currentUserId);
        const { error: u2 } = await supabase.from('users').update({ group_id: targetGroupId }).eq('id', partner.id);
        
        // 4. Migra dados para o novo grupo (para garantir consistência)
        await supabase.from('user_data').update({ group_id: targetGroupId }).eq('user_id', currentUserId);
        await supabase.from('user_data').update({ group_id: targetGroupId }).eq('user_id', partner.id);

        if (u1 || u2) return { success: false, message: "Erro ao atualizar vínculos." };

        await refreshUser(currentUserId);
        return { success: true, message: "Conectado com sucesso!" };

    } catch (e: any) {
        return { success: false, message: 'Erro de conexão: ' + e.message };
    }
};


export const disconnectPartner = async (userId: string) => {
    if (supabase) {
        try {
            const { data: user } = await supabase.from('users').select('name').eq('id', userId).single();
            const { data: newGroup } = await supabase
                .from('family_groups')
                .insert({ name: 'Família ' + (user?.name || '') })
                .select()
                .single();
            
            if (newGroup) {
                await supabase.from('users').update({ group_id: newGroup.id }).eq('id', userId);
                // Também move os dados para o novo grupo
                await supabase.from('user_data').update({ group_id: newGroup.id }).eq('user_id', userId);
                
                await refreshUser(userId);
                return { success: true, message: 'Desconectado com sucesso.' };
            }
        } catch(e) {
            return { success: false, message: 'Erro ao sair do grupo.' };
        }
    }
    return { success: true };
};

export const createStripeCheckoutSession = async (user: User) => {
    if (supabase) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return { error: 'Sessão expirada.' };
            
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    priceId: STRIPE_PRICE_ID,
                    successUrl: `${window.location.origin}?success=true`,
                    cancelUrl: window.location.origin,
                    email: user.email 
                },
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (error) throw new Error(error.message);
            if (data?.url) return { url: data.url };
        } catch (e: any) {
            return { error: e.message };
        }
    }
    return { error: 'Offline.' };
};

export const manageSubscription = async (userId: string): Promise<{ url?: string; error?: string }> => {
    return { error: 'Portal indisponível.' };
};

export const cancelSubscriptionLocal = async (userId: string): Promise<{ success: boolean; message?: string; user?: User }> => {
    return { success: false };
};

export const getUsers = async () => {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error("getUsers error:", e);
            return [];
        }
    }
    return [];
};

export const adminDeleteUser = async (userId: string) => {
    if (supabase) {
        // Chama a função RPC que criamos acima
        const { error } = await supabase.rpc('delete_user_by_admin', {
            user_id: userId
        });

        if (error) {
            console.error("Erro ao deletar usuário:", error);
            return { success: false, message: error.message };
        }
        
        return { success: true, message: 'Usuário deletado com sucesso.' };
    }
    return { success: true }; // Modo offline (simulado)
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<{ success: boolean; message?: string; user?: User }> => {
    if (supabase) {
        try {
            const payload: any = { 
                name: updates.name, 
                phone: updates.phone 
            };
            
            if (updates.avatar_url) {
                payload.avatar_url = updates.avatar_url;
            }

            // Atualiza Auth Metadata
            const { data: authData, error: authError } = await supabase.auth.updateUser({ data: { 
                full_name: updates.name, 
                phone: updates.phone,
                avatar_url: updates.avatar_url
            }});

            if (authError) throw authError;
            
            // Atualiza Tabela Users
            await supabase.from('users').update(payload).eq('id', userId);
            
            // Atualiza cache local
            const currentUser = getCurrentSession();
            if (currentUser) {
                const newUser = { ...currentUser, ...updates };
                localStorage.setItem('duo_fin_user', JSON.stringify(newUser));
                return { success: true, user: newUser };
            }

            return { success: true }; 
        } catch(e: any) {
            return { success: false, message: e.message };
        }
    }
    return { success: false };
};

export const adminUpdateUser = async (userId: string, updates: Partial<User>): Promise<{ success: boolean; message?: string; user?: User }> => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single();
            if (error) return { success: false, message: error.message };
            return { success: true, message: 'Usuário atualizado com sucesso.', user: data };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }
    return { success: false, message: 'Offline.' };
};
