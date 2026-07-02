import { createSupabaseServiceClient } from "@synova/database";

/**
 * Cliente Supabase com SERVICE ROLE (ignora RLS). Uso EXCLUSIVO nas rotas
 * públicas do widget (anônimas): o isolamento é forçado no código a partir do
 * escopo assinado. NUNCA usar nas rotas do painel (essas usam sessão + RLS).
 */
export function getServiceSupabase() {
  return createSupabaseServiceClient();
}
