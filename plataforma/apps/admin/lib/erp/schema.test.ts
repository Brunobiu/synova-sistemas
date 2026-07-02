import { describe, it, expect } from "vitest";
import { systemFormSchema } from "./schema";

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
