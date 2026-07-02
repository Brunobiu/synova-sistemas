"use client";

import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function onLogout() {
    try {
      await getBrowserSupabase().auth.signOut();
    } catch {
      // ignore
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={onLogout}>
      Sair
    </Button>
  );
}
