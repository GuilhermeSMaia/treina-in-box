/**
 * URL pública do app, incluindo o subcaminho do GitHub Pages
 * (ex.: https://usuario.github.io/treina-in-box-main), sem barra final.
 * Use sempre que montar links para fora do app (convites, redirects de email).
 */
export function getAppUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/+$/, "");
}

export function getInviteLink(token: string): string {
  return `${getAppUrl()}/?invite=${token}`;
}

/** Normaliza telefone para o formato do wa.me (apenas dígitos, com DDI 55 se faltar). */
export function normalizeWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  // 10 ou 11 dígitos = número brasileiro com DDD e sem código do país
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function getWhatsAppUrl(phone: string, inviteLink: string): string {
  const message = `Você foi convidado para participar do treinamento na Treina in Box! Acesse: ${inviteLink}`;
  return `https://wa.me/${normalizeWhatsAppPhone(phone)}?text=${encodeURIComponent(message)}`;
}
