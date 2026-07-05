import { describe, it, expect } from "vitest";
import { computeMetrics } from "./metrics-util";

describe("computeMetrics", () => {
  it("agrega tickets por status/prioridade/sistema", () => {
    const m = computeMetrics({
      tickets: [
        { priority: "critica", status: "escalated", systemId: "s1", chatId: "c1" },
        { priority: "media", status: "resolved", systemId: "s1", chatId: "c2" },
        { priority: "alta", status: "open", systemId: "s2", chatId: null },
      ],
      chats: [
        { id: "c1", status: "human_active" },
        { id: "c2", status: "closed" },
        { id: "c3", status: "ai_active" },
      ],
      systemNames: { s1: "Sistema A", s2: "Sistema B" },
    });

    expect(m.totalTickets).toBe(3);
    expect(m.openTickets).toBe(2); // escalated + open
    expect(m.resolvedTickets).toBe(1);
    expect(m.criticalOpen).toBe(1);
    expect(m.ticketsByPriority.critica).toBe(1);
    expect(m.ticketsByPriority.alta).toBe(1);
    expect(m.ticketsBySystem[0]).toEqual({ systemName: "Sistema A", count: 2 });
  });

  it("calcula escalonamento e resolução automática por conversa", () => {
    const m = computeMetrics({
      tickets: [
        { priority: "alta", status: "escalated", systemId: "s1", chatId: "c1" },
        { priority: "media", status: "open", systemId: "s1", chatId: "c2" },
      ],
      chats: [
        { id: "c1", status: "human_active" },
        { id: "c2", status: "human_active" },
        { id: "c3", status: "ai_active" },
        { id: "c4", status: "closed" },
      ],
      systemNames: {},
    });
    // 2 de 4 conversas escalaram
    expect(m.escalatedChats).toBe(2);
    expect(m.escalationRate).toBe(50);
    expect(m.autoResolutionRate).toBe(50);
  });

  it("não divide por zero sem conversas", () => {
    const m = computeMetrics({ tickets: [], chats: [], systemNames: {} });
    expect(m.escalationRate).toBe(0);
    expect(m.autoResolutionRate).toBe(0);
    expect(m.totalTickets).toBe(0);
  });
});
