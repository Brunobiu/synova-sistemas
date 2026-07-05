"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markNotificationResolved } from "@/lib/support/notification-actions";
import { NOTIFICATION_LABEL, type NotificationView } from "@/lib/support/notifications-util";
import { Button } from "@/components/ui/button";

const PRIORITY_BADGE: Record<string, string> = {
  critica: "bg-red-600 text-white",
  alta: "bg-orange-500 text-white",
  media: "bg-gray-200 text-gray-700",
  baixa: "bg-gray-100 text-gray-600",
};

export function NotificationItem({ note }: { note: NotificationView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  const isCritical = note.priority === "critica";

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${
        isCritical ? "border-red-300 bg-red-50" : note.status === "unread" ? "border-indigo-200 bg-indigo-50/40" : "border-gray-200 bg-white"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_BADGE[note.priority] ?? "bg-gray-100"}`}>
            {note.priority.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">{NOTIFICATION_LABEL[note.type] ?? note.type}</span>
          {note.status === "unread" && (
            <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">nova</span>
          )}
          {note.status === "resolved" && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">resolvida</span>
          )}
        </div>
        <p className="mt-0.5 truncate font-medium">{note.title}</p>
        {note.body && <p className="truncate text-sm text-gray-500">{note.body}</p>}
        <p className="text-xs text-gray-400">{note.systemName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {note.status !== "resolved" && (
          <>
            {note.status === "unread" && (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => markNotificationRead(note.id))}>
                Marcar lida
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => markNotificationResolved(note.id))}>
              Resolver
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
