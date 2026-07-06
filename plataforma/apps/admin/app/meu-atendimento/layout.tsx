import type { ReactNode } from "react";
import { requireStaff } from "@/lib/auth";
import { PanelHeader } from "@/components/panel-header";

export default async function SuporteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { role } = await requireStaff();
  return (
    <div className="min-h-screen">
      <PanelHeader role={role} />
      <main className="p-6">{children}</main>
    </div>
  );
}
