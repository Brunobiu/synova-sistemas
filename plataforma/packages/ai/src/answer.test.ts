import { describe, it, expect } from "vitest";
import { answerMessage } from "./answer";
import type { AIProvider, ChatInput, ChatResult } from "./types";

function fakeProvider(result: ChatResult | (() => Promise<ChatResult>)): AIProvider {
  return {
    name: "openai",
    chat: typeof result === "function" ? result : async () => result,
    embed: async () => [],
  };
}

const okResult: ChatResult = {
  answer: "Aqui está a resposta.",
  intent: "duvida",
  urgency: "baixa",
  confidence: 0.9,
  shouldEscalate: false,
  suggestedPriority: "baixa",
};

const baseParams = (provider: AIProvider | null) => ({
  provider,
  messages: [{ role: "user" as const, content: "como emito nota?" }],
  userMessage: "como emito nota?",
});

describe("answerMessage — degradação graciosa", () => {
  it("sem provedor ativo, encaminha para humano", async () => {
    const out = await answerMessage(baseParams(null));
    expect(out.aiAvailable).toBe(false);
    expect(out.escalation.escalate).toBe(true);
    expect(out.answer).toMatch(/humano|atendente/i);
  });

  it("quando o provedor lança erro, encaminha para humano", async () => {
    const throwing = fakeProvider(async () => {
      throw new Error("boom");
    });
    const out = await answerMessage(baseParams(throwing));
    expect(out.errored).toBe(true);
    expect(out.escalation.escalate).toBe(true);
  });

  it("quando o provedor estoura o tempo, encaminha para humano", async () => {
    const slow = fakeProvider(
      () => new Promise<ChatResult>((resolve) => setTimeout(() => resolve(okResult), 50)),
    );
    const out = await answerMessage({ ...baseParams(slow), timeoutMs: 5 });
    expect(out.errored).toBe(true);
    expect(out.escalation.escalate).toBe(true);
  });

  it("resposta boa não escalona", async () => {
    const out = await answerMessage(baseParams(fakeProvider(okResult)));
    expect(out.aiAvailable).toBe(true);
    expect(out.errored).toBe(false);
    expect(out.escalation.escalate).toBe(false);
    expect(out.answer).toBe("Aqui está a resposta.");
  });

  it("assunto crítico escalona mesmo com IA confiante", async () => {
    const out = await answerMessage({
      ...baseParams(fakeProvider(okResult)),
      userMessage: "o sistema está fora do ar",
    });
    expect(out.escalation.escalate).toBe(true);
    expect(out.escalation.priority).toBe("critica");
  });
});

// Garante que o input chega ao provedor com contexto/nome
describe("answerMessage — repasse de input", () => {
  it("passa contexto e nome para o provedor", async () => {
    let received: ChatInput | null = null;
    const spy: AIProvider = {
      name: "openai",
      chat: async (input) => {
        received = input;
        return okResult;
      },
      embed: async () => [],
    };
    await answerMessage({
      provider: spy,
      messages: [{ role: "user", content: "oi" }],
      context: "CTX",
      userName: "Bruno",
    });
    expect(received).not.toBeNull();
    expect(received!.context).toBe("CTX");
    expect(received!.userName).toBe("Bruno");
  });
});
