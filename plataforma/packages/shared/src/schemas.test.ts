import { describe, it, expect } from "vitest";
import {
  widgetMessageSchema,
  widgetTicketSchema,
  scopeSchema,
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
