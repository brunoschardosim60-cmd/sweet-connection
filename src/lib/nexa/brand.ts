/**
 * Identidade da plataforma.
 * Troque aqui o nome, domínio, cores de marca e contatos —
 * toda a aplicação lê deste arquivo.
 */
export const brand = {
  nome: "Nexa",
  slogan: "Mini-sites profissionais para negócios brasileiros",
  dominio: "nexa.app",
  emailContato: "contato@nexa.app",
  whatsappComercial: "5511987654321",
  instagram: "nexa.app",
  assinatura: "Criado com Nexa",
} as const;

export const whatsappLink = (numero: string, mensagem: string) =>
  `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
