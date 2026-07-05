import type { Priority } from "@synova/shared";

export const PRIORITY_RANK: Record<Priority, number> = {
  baixa: 0,
  media: 1,
  alta: 2,
  critica: 3,
};

/** Ordena críticos primeiro (R14) e, em empate, mais recentes primeiro. */
export function sortByPriorityThenRecent<T extends { priority: Priority; createdAt: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    return p !== 0 ? p : b.createdAt.localeCompare(a.createdAt);
  });
}
