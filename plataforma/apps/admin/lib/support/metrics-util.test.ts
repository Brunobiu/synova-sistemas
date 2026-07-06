import { describe, it, expect } from "vitest";
import { computeMetrics, computeResponseTimes } from "./metrics-util";

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

describe("computeResponseTimes", () => {
  it("mede resposta da IA e do atendente pela mensagem seguinte no mesmo chat", () => {
    const rt = computeResponseTimes([
      { chatId: "c1", senderType: "user", createdAt: "2026-01-01T10:00:00.000Z" },
      { chatId: "c1", senderType: "ai", createdAt: "2026-01-01T10:00:30.000Z" },
      { chatId: "c1", senderType: "user", createdAt: "2026-01-01T10:05:00.000Z" },
      { chatId: "c1", senderType: "admin", createdAt: "2026-01-01T10:07:00.000Z" },
    ]);
    expect(rt.avgAiResponseSeconds).toBe(30);
    expect(rt.aiResponseSamples).toBe(1);
    expect(rt.avgHumanResponseSeconds).toBe(120);
    expect(rt.humanResponseSamples).toBe(1);
  });

  it("ordena por tempo e usa a última fala do cliente antes da resposta", () => {
    const rt = computeResponseTimes([
      { chatId: "c1", senderType: "ai", createdAt: "2026-01-01T10:00:40.000Z" },
      { chatId: "c1", senderType: "user", createdAt: "2026-01-01T10:00:00.000Z" },
      { chatId: "c1", senderType: "user", createdAt: "2026-01-01T10:00:30.000Z" },
    ]);
    // pareia user(10:00:30) -> ai(10:00:40) = 10s; a fala anterior do cliente é ignorada
    expect(rt.avgAiResponseSeconds).toBe(10);
    expect(rt.aiResponseSamples).toBe(1);
  });

  it("faz média entre chats diferentes", () => {
    const rt = computeResponseTimes([
      { chatId: "c1", senderType: "user", createdAt: "2026-01-01T10:00:00.000Z" },
      { chatId: "c1", senderType: "ai", createdAt: "2026-01-01T10:00:20.000Z" }, // 20s
      { chatId: "c2", senderType: "user", createdAt: "2026-01-01T10:00:00.000Z" },
      { chatId: "c2", senderType: "ai", createdAt: "2026-01-01T10:00:40.000Z" }, // 40s
    ]);
    expect(rt.avgAiResponseSeconds).toBe(30); // (20+40)/2
    expect(rt.aiResponseSamples).toBe(2);
  });

  it("retorna null sem amostras", () => {
    const rt = computeResponseTimes([]);
    expect(rt.avgAiResponseSeconds).toBeNull();
    expect(rt.avgHumanResponseSeconds).toBeNull();
    expect(rt.aiResponseSamples).toBe(0);
    expect(rt.humanResponseSamples).toBe(0);
  });

  it("computeMetrics inclui os tempos de resposta", () => {
    const m = computeMetrics({
      tickets: [],
      chats: [{ id: "c1", status: "ai_active" }],
      systemNames: {},
      messages: [
        { chatId: "c1", senderType: "user", createdAt: "2026-01-01T10:00:00.000Z" },
        { chatId: "c1", senderType: "ai", createdAt: "2026-01-01T10:00:15.000Z" },
      ],
    });
    expect(m.avgAiResponseSeconds).toBe(15);
    expect(m.avgHumanResponseSeconds).toBeNull();
  });
});
