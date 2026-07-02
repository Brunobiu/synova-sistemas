import Link from "next/link";
import type { SystemRow } from "@synova/database";
import { SYSTEM_STATUS_LABELS } from "@/lib/erp/schema";
import { ArchiveSystemButton } from "./archive-system-button";

const statusStyle: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  archived: "bg-amber-100 text-amber-700",
};

export function SystemCard({ system }: { system: SystemRow }) {
  const status = system.status ?? "active";
  return (
    <div className="flex flex-col rounded-lg border p-4 transition hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100 text-gray-400">
          {system.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={system.image_url} alt={system.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-semibold">
              {system.name?.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/erp/systems/${system.id}`} className="block truncate font-medium hover:underline">
            {system.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs ${statusStyle[status] ?? statusStyle.active}`}>
              {SYSTEM_STATUS_LABELS[status as keyof typeof SYSTEM_STATUS_LABELS] ?? status}
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {system.is_own ? "Próprio" : "Cliente"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Link href={`/erp/systems/${system.id}`} className="text-sm text-gray-500 hover:underline">
          Abrir
        </Link>
        {status !== "archived" && <ArchiveSystemButton id={system.id} />}
      </div>
    </div>
  );
}
