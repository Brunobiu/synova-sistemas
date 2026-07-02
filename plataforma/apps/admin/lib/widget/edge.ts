import {
  verifyWidgetTokenRotating,
  isOriginAllowed,
  corsHeaders,
  widgetRateLimiter,
  apiErr,
  httpStatusForCode,
  type RateLimiter,
  type RateLimitOptions,
  type WidgetScope,
  type ApiErrorBody,
} from "@synova/shared";
import { getSystemAuthByApiKey, type SystemAuth } from "./systems";

// Guarda de borda do widget: valida chave, origem (CORS), token assinado (com
// convivência de segredo) e aplica rate limit. Tudo aqui é composição de peças
// puras do @synova/shared, então é testável injetando dependências (sem DB).

export interface WidgetGuardInput {
  apiKey: string | null;
  origin: string | null;
  token: string | null;
  ip: string;
}

export interface WidgetGuardDeps {
  resolveSystem?: (apiKey: string) => Promise<SystemAuth | null>;
  rateLimiter?: RateLimiter;
  rateLimit?: RateLimitOptions;
  graceSeconds?: number;
}

export type WidgetGuardResult =
  | { ok: true; scope: WidgetScope; systemAuth: SystemAuth; headers: Record<string, string> }
  | { ok: false; status: number; body: ApiErrorBody; headers: Record<string, string> };

const DEFAULT_RATE_LIMIT: RateLimitOptions = { limit: 60, windowMs: 60_000 };

function fail(
  code: ApiErrorBody["code"],
  message: string,
  headers: Record<string, string> = {},
): WidgetGuardResult {
  return { ok: false, status: httpStatusForCode(code), body: apiErr(code, message), headers };
}

export async function guardWidgetRequest(
  input: WidgetGuardInput,
  deps: WidgetGuardDeps = {},
): Promise<WidgetGuardResult> {
  const resolveSystem = deps.resolveSystem ?? getSystemAuthByApiKey;
  const limiter = deps.rateLimiter ?? widgetRateLimiter;
  const rateOpts = deps.rateLimit ?? DEFAULT_RATE_LIMIT;

  // 1) Rate limit (por chave + IP) antes de qualquer trabalho mais caro.
  const rlKey = `${input.apiKey ?? "nokey"}:${input.ip || "unknown"}`;
  const rl = limiter.check(rlKey, rateOpts);
  if (!rl.allowed) {
    return fail("rate_limited", "Muitas requisições. Tente novamente em instantes.", {
      "Retry-After": String(rl.retryAfterSeconds),
    });
  }

  // 2) Chave pública obrigatória.
  if (!input.apiKey) return fail("unauthorized", "Chave de integração ausente.");

  // 3) Resolve o sistema. Chave inexistente e segredo ilegível dão o mesmo 401.
  const system = await resolveSystem(input.apiKey);
  if (!system) return fail("unauthorized", "Chave de integração inválida.");

  // 4) Sistema precisa estar ativo.
  if (system.status !== "active") {
    return fail("forbidden", "Sistema indisponível.");
  }

  // 5) Origem precisa estar na allowlist (CORS).
  if (!isOriginAllowed(input.origin, system.allowedOrigins)) {
    return fail("forbidden", "Origem não permitida.");
  }
  const headers = corsHeaders(input.origin, system.allowedOrigins);

  // 6) Token assinado obrigatório e válido (aceitando o segredo anterior na janela).
  if (!input.token) return fail("unauthorized", "Token ausente.", headers);
  const verified = verifyWidgetTokenRotating(input.token, system.secret, {
    previousSecret: system.previousSecret,
    secretRotatedAt: system.secretRotatedAt,
    graceSeconds: deps.graceSeconds,
  });
  if (!verified.valid) {
    const message = verified.reason === "expired" ? "Sessão expirada." : "Token inválido.";
    return fail("unauthorized", message, headers);
  }

  // 7) Defesa em profundidade: o escopo do token tem que ser do mesmo sistema da chave.
  if (verified.scope.systemId !== system.systemId) {
    return fail("forbidden", "Escopo não corresponde à chave.", headers);
  }

  return { ok: true, scope: verified.scope, systemAuth: system, headers };
}
