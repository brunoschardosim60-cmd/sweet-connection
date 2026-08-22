import { createFileRoute } from "@tanstack/react-router";
import { PaginaLegal } from "@/components/legal/PaginaLegal";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — Nexa" },
      {
        name: "description",
        content: "Como a Nexa trata dados pessoais de contas, mini-sites e formulários.",
      },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <PaginaLegal
      titulo="Política de privacidade"
      descricao="Este documento explica, em linguagem direta, quais dados a plataforma utiliza e para quais finalidades."
    >
      <section>
        <h2>1. Papéis e alcance</h2>
        <p>
          A Nexa fornece a infraestrutura para criação e publicação de mini-sites. O titular da
          conta administra os dados dos próprios clientes e os envios recebidos por seus
          formulários. Cada negócio publicado também é responsável pelo conteúdo e pelas formas de
          contato que disponibiliza ao público.
        </p>
      </section>

      <section>
        <h2>2. Dados tratados</h2>
        <ul>
          <li>
            nome, e-mail e identificador da conta para cadastro, login e recuperação de acesso;
          </li>
          <li>
            dados de clientes, conteúdo dos mini-sites e arquivos enviados pelo administrador;
          </li>
          <li>respostas fornecidas voluntariamente em formulários públicos;</li>
          <li>
            eventos técnicos de visita e clique, origem de acesso e um identificador aleatório da
            sessão;
          </li>
          <li>preferências locais de tema, sessão autenticada e estado de navegação.</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalidades</h2>
        <p>
          Os dados são usados para autenticar usuários, salvar e publicar mini-sites, entregar
          mensagens ao administrador correto, apresentar estatísticas agregadas, prevenir abuso e
          manter a segurança e o funcionamento da plataforma.
        </p>
      </section>

      <section>
        <h2>4. Armazenamento e compartilhamento</h2>
        <p>
          Contas e dados operacionais são armazenados no Supabase externo conectado à plataforma.
          Mídias enviadas para uso nos mini-sites são armazenadas em endereço público para que
          imagens e vídeos possam ser exibidos aos visitantes. Não envie documentos, dados pessoais
          sensíveis ou qualquer arquivo que não possa ficar acessível publicamente. A Nexa não vende
          dados pessoais.
        </p>
      </section>

      <section>
        <h2>5. Bases, direitos e contato</h2>
        <p>
          O tratamento ocorre conforme a finalidade aplicável, como execução do serviço, cumprimento
          de obrigações legais, prevenção a fraude e consentimento quando solicitado. A pessoa pode
          pedir confirmação de tratamento, acesso, correção, eliminação, portabilidade, informação
          sobre compartilhamentos ou revisão de consentimento pelo canal de contato divulgado pela
          plataforma. O responsável pela conta continua sendo responsável pelos dados que coleta em
          seus próprios formulários públicos.
        </p>
      </section>

      <section>
        <h2>6. Dados no navegador</h2>
        <p>
          O navegador mantém a sessão autenticada e a preferência de tema. Nos mini-sites públicos,
          um identificador aleatório é guardado somente durante a sessão para limitar envios
          repetidos e contabilizar eventos sem exigir cadastro do visitante.
        </p>
      </section>

      <section>
        <h2>7. Retenção e exclusão</h2>
        <p>
          Os dados permanecem enquanto forem necessários para prestar o serviço ou cumprir obrigação
          legal. O administrador pode usar <strong>Apagar tudo</strong> para excluir clientes,
          mini-sites e envios, ou <strong>Excluir minha conta</strong> para remover também seu
          login. Contas sem atividade por 180 dias entram em uma carência de 30 dias; um novo acesso
          durante a carência cancela a exclusão. Após 210 dias contínuos de inatividade, a conta e
          seus dados podem ser removidos automaticamente. Pedidos adicionais de acesso, correção,
          portabilidade ou exclusão devem ser encaminhados ao canal de contato divulgado pelo
          responsável pela plataforma.
        </p>
      </section>

      <section>
        <h2>8. Segurança e responsabilidades</h2>
        <p>
          A plataforma aplica autenticação e políticas de isolamento por conta. Ainda assim, nenhum
          serviço conectado à internet elimina totalmente os riscos. Usuários devem proteger sua
          senha, limitar os dados coletados e não publicar informações sensíveis em páginas ou
          arquivos públicos.
        </p>
      </section>

      <section>
        <h2>9. Alterações</h2>
        <p>
          Esta política pode ser atualizada quando o produto ou as obrigações aplicáveis mudarem. A
          data da revisão mais recente permanece visível no início do documento.
        </p>
      </section>
    </PaginaLegal>
  );
}
