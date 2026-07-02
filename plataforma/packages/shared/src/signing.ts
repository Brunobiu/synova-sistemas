import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Escopo autenticado carregado pelo token do widget.
 * Identifica simultaneamente sistema, empresa e usuário (R1.4, R7).
 */
export interface WidgetScope {
  systemId: string;
  tenantId: string;
  userId?: string;
  externalRef?: string;
}

interface TokenPayload extends WidgetScope {
  iat: number;
  exp: number;
}

export type VerifyResult =
  | { valid: true; scope: WidgetScope }
  | { valid: false; reason: "malformed" | "bad_signature" | "expired" };

const DEFAULT_TTL_SECONDS = 300; // 5 minutos

function b64urlEncode(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

function b64urlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

/**
 * Assina um token curto (HMAC-SHA256) com o segredo do sistema.
 * O backend do SaaS host chama isto; o segredo NUNCA vai para o browser.
 */
export function signWidgetToken(
  scope: WidgetScope,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): string {
  if (!secret) {
    throw new Error("secret é obrigatório para assinar o token");
  }
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { ...scope, iat: now, exp: now + ttlSeconds };
  const encoded = b64urlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

/**
 * Verifica assinatura + expiração e devolve o escopo autenticado.
 * A verificação da assinatura acontece antes de qualquer parse do payload.
 */
export function verifyWidgetToken(token: string, secret: string): VerifyResult {
  if (!token || !secret) return { valid: false, reason: "malformed" };

  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed" };

  const encoded = parts[0];
  const signature = parts[1];
  if (encoded === undefined || signature === undefined) {
    return { valid: false, reason: "malformed" };
  }

  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  const sigBuf = Buffer.from(signature, "base64url");
  const expBuf = Buffer.from(expected, "base64url");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: "bad_signature" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(encoded)) as TokenPayload;
  } catch {
    return { valid: false, reason: "malformed" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) {
    return { valid: false, reason: "expired" };
  }

  return {
    valid: true,
    scope: {
      systemId: payload.systemId,
      tenantId: payload.tenantId,
      userId: payload.userId,
      externalRef: payload.externalRef,
    },
  };
}

export interface RotationOptions {
  /** Segredo anterior (em claro), preservado durante a janela de convivência. */
  previousSecret?: string | null;
  /** Momento da rotação (epoch em segundos). */
  secretRotatedAt?: number | null;
  /** Duração da janela de convivência em segundos (padrão: 24h). */
  graceSeconds?: number;
}

const DEFAULT_GRACE_SECONDS = 86_400; // 24h

/**
 * Verifica o token aceitando o segredo atual e, se a assinatura não bater e
 * ainda estivermos dentro da janela de convivência, também o segredo anterior.
 * Isso permite rotacionar o segredo sem derrubar instalações ativas do widget.
 */
export function verifyWidgetTokenRotating(
  token: string,
  currentSecret: string,
  opts: RotationOptions = {},
): VerifyResult {
  const primary = verifyWidgetToken(token, currentSecret);
  // Válido, expirado ou malformado são resultados terminais: só re-tentamos o
  // segredo anterior quando a assinatura não confere.
  if (primary.valid || primary.reason !== "bad_signature") return primary;

  const { previousSecret, secretRotatedAt, graceSeconds = DEFAULT_GRACE_SECONDS } = opts;
  if (!previousSecret) return primary;

  if (typeof secretRotatedAt === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (now > secretRotatedAt + graceSeconds) return primary; // janela expirou
  }

  const fallback = verifyWidgetToken(token, previousSecret);
  return fallback.valid ? fallback : primary;
}
