
import * as React from 'react';
import { ArrowLeft, Lock, Eye } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 animate-fade-in">
      <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Lock size={24} className="text-green-600" />
            Política de Privacidade
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8 text-sm leading-relaxed text-gray-600">
        
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">1. Introdução</h2>
          <p>
            A sua privacidade é importante para nós. É política do Duo Finanças respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no aplicativo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">2. Dados Coletados</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Informações de Cadastro:</strong> Nome, endereço de e-mail e telefone para criação e recuperação de conta.</li>
            <li><strong>Dados Financeiros:</strong> Descrições de transações, valores, categorias e datas inseridas manualmente por você.</li>
            <li><strong>Dados Técnicos:</strong> Endereço IP e tipo de dispositivo para segurança e melhoria do sistema.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">3. Como Usamos Seus Dados</h2>
          <p>
            Utilizamos seus dados exclusivamente para:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Fornecer e manter o serviço de gestão financeira;</li>
            <li>Sincronizar informações entre contas conectadas (Modo Casal);</li>
            <li>Processar pagamentos de assinaturas;</li>
            <li>Notificar sobre alterações no serviço.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">4. Armazenamento e Segurança</h2>
          <p>
            Seus dados são armazenados de forma segura utilizando os serviços do <strong>Supabase</strong>. Implementamos medidas de segurança comercialmente aceitáveis para proteger contra perda, roubo, acesso não autorizado, divulgação, cópia, uso ou modificação.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">5. Compartilhamento de Dados</h2>
          <p>
            Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei ou para processamento necessário do serviço:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Stripe:</strong> Para processamento de pagamentos seguros.</li>
            <li><strong>Supabase:</strong> Para infraestrutura de banco de dados e autenticação.</li>
            <li><strong>Parceiro Conectado:</strong> Ao usar o "Modo Casal", seus dados financeiros são visíveis para a conta conectada.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">6. Seus Direitos (LGPD)</h2>
          <p>
            Você tem o direito de solicitar o acesso, correção ou exclusão de seus dados pessoais a qualquer momento. Você pode excluir sua conta e todos os dados associados diretamente através do painel de configurações ou solicitando ao suporte.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">7. Cookies e Armazenamento Local</h2>
          <p>
            Utilizamos armazenamento local (LocalStorage) no seu dispositivo para manter sua sessão ativa e melhorar a performance do carregamento de dados (cache).
          </p>
        </section>

        <div className="pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Última atualização: Março de 2024.
          </p>
        </div>

      </main>
    </div>
  );
};

export default PrivacyPolicy;
