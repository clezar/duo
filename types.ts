

export enum TransactionType {
  INCOME = 'RECEITA',
  EXPENSE = 'DESPESA',
  TRANSFER = 'TRANSFERENCIA',
}

export enum TransactionStatus {
  PROJECTED = 'PROJETADO', // A Receber / A Pagar
  REALIZED = 'REALIZADO', // Recebido / Pago
}

export interface Transaction {
  id: string;
  userId?: string; // ID do usuário dono da transação
  date: string; // ISO Date YYYY-MM-DD
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  account: string;
  status: TransactionStatus;
  realizedDate?: string; // Data efetiva da realização
  recurrenceId?: string; // ID compartilhado entre transações da mesma série recorrente
}

export interface Goal {
  id: string;
  userId?: string; // Adicionado para identificar dono da meta
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  type: 'SPENDING' | 'INVESTMENT'; // Meta de gasto (ex: teto de mercado) ou investimento (ex: viagem)
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  avatar_url?: string; // Nova propriedade para foto de perfil
  password: string; // In a real app, this would be hashed
  share_key: string; // Chave única para conexão do Modo Casal
  is_admin: boolean;
  group_id?: string | null;
  created_at: string;
  // Subscription fields (Hydrated from UserData at runtime)
  subscription_status: 'active' | 'inactive' | 'trial' | 'free';
  subscription_end_date?: string; // ISO Date string
}

export interface UserData {
  transactions: Transaction[];
  categories: { INCOME: string[]; EXPENSE: string[] };
  goals?: Goal[];
  partnerId?: string; // ID do usuário conectado (se houver)
  partnerName?: string; // Nome do usuário conectado
  subscription?: {
    status: 'active' | 'inactive' | 'trial' | 'free';
    end_date?: string;
    trial_start_date?: string;
  };
}