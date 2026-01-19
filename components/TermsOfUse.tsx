
import * as React from 'react';
import { ArrowLeft, FileText, ShieldAlert } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const TermsOfUse: React.FC<Props> = ({ onBack }) => {
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
            <FileText size={24} className="text-indigo-600" />
            Termos de Uso
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8 text-sm leading-relaxed text-gray-600">
        
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e usar o aplicativo <strong>Duo Finanças</strong>, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este serviço.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">2. Descrição do Serviço</h2>
          <p>
            O Duo Finanças é uma plataforma de gestão financeira voltada para casais e indivíduos. O serviço permite o registro de transações, definição de metas e visualização de relatórios. O serviço é fornecido "como está", e não atuamos como consultores financeiros, bancários ou de investimentos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">3. Assinaturas e Pagamentos</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Período de Teste:</strong> Oferecemos um período de teste gratuito de 7 dias. Após este período, funcionalidades podem ser limitadas.</li>
            <li><strong>Plano Pro:</strong> O acesso completo requer uma assinatura mensal (atualmente R$ 4,99/mês).</li>
            <li><strong>Processamento:</strong> Os pagamentos são processados via <strong>Stripe</strong>. Nós não armazenamos os dados completos do seu cartão de crédito.</li>
            <li><strong>Cancelamento:</strong> Você pode cancelar sua assinatura a qualquer momento. O cancelamento interromperá a renovação automática, mas não haverá reembolso para o período já pago.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">4. Modo Casal e Compartilhamento</h2>
          <p>
            Ao utilizar a funcionalidade "Modo Casal", você concorda explicitamente em compartilhar seus dados financeiros (lançamentos, categorias, metas) com o parceiro conectado através do e-mail fornecido. Você é responsável por garantir que tem o consentimento para tal conexão.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">5. Responsabilidades do Usuário</h2>
          <p>
            Você é responsável por manter a confidencialidade de sua conta e senha. O Duo Finanças não se responsabiliza por perdas decorrentes de acesso não autorizado à sua conta causado por falha na proteção de suas credenciais.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">6. Limitação de Responsabilidade</h2>
          <p>
            Em nenhum caso o Duo Finanças ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro) decorrentes do uso ou da incapacidade de usar o aplicativo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-2">7. Modificações</h2>
          <p>
            O Duo Finanças pode revisar estes termos de serviço a qualquer momento, sem aviso prévio. Ao usar este aplicativo, você concorda em ficar vinculado à versão atual desses termos de serviço.
          </p>
        </section>

        <div className="pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Última atualização: Março de 2024. <br/>
            Dúvidas? Entre em contato com o suporte.
          </p>
        </div>

      </main>
    </div>
  );
};

export default TermsOfUse;
