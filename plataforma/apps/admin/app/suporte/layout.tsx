import type { ReactNode } from "react";
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
        <span className="font-semibold">Synova · Suporte</span>
        <LogoutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
