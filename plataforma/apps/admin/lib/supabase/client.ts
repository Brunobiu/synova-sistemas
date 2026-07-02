"use client";

import { createSupabaseBrowserClient } from "@synova/database";

/** Cliente Supabase para Client Components do painel. */
export function getBrowserSupabase() {
  return createSupabaseBrowserClient();
}
