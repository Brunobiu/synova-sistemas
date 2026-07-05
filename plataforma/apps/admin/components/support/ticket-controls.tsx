"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PRIORITIES } from "@synova/shared";
import { reclassifyTicketAction, resolveTicketAction } from "@/lib/support/actions";
import { Button } from "@/components/ui/button";

const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export function TicketControls({
  ticketId,
  priority,
  resolved,
}: {
  ticketId: string;
  priority: string;
  resolved: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onReclassify(value: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await reclassifyTicketAction(ticketId, value);
      if (res.ok) router.refresh();
      else setMsg(res.error);
    });
  }

  function onResolve() {
    setMsg(null);
    startTransition(async () => {
      const res = await resolveTicketAction(ticketId);
      if (res.ok) router.refresh();
      else setMsg(res.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded-md border px-2 py-1 text-xs"
        value={priority}
        disabled={pending}
        onChange={(e) => onReclassify(e.target.value)}
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>
      {!resolved && (
        <Button size="sm" variant="outline" disabled={pending} onClick={onResolve}>
          Resolver
        </Button>
      )}
      {msg && <span className="text-xs text-red-500">{msg}</span>}
    </div>
  );
}
