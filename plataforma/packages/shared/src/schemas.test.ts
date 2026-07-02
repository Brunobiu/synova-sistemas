import { describe, it, expect } from "vitest";
import {
  widgetMessageSchema,
  widgetTicketSchema,
  scopeSchema,
  widgetHistoryQuerySchema,
  widgetMessageResultSchema,
} from "./schemas";

describe("widgetMessageSchema", () => {
  it("aceita mensagem válida", () => {
    expect(
      widgetMessageSchema.safeParse({ content: "Como emito nota?" }).success,
    ).toBe(true);
  });

  it("rejeita conteúdo vazio", () => {
    expect(widgetMessageSchema.safeParse({ content: "" }).success).toBe(false);
  });

  it("rejeita conteúdo grande demais", () => {
    expect(
      widgetMessageSchema.safeParse({ content: "x".repeat(5000) }).success,
    ).toBe(false);
  });
});

describe("widgetTicketSchema", () => {
  it("aceita ticket válido", () => {
    expect(
      widgetTicketSchema.safeParse({
        category: "bug",
        subject: "Erro ao emitir nota",
        description: "Detalhes do problema",
      }).success,
    ).toBe(true);
  });

  it("rejeita assunto curto", () => {
    expect(
      widgetTicketSchema.safeParse({
        category: "bug",
        subject: "ab",
        description: "d",
      }).success,
    ).toBe(false);
  });
});

describe("scopeSchema", () => {
  it("rejeita ids que não são uuid", () => {
    expect(scopeSchema.safeParse({ systemId: "x", tenantId: "y" }).success).toBe(
      false,
    );
  });

  it("aceita uuids válidos", () => {
    expect(
      scopeSchema.safeParse({
        systemId: "550e8400-e29b-41d4-a716-446655440000",
        tenantId: "123e4567-e89b-42d3-a456-556642440000",
      }).success,
    ).toBe(true);
  });
});

describe("widgetHistoryQuerySchema", () => {
  it("aplica limite padrão de 30 e faz coerção de string", () => {
    const r = widgetHistoryQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(30);
    const r2 = widgetHistoryQuerySchema.safeParse({ limit: "50" });
    expect(r2.success).toBe(true);
    if (r2.success) expect(r2.data.limit).toBe(50);
  });

  it("rejeita limite fora do intervalo", () => {
    expect(widgetHistoryQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(widgetHistoryQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
  });
});

describe("widgetMessageResultSchema", () => {
  it("valida resultado com escalonamento", () => {
    expect(
      widgetMessageResultSchema.safeParse({
        messageId: "550e8400-e29b-41d4-a716-446655440000",
        escalated: true,
        ticketId: "123e4567-e89b-42d3-a456-556642440000",
      }).success,
    ).toBe(true);
  });

  it("rejeita sem o campo escalated", () => {
    expect(
      widgetMessageResultSchema.safeParse({
        messageId: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(false);
  });
});
