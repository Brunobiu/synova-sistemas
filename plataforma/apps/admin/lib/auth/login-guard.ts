import { RateLimiter } from "@synova/shared";

// Proteção de força-bruta no login do painel.
//
// Chave = IP + e-mail alvo: freia tentativas repetidas contra UMA conta sem
// travar outros admins que compartilham o mesmo IP (ex.: escritório atrás de NAT).
//
// NOTA DE PRODUÇÃO: o store é em memória (por instância). Em serverless (Vercel)
// o limite é aproximado — suficiente contra brute force simples. Um limite global
// e preciso (e proteção contra ataque distribuído) exige store compartilhado
// (ex.: Upstash/Redis) + captcha, mantendo esta mesma API.
export const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 5 * 60_000 } as const;

/** Limiter dedicado ao login (separado do limiter da borda do widget). */
export const loginRateLimiter = new RateLimiter();

/** Normaliza o e-mail para a chave (trim + lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Chave do bucket de rate limit para uma tentativa de login. */
export function loginRateKey(ip: string | null, email: string): string {
  return `login:${ip || "unknown"}:${normalizeEmail(email)}`;
}

/** Fonte mínima de cabeçalhos (compatível com Headers do Next e com objetos de teste). */
export interface HeaderSource {
  get(name: string): string | null;
}

/** Extrai o IP do cliente a partir dos cabeçalhos (x-forwarded-for → x-real-ip). */
export function clientIpFromHeaders(headers: HeaderSource): string {
  const fwd = headers.get("x-forwarded-for");
  const first = fwd ? fwd.split(",")[0]?.trim() : null;
  return first || headers.get("x-real-ip") || "unknown";
}
