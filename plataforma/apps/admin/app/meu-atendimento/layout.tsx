import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function SuporteLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/meu-atendimento" className="font-semibold">
            Synova · Atendimento
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/meu-atendimento" className="hover:text-gray-900">
              Caixa
            </Link>
            <Link href="/meu-atendimento/notificacoes" className="hover:text-gray-900">
              Notificações
            </Link>
            <Link href="/meu-atendimento/metricas" className="hover:text-gray-900">
              Métricas
            </Link>
            <Link href="/erp" className="hover:text-gray-900">
              ERP
            </Link>
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
