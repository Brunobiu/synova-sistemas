import { describe, it, expect } from "vitest";
import {
  systemFormSchema,
  userFormSchema,
  clientContactSchema,
  systemContextSchema,
} from "./schema";

describe("systemFormSchema", () => {
  it("aceita entradas válidas", () => {
    expect(
      systemFormSchema.safeParse({
        name: "SaaS Barbearia",
        isOwn: true,
        imageUrl: "",
        status: "active",
      }).success,
    ).toBe(true);
    expect(
      systemFormSchema.safeParse({
        name: "Distribuidora Souza",
        isOwn: false,
        imageUrl: "https://exemplo.com/logo.png",
        status: "inactive",
      }).success,
    ).toBe(true);
  });

  it("rejeita nome curto", () => {
    expect(
      systemFormSchema.safeParse({ name: "a", isOwn: false, status: "active" }).success,
    ).toBe(false);
  });

  it("rejeita URL de imagem inválida", () => {
    expect(
      systemFormSchema.safeParse({
        name: "Nome válido",
        isOwn: false,
        imageUrl: "nao-e-url",
        status: "active",
      }).success,
    ).toBe(false);
  });

  it("rejeita status fora do enum", () => {
    expect(
      systemFormSchema.safeParse({ name: "Nome válido", isOwn: false, status: "xpto" }).success,
    ).toBe(false);
  });
});

describe("userFormSchema", () => {
  it("aceita usuário válido (completo e só com nome)", () => {
    expect(
      userFormSchema.safeParse({
        externalRef: "9",
        name: "Matheus",
        email: "m@exemplo.com",
        role: "gerente",
        sector: "vendas",
      }).success,
    ).toBe(true);
    expect(userFormSchema.safeParse({ name: "Só o nome" }).success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    expect(userFormSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    expect(userFormSchema.safeParse({ name: "X", email: "nao-email" }).success).toBe(false);
  });
});

describe("clientContactSchema", () => {
  it("aceita vazio e preenchido", () => {
    expect(clientContactSchema.safeParse({}).success).toBe(true);
    expect(
      clientContactSchema.safeParse({ contactName: "Gustavo", contactPhone: "62 99999-9999" })
        .success,
    ).toBe(true);
  });
});

describe("systemContextSchema", () => {
  it("aceita contexto e notas", () => {
    expect(
      systemContextSchema.safeParse({ context: "Faz emissão de nota e relatórios.", notes: "obs" })
        .success,
    ).toBe(true);
  });
});
