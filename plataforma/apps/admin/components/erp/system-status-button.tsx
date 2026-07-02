"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSystemStatusAction } from "@/app/erp/actions";
import { Button } from "@/components/ui/button";

export function SystemStatusButton({
  id,
  mode,
}: {
  id: string;
  mode: "archive" | "restore";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run(status: "active" | "archived") {
    startTransition(async () => {
      await updateSystemStatusAction(id, status);
      setConfirming(false);
      router.refresh();
    });
  }

  if (mode === "restore") {
    return (
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run("active")}>
        {pending ? "..." : "Restaurar"}
      </Button>
    );
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("archived")}>
          {pending ? "..." : "Confirmar"}
        </Button>
      </span>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      Arquivar
    </Button>
  );
}
