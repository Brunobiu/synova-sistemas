import { describe, it, expect } from "vitest";
import { sortByPriorityThenRecent } from "./sort";

describe("sortByPriorityThenRecent", () => {
  it("coloca críticos no topo e ordena por recência no empate", () => {
    const rows = [
      { id: "a", priority: "media" as const, createdAt: "2026-01-01T00:00:00Z" },
      { id: "b", priority: "critica" as const, createdAt: "2026-01-01T00:00:00Z" },
      { id: "c", priority: "critica" as const, createdAt: "2026-02-01T00:00:00Z" },
      { id: "d", priority: "baixa" as const, createdAt: "2026-03-01T00:00:00Z" },
    ];
    const sorted = sortByPriorityThenRecent(rows).map((r) => r.id);
    // críticas primeiro (c mais recente que b), depois media, depois baixa
    expect(sorted).toEqual(["c", "b", "a", "d"]);
  });

  it("não muta o array original", () => {
    const rows = [
      { priority: "baixa" as const, createdAt: "2026-01-01T00:00:00Z" },
      { priority: "critica" as const, createdAt: "2026-01-01T00:00:00Z" },
    ];
    const copy = [...rows];
    sortByPriorityThenRecent(rows);
    expect(rows).toEqual(copy);
  });
});
