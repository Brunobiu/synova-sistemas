// Navegação do painel: menu de topo consistente em todas as áreas. Lógica pura,
// sem React, para ser testável.

import { canAccessErp, type Area, type Role } from "./auth/roles";

export interface NavItem {
  label: string;
  href: string;
  area: Area;
}

/** Menu de topo — o MESMO em todo o painel, para não "trocar" entre ERP e Atendimento. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Projetos", href: "/erp", area: "erp" },
  { label: "IA", href: "/erp/ia", area: "erp" },
  { label: "Admins", href: "/erp/admins", area: "erp" },
  { label: "Atendimento", href: "/meu-atendimento", area: "support" },
  { label: "Notificações", href: "/meu-atendimento/notificacoes", area: "support" },
  { label: "Métricas", href: "/meu-atendimento/metricas", area: "support" },
  { label: "Clientes", href: "/meu-atendimento/clientes", area: "support" },
  { label: "Landing page", href: "/erp/landing", area: "erp" },
];

/** Itens de menu visíveis para o papel: atendente só vê a área de atendimento. */
export function visibleNavFor(role: Role): NavItem[] {
  if (canAccessErp(role)) return PRIMARY_NAV;
  return PRIMARY_NAV.filter((item) => item.area === "support");
}

/** Decide se um item do menu está ativo para o caminho atual. */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/erp") {
    return pathname === "/erp" || pathname.startsWith("/erp/systems");
  }
  if (href === "/meu-atendimento") {
    return pathname === "/meu-atendimento" || pathname.startsWith("/meu-atendimento/chats");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
