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

export type { Database };
export * from "./models";
export * from "./access";
