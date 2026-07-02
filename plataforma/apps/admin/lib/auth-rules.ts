// Regras puras de proteção de rota (sem dependência de Supabase),
// usadas pelo middleware e testáveis isoladamente.

export const PROTECTED_PREFIXES = ["/erp", "/suporte", "/api/admin"] as const;

/** Retorna true se o caminho pertence a uma área protegida (admin). */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export type AuthDecision = "allow" | "redirect-login";

/** Decide o acesso a partir do caminho e da presença de usuário autenticado. */
export function decideAccess(pathname: string, hasUser: boolean): AuthDecision {
  if (isProtectedPath(pathname) && !hasUser) {
    return "redirect-login";
  }
  return "allow";
}
