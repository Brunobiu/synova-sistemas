import { describe, it, expect } from "vitest";
import { decideEscalation, detectCritical, detectSensitive, maxPriority } from "./escalation";
import type { ChatResult } from "./types";

function result(over: Partial<ChatResult> = {}): ChatResult {
  return {
    answer: "ok",
    intent: "duvida",
    urgency: "media",
    confidence: 0.9,
    shouldEscalate: false,
    suggestedPriority: "media",
    ...over,
  };
}

describe("detecção de sinais", () => {
  it("detecta assuntos críticos", () => {
    expect(detectCritical("o sistema está fora do ar")).toBe(true);
    expect(detectCritical("erro no pagamento do boleto")).toBe(true);
    expect(detectCritical("perdi todos os dados")).toBe(true);
    expect(detectCritical("como emito uma nota?")).toBe(false);
  });

  it("detecta assuntos sensíveis", () => {
    expect(detectSensitive("quero cancelar meu contrato")).toBe(true);
    expect(detectSensitive("vou entrar com processo jurídico")).toBe(true);
    expect(detectSensitive("obrigado pela ajuda")).toBe(false);
  });

  it("maxPriority escolhe a maior", () => {
    expect(maxPriority("baixa", "alta")).toBe("alta");
    expect(maxPriority("critica", "media")).toBe("critica");
  });
});

describe("decideEscalation", () => {
  it("não escalona resposta confiante e trivial", () => {
    const d = decideEscalation(result(), { userMessage: "como emito uma nota?" });
    expect(d.escalate).toBe(false);
    expect(d.immediate).toBe(false);
  });

  it("escalona e marca crítico + prioridade crítica em assunto crítico", () => {
    const d = decideEscalation(result(), { userMessage: "o sistema caiu e ninguém acessa" });
    expect(d.escalate).toBe(true);
    expect(d.immediate).toBe(true);
    expect(d.priority).toBe("critica");
  });

  it("escalona por baixa confiança", () => {
    const d = decideEscalation(result({ confidence: 0.3 }), { userMessage: "dúvida simples" });
    expect(d.escalate).toBe(true);
    expect(d.reason).toContain("confiança");
  });

  it("escalona por assunto sensível", () => {
    const d = decideEscalation(result(), { userMessage: "quero cancelar tudo, isso é um absurdo" });
    expect(d.escalate).toBe(true);
  });

  it("respeita o shouldEscalate do modelo", () => {
    const d = decideEscalation(
      result({ shouldEscalate: true, escalationReason: "fora da base" }),
      { userMessage: "pergunta obscura" },
    );
    expect(d.escalate).toBe(true);
    expect(d.reason).toContain("fora da base");
  });
});
