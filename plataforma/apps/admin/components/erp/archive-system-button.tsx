"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveSystemAction } from "@/app/erp/actions";
import { Button } from "@/components/ui/button";

export function ArchiveSystemButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onArchive() {
    startTransition(async () => {
      await archiveSystemAction(id);
      setConfirming(false);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
          Cancelar
        </Button>
        <Button size="sm" variant="destructive" onClick={onArchive} disabled={pending}>
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
