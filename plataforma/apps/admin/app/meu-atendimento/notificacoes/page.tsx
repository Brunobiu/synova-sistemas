import { listNotifications } from "@/lib/support/notifications";
import { listSystemsForFilter } from "@/lib/support/data";
import { groupBySystem, unreadCount } from "@/lib/support/notifications-util";
import { NotificationItem } from "@/components/support/notification-item";
import { NotificationsFilters } from "@/components/support/notifications-filters";
import { MarkAllReadButton } from "@/components/support/mark-all-read";
import { AutoRefresh } from "@/components/support/auto-refresh";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ system?: string; status?: string; priority?: string }>;
}) {
  const sp = await searchParams;
  const [notes, systems] = await Promise.all([
    listNotifications({ systemId: sp.system, status: sp.status, priority: sp.priority }),
    listSystemsForFilter(),
  ]);
  const groups = groupBySystem(notes);
  const unread = unreadCount(notes);

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={8} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Notificações</h1>
          <p className="text-sm text-gray-500">{unread} não lida(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <NotificationsFilters systems={systems} />
          <MarkAllReadButton />
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma notificação.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.systemName} className="space-y-2">
              <h2 className="text-sm font-medium text-gray-500">{g.systemName}</h2>
              <div className="space-y-2">
                {g.items.map((n) => (
                  <NotificationItem key={n.id} note={n} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
