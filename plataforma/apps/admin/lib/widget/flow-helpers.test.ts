import { describe, it, expect } from "vitest";
import {
  shouldAIRespond,
  notificationTypeForEscalation,
  deriveSubject,
  historyToMessages,
} from "./flow-helpers";

describe("shouldAIRespond", () => {
  it("responde quando o chat está com IA ativa e não pausada", () => {
    expect(shouldAIRespond({ status: "ai_active", ai_paused: false })).toBe(true);
  });
  it("não responde quando humano assumiu ou IA está pausada", () => {
    expect(shouldAIRespond({ status: "human_active", ai_paused: false })).toBe(false);
    expect(shouldAIRespond({ status: "ai_active", ai_paused: true })).toBe(false);
    expect(shouldAIRespond({ status: "closed", ai_paused: false })).toBe(false);
  });
});

describe("notificationTypeForEscalation", () => {
  it("usa critical_ticket quando imediato, ai_escalation caso contrário", () => {
    expect(notificationTypeForEscalation(true)).toBe("critical_ticket");
    expect(notificationTypeForEscalation(false)).toBe("ai_escalation");
  });
});

describe("deriveSubject", () => {
  it("mantém mensagens curtas", () => {
    expect(deriveSubject("  Não consigo   emitir nota  ")).toBe("Não consigo emitir nota");
  });
  it("trunca mensagens longas com reticências", () => {
    const long = "a".repeat(200);
    const subject = deriveSubject(long);
    expect(subject.length).toBe(80);
    expect(subject.endsWith("...")).toBe(true);
  });
});

describe("historyToMessages", () => {
  it("mapeia papéis e descarta mensagens de sistema", () => {
    const msgs = historyToMessages([
      { role: "user", content: "oi" },
      { role: "assistant", content: "olá" },
      { role: "admin", content: "sou humano" },
      { role: "system", content: "evento interno" },
    ]);
    expect(msgs).toEqual([
      { role: "user", content: "oi" },
      { role: "assistant", content: "olá" },
      { role: "assistant", content: "sou humano" },
    ]);
  });
});
