import { NextResponse } from "next/server";
import { apiOk, signWidgetToken, type WidgetScope } from "@synova/shared";

// Helpers HTTP da borda pública do widget: leitura de request, respostas com CORS
// e emissão do token de sessão.

export interface WidgetRequestParts {
  apiKey: string | null;
  origin: string | null;
  token: string | null;
  ip: string;
}

/** Extrai chave, origem, token (Bearer) e IP de uma requisição. */
export function readWidgetRequest(req: Request): WidgetRequestParts {
  const auth = req.headers.get("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const fwd = req.headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0]?.trim() : null) || req.headers.get("x-real-ip") || "unknown";
  return {
    apiKey: req.headers.get("x-synova-key"),
    origin: req.headers.get("origin"),
    token,
    ip,
  };
}

const PREFLIGHT_HEADERS = (origin: string | null): Record<string, string> => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Synova-Key",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
});

/**
 * Resposta ao preflight (OPTIONS). Ecoa a origem para o navegador prosseguir; a
 * requisição real é que aplica a allowlist por sistema (o header da chave não vem
 * no preflight). Como o widget não usa cookies, isso é seguro.
 */
export function preflightResponse(req: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: PREFLIGHT_HEADERS(req.headers.get("origin")) });
}

export function widgetError(
  result: { status: number; body: unknown; headers: Record<string, string> },
): NextResponse {
  return NextResponse.json(result.body, { status: result.status, headers: result.headers });
}

export function widgetOk<T>(data: T, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(apiOk(data), { headers });
}

// Token de sessão do widget: validade de 12h.
const TOKEN_TTL_SECONDS = 12 * 60 * 60;

export function mintWidgetToken(scope: WidgetScope, secret: string): string {
  return signWidgetToken(scope, secret, TOKEN_TTL_SECONDS);
}
