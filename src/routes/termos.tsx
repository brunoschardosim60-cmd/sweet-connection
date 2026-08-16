import { createFileRoute } from "@tanstack/react-router";
import { PaginaLegal } from "@/components/legal/PaginaLegal";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — Nexa" },
      {
        name: "description",
        content: "Condições mínimas para criar contas e publicar mini-sites na Nexa.",
      },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <PaginaLegal
      titulo="Termos de uso"
      descricao="Ao criar uma conta ou utilizar a plataforma, o usuário concorda com as condições abaixo."
    >
      <section>
        <h2>1. Conta e acesso</h2>
        <p>
          Cada pessoa deve usar uma conta própria, fornecer informações corretas e manter sua senha
          protegida. O usuário é responsável pelas ações realizadas em sua sessão e deve comunicar
          qualquer suspeita de acesso indevido.
        </p>
      </section>

      <section>
        <h2>2. Uso permitido</h2>
        <p>
          A plataforma pode ser usada para criar mini-sites lícitos e profissionais. É proibido
          publicar conteúdo ilegal, fraudulento, discriminatório, malicioso, que viole direitos de
          terceiros ou que tente comprometer a segurança e a disponibilidade do serviço.
        </p>
      </section>

      <section>
        <h2>3. Conteúdo e dados de clientes</h2>
        <p>
          O titular da conta responde pelo conteúdo publicado, pelas imagens que envia, pelas
          autorizações de uso e pelos dados coletados em seus formulários. Deve coletar somente o
          necessário, informar a finalidade e atender os direitos dos titulares conforme a
          legislação aplicável.
        </p>
      </section>

      <section>
        <h2>4. Publicação</h2>
        <p>
          Rascunhos e sites pausados não são destinados ao acesso público. Ao publicar um mini-site,
          o usuário confirma que revisou seu conteúdo e autoriza a exibição pública das informações
          e mídias nele incluídas.
        </p>
      </section>

      <section>
        <h2>5. Recursos externos</h2>
        <p>
          Links, WhatsApp, mapas, redes sociais, hospedagem, domínio e outros serviços de terceiros
          podem estar sujeitos a regras e disponibilidade próprias. Configurações experimentais ou
          marcadas como futuras não integram uma garantia de funcionamento comercial.
        </p>
      </section>

      <section>
        <h2>6. Disponibilidade e mudanças</h2>
        <p>
          A plataforma pode receber manutenções, correções e melhorias. Falhas relevantes serão
          tratadas com esforço razoável, mas não há garantia de disponibilidade ininterrupta
          enquanto o produto estiver em fase de preparação comercial.
        </p>
      </section>

      <section>
        <h2>7. Suspensão e encerramento</h2>
        <p>
          Contas usadas para abuso, fraude, violação de direitos ou risco à segurança podem ser
          suspensas. O usuário pode apagar os dados operacionais de sua conta pelo painel; a
          exclusão da identidade de autenticação pode exigir solicitação ao responsável pela
          plataforma.
        </p>
      </section>

      <section>
        <h2>8. Contato e alterações</h2>
        <p>
          Dúvidas e solicitações devem ser enviadas ao canal de contato divulgado pela plataforma.
          Estes termos podem ser atualizados, mantendo a data da revisão mais recente visível no
          início do documento.
        </p>
      </section>
    </PaginaLegal>
  );
}
