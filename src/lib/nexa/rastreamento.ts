/** IDs públicos de integração, nunca código JavaScript fornecido pelo dono do site. */
export function idRastreador(tipo: "ga" | "gtm" | "pixel", valor?: string) {
  const id = typeof valor === "string" ? valor.trim() : "";
  const formatos = {
    ga: /^G-[A-Z0-9]{4,32}$/,
    gtm: /^GTM-[A-Z0-9]{4,32}$/,
    pixel: /^\d{5,30}$/,
  };
  return formatos[tipo].test(id) ? id : "";
}
