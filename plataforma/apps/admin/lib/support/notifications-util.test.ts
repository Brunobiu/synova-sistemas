import { describe, it, expect } from "vitest";
import { unreadCount, groupBySystem, type NotificationView } from "./notifications-util";

function note(over: Partial<NotificationView>): NotificationView {
  return {
    id: Math.random().toString(36),
    systemId: "s1",
    systemName: "Sistema A",
    type: "new_ticket",
    priority: "media",
    title: "t",
    body: null,
    status: "unread",
    entityType: null,
    entityId: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("unreadCount", () => {
  it("conta apenas as não lidas", () => {
    const notes = [note({ status: "unread" }), note({ status: "read" }), note({ status: "unread" }), note({ status: "resolved" })];
    expect(unreadCount(notes)).toBe(2);
  });
});

describe("groupBySystem", () => {
  it("agrupa por sistema preservando a ordem de chegada", () => {
    const notes = [
      note({ systemName: "A" }),
      note({ systemName: "B" }),
      note({ systemName: "A" }),
    ];
    const groups = groupBySystem(notes);
    expect(groups.map((g) => g.systemName)).toEqual(["A", "B"]);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });

  it("retorna vazio para lista vazia", () => {
    expect(groupBySystem([])).toEqual([]);
  });
});
