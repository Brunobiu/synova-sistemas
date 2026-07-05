"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Atualização quase em tempo real por polling (revalida a rota a cada intervalo). */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
