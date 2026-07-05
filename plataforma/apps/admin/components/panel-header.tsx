"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, crumbsFor, isNavActive } from "@/lib/nav";
import { LogoutButton } from "@/components/logout-button";

/**
 * Cabeçalho único do painel: menu de topo consistente (não troca entre ERP e
 * Atendimento) + trilha (breadcrumb) clicável logo abaixo.
 */
export function PanelHeader() {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);

  return (
    <header className="border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/erp" className="font-semibold">
            Synova · Painel
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            {PRIMARY_NAV.map((item) => {
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

      {crumbs.length > 0 && (
        <nav
          aria-label="Trilha de navegação"
          className="border-t bg-gray-50/50 px-6 py-2"
        >
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={`${c.href}-${i}`} className="flex items-center gap-1.5">
                  {last ? (
                    <span className="text-gray-700" aria-current="page">
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="hover:text-gray-900">
                      {c.label}
                    </Link>
                  )}
                  {!last && (
                    <span aria-hidden="true" className="text-gray-300">
                      ›
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </header>
  );
}
