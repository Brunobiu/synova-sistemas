// Papéis de acesso do painel. Lógica pura (sem React/Supabase) para ser testável.
//
// v1:
//  - "admin"  = Administrador (dono): acesso total (papel histórico).
//  - "agent"  = Atendente: só a área de Atendimento (Caixa, Notificações, Métricas).
// Escopo por cliente (agent ver só alguns sistemas) fica para uma evolução (v2).

export type Role = "admin" | "agent";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  agent: "Atendente",
};

/** Descrição curta de cada papel, para a UI de convite. */
export const ROLE_HINTS: Record<Role, string> = {
  admin: "Acesso total: projetos, IA, admins e atendimento.",
  agent: "Só o atendimento: caixa, notificações e métricas.",
};

export function isRole(value: unknown): value is Role {
  return value === "admin" || value === "agent";
}

/** Área do painel a que uma rota/menu pertence. */
export type Area = "erp" | "support";

/** ERP (projetos, IA, admins, detalhe/config de sistema) é exclusivo do admin. */
export function canAccessErp(role: Role): boolean {
  return role === "admin";
}

/** Gerenciar admins/atendentes é exclusivo do admin. */
export function canManageAdmins(role: Role): boolean {
  return role === "admin";
}

/** O atendimento é acessível a admin e agent. */
export function canAccessSupport(role: Role): boolean {
  return role === "admin" || role === "agent";
}

/** Página inicial conforme o papel (destino pós-login). */
export function homeFor(role: Role): string {
  return canAccessErp(role) ? "/erp" : "/meu-atendimento";
}
