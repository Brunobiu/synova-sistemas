import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@synova/database";

/**
 * Cliente Supabase para Server Components / Route Handlers do painel.
 * Usa os cookies da requisição (next/headers).
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Em Server Components os cookies são read-only; o refresh de sessão
        // acontece no proxy (Next.js 16). Ignorar aqui é seguro.
      }
    },
  });
}
