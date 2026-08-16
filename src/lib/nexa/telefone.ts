export function telefoneWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  return digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
}
