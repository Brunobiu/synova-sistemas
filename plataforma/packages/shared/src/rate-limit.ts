// Rate limiting por janela fixa. Implementação em memória (por instância).
//
// NOTA DE PRODUÇÃO: em ambientes serverless (ex.: Vercel) cada instância tem sua
// própria memória, então o limite é aproximado. Para um limite global e preciso,
// troque o store por um compartilhado (ex.: Upstash/Redis) mantendo esta mesma API.
// Isso é endurecido no Bloco 15 (resiliência/pré-deploy).

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Epoch em ms em que a janela reinicia. */
  resetAt: number;
  /** Segundos até liberar de novo (para o cabeçalho Retry-After). */
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Máximo de requisições por janela. */
  limit: number;
  /** Duração da janela em ms. */
  windowMs: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private now: () => number;

  constructor(nowFn: () => number = Date.now) {
    this.now = nowFn;
  }

  check(key: string, opts: RateLimitOptions): RateLimitResult {
    const now = this.now();
    const existing = this.buckets.get(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + opts.windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit: opts.limit,
        remaining: opts.limit - 1,
        resetAt,
        retryAfterSeconds: 0,
      };
    }

    if (existing.count >= opts.limit) {
      return {
        allowed: false,
        limit: opts.limit,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      limit: opts.limit,
      remaining: opts.limit - existing.count,
      resetAt: existing.resetAt,
      retryAfterSeconds: 0,
    };
  }

  /** Limpa buckets expirados (chamado oportunisticamente). */
  sweep(): void {
    const now = this.now();
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
  }

  reset(): void {
    this.buckets.clear();
  }
}

/** Instância compartilhada padrão da borda do widget. */
export const widgetRateLimiter = new RateLimiter();
