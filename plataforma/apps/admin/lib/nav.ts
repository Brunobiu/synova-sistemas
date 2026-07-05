// Navegação do painel: menu primário (consistente em todas as áreas) e a trilha
// (breadcrumb) hierárquica de cada rota. Lógica pura, sem React, para ser testável.

export interface NavItem {
  label: string;
  href: string;
}

/** Menu de topo — o MESMO em todo o painel, para não "trocar" entre ERP e Atendimento. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Projetos", href: "/erp" },
  { label: "IA", href: "/erp/ia" },
  { label: "Admins", href: "/erp/admins" },
  { label: "Atendimento", href: "/meu-atendimento" },
  { label: "Notificações", href: "/meu-atendimento/notificacoes" },
  { label: "Métricas", href: "/meu-atendimento/metricas" },
];

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

/** Trilha (breadcrumb) para o caminho atual. O último item é a página atual. */
export function crumbsFor(pathname: string): NavItem[] {
  const projetos: NavItem = { label: "Projetos", href: "/erp" };
  const atendimento: NavItem = { label: "Atendimento", href: "/meu-atendimento" };

  // ERP
  if (pathname === "/erp") return [projetos];
  if (pathname === "/erp/systems/new")
    return [projetos, { label: "Novo sistema", href: pathname }];
  if (pathname.startsWith("/erp/systems/"))
    return [projetos, { label: "Sistema", href: pathname }];
  if (pathname === "/erp/ia") return [{ label: "IA", href: "/erp/ia" }];
  if (pathname === "/erp/admins") return [{ label: "Admins", href: "/erp/admins" }];

  // Atendimento
  if (pathname === "/meu-atendimento")
    return [atendimento, { label: "Caixa", href: "/meu-atendimento" }];
  if (pathname.startsWith("/meu-atendimento/chats/"))
    return [
      atendimento,
      { label: "Caixa", href: "/meu-atendimento" },
      { label: "Conversa", href: pathname },
    ];
  if (pathname === "/meu-atendimento/notificacoes")
    return [atendimento, { label: "Notificações", href: "/meu-atendimento/notificacoes" }];
  if (pathname === "/meu-atendimento/metricas")
    return [atendimento, { label: "Métricas", href: "/meu-atendimento/metricas" }];

  return [];
}
