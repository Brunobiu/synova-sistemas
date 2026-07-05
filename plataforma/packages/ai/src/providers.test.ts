import { describe, it, expect, vi, afterEach } from "vitest";
import { createAIProvider, buildInstruction } from "./providers";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createAIProvider (fábrica)", () => {
  it("cria o provedor certo por nome", () => {
    expect(createAIProvider({ provider: "openai", apiKey: "k" }).name).toBe("openai");
    expect(createAIProvider({ provider: "anthropic", apiKey: "k" }).name).toBe("anthropic");
    expect(createAIProvider({ provider: "google", apiKey: "k" }).name).toBe("google");
  });

  it("lança para provedor desconhecido", () => {
    // @ts-expect-error provedor inválido de propósito
    expect(() => createAIProvider({ provider: "meta", apiKey: "k" })).toThrow();
  });
});

describe("buildInstruction", () => {
  it("inclui o contrato JSON, o contexto e o nome", () => {
    const instr = buildInstruction({
      messages: [],
      context: "CONTEXTO-AQUI",
      userName: "Bruno",
    });
    expect(instr).toContain("JSON");
    expect(instr).toContain("CONTEXTO-AQUI");
    expect(instr).toContain("Bruno");
  });
});

describe("OpenAIProvider.chat", () => {
  it("faz o parse da saída JSON do modelo", async () => {
    const content = JSON.stringify({
      answer: "Olá!",
      intent: "saudacao",
      urgency: "baixa",
      confidence: 0.95,
      shouldEscalate: false,
      suggestedPriority: "baixa",
    });
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] }),
    })) as unknown as typeof fetch;

    const provider = createAIProvider({ provider: "openai", apiKey: "k" });
    const res = await provider.chat({ messages: [{ role: "user", content: "oi" }] });
    expect(res.answer).toBe("Olá!");
    expect(res.confidence).toBe(0.95);
  });

  it("lança quando a HTTP falha", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 401 })) as unknown as typeof fetch;
    const provider = createAIProvider({ provider: "openai", apiKey: "k" });
    await expect(provider.chat({ messages: [] })).rejects.toThrow();
  });
});

describe("AnthropicProvider.embed", () => {
  it("não suporta embeddings", async () => {
    const provider = createAIProvider({ provider: "anthropic", apiKey: "k" });
    await expect(provider.embed(["x"])).rejects.toThrow(/embeddings/i);
  });
});
