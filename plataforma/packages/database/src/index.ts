import {
  createBrowserClient,
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";
import type { Database } from "./types";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL não definida");
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não definida");
  return key;
}

function getSupabaseServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida");
  return key;
}

/**
 * Cliente para uso no browser (Client Components).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

/**
 * Cliente para uso no servidor (Server Components / Route Handlers).
 * Cada app passa os métodos de cookie do seu framework (ex: next/headers).
 */
export function createSupabaseServerClient(cookies: CookieMethodsServer) {
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies,
  });
}

/**
 * Cliente com a SERVICE ROLE (ignora RLS). Uso EXCLUSIVO server-side na borda
 * pública do widget, que é anônima: o isolamento é garantido no código a partir
 * do escopo assinado (systemId/tenantId), nunca confiando no input do cliente.
 * NUNCA use este client em rotas do painel (essas usam o client com sessão + RLS).
 */
export function createSupabaseServiceClient() {
  return createServerClient(getSupabaseUrl(), getSupabaseServiceKey(), {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

export type { Database };
export * from "./models";
export * from "./access";
