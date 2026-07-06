import type { ReactNode } from "react";
import { requireOwner } from "@/lib/auth";
import { PanelHeader } from "@/components/panel-header";

export default async function ErpLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return (
    <div className="min-h-screen">
      <PanelHeader role="admin" />
      <main className="p-6">{children}</main>
    </div>
  );
}
