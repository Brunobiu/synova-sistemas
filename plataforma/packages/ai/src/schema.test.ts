import { describe, it, expect } from "vitest";
import { parseChatResult, extractJson, chatResultSchema } from "./schema";

describe("extractJson", () => {
  it("extrai JSON puro", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("extrai JSON cercado por texto/markdown", () => {
    expect(extractJson('Claro!\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it("retorna null quando não há JSON", () => {
    expect(extractJson("sem json aqui")).toBeNull();
  });
});

describe("parseChatResult", () => {
  it("valida uma saída bem formada", () => {
    const r = parseChatResult(
      JSON.stringify({
        answer: "Olá Bruno!",
        intent: "saudacao",
        urgency: "baixa",
        confidence: 0.9,
        shouldEscalate: false,
        suggestedPriority: "baixa",
      }),
    );
    expect(r.answer).toBe("Olá Bruno!");
    expect(r.urgency).toBe("baixa");
    expect(r.confidence).toBe(0.9);
  });

  it("degrada com baixa confiança quando a saída não é JSON", () => {
    const r = parseChatResult("texto solto sem json");
    expect(r.shouldEscalate).toBe(true);
    expect(r.confidence).toBeLessThan(0.5);
    expect(r.answer).toContain("texto solto");
  });

  it("aplica defaults para campos ausentes", () => {
    const r = parseChatResult('{"answer":"ok"}');
    expect(r.intent).toBe("desconhecido");
    expect(r.urgency).toBe("media");
    expect(r.suggestedPriority).toBe("media");
  });

  it("aceita campos null (ex.: escalationReason) sem degradar", () => {
    // Caso real do Gemini: manda escalationReason: null quando não escala.
    const r = parseChatResult(
      JSON.stringify({
        answer: "Olá! Como posso ajudar você hoje?",
        intent: "greeting",
        urgency: "baixa",
        confidence: 1,
        shouldEscalate: false,
        escalationReason: null,
        suggestedPriority: "baixa",
      }),
    );
    expect(r.answer).toBe("Olá! Como posso ajudar você hoje?");
    expect(r.shouldEscalate).toBe(false);
    expect(r.confidence).toBe(1);
  });

  it("schema rejeita urgência inválida", () => {
    expect(chatResultSchema.safeParse({ answer: "x", urgency: "urgentíssimo" }).success).toBe(
      false,
    );
  });
});
