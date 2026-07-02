// CORS da borda do widget: só domínios na allowlist do sistema podem embutir.
// Framework-agnostic: retorna cabeçalhos e um booleano de decisão.

function normalize(origin: string): string {
  return origin.trim().replace(/\/+$/, "").toLowerCase();
}

/**
 * Decide se uma origem pode usar o widget. `*` na allowlist libera qualquer origem.
 * A comparação é exata (esquema + host + porta), case-insensitive.
 */
export function isOriginAllowed(
  origin: string | null | undefined,
  allowedOrigins: string[],
): boolean {
  if (!allowedOrigins || allowedOrigins.length === 0) return false;
  if (allowedOrigins.includes("*")) return true;
  if (!origin) return false;
  const target = normalize(origin);
  return allowedOrigins.some((o) => normalize(o) === target);
}

export interface CorsHeaderOptions {
  methods?: string[];
  headers?: string[];
  maxAgeSeconds?: number;
}

/**
 * Monta os cabeçalhos CORS quando a origem é permitida. Retorna `{}` quando não é
 * (o chamador deve responder 403 sem cabeçalhos CORS). Se a allowlist for `*`,
 * ecoa a origem específica (ou `*` se não houver origem) — o widget não usa
 * cookies, então isso é seguro.
 */
export function corsHeaders(
  origin: string | null | undefined,
  allowedOrigins: string[],
  opts: CorsHeaderOptions = {},
): Record<string, string> {
  if (!isOriginAllowed(origin, allowedOrigins)) return {};
  const {
    methods = ["GET", "POST", "OPTIONS"],
    headers = ["Content-Type", "Authorization", "X-Synova-Key"],
    maxAgeSeconds = 600,
  } = opts;
  const allowOrigin = allowedOrigins.includes("*") && !origin ? "*" : origin!;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": headers.join(", "),
    "Access-Control-Max-Age": String(maxAgeSeconds),
    Vary: "Origin",
  };
}
