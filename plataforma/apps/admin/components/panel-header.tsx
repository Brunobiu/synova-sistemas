"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, visibleNavFor } from "@/lib/nav";
import { homeFor, type Role } from "@/lib/auth/roles";
import { LogoutButton } from "@/components/logout-button";

/**
 * Cabeçalho único do painel: menu de topo consistente (não troca entre ERP e
 * Atendimento). Os itens são filtrados pelo papel (atendente só vê o atendimento).
 */
export function PanelHeader({ role }: { role: Role }) {
  const pathname = usePathname();
  const navItems = visibleNavFor(role);

  return (
    <header className="border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href={homeFor(role)} className="font-semibold">
            Synova · Painel
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            {navItems.map((item) => {
              const active = isNavActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "font-medium text-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
