import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { PanelHeader } from "@/components/panel-header";

export default async function SuporteLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-screen">
      <PanelHeader />
      <main className="p-6">{children}</main>
    </div>
  );
}
