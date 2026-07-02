import { describe, it, expect } from "vitest";
import {
  systemFormSchema,
  userFormSchema,
  clientContactSchema,
  systemContextSchema,
  knowledgeDocSchema,
  aiProviderSchema,
  allowedOriginsSchema,
  isValidOrigin,
  parseOrigins,
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

describe("knowledgeDocSchema", () => {
  it("aceita documento válido", () => {
    expect(
      knowledgeDocSchema.safeParse({
        kind: "operational",
        scope: "system",
        title: "Como emitir nota",
        content: "Passo 1... Passo 2...",
      }).success,
    ).toBe(true);
  });

  it("aceita escopo do cliente", () => {
    expect(
      knowledgeDocSchema.safeParse({
        kind: "commercial",
        scope: "tenant",
        title: "Tabela de preços",
        content: "Plano A, Plano B",
      }).success,
    ).toBe(true);
  });

  it("rejeita tipo/escopo fora do enum", () => {
    expect(
      knowledgeDocSchema.safeParse({ kind: "xpto", scope: "system", title: "Ok", content: "c" })
        .success,
    ).toBe(false);
    expect(
      knowledgeDocSchema.safeParse({ kind: "technical", scope: "global", title: "Ok", content: "c" })
        .success,
    ).toBe(false);
  });

  it("rejeita título curto e conteúdo vazio", () => {
    expect(
      knowledgeDocSchema.safeParse({ kind: "custom", scope: "system", title: "a", content: "x" })
        .success,
    ).toBe(false);
    expect(
      knowledgeDocSchema.safeParse({ kind: "custom", scope: "system", title: "Título", content: "" })
        .success,
    ).toBe(false);
  });
});

describe("aiProviderSchema", () => {
  it("aceita config com chave", () => {
    expect(
      aiProviderSchema.safeParse({
        provider: "openai",
        apiKey: "sk-abcdef123456",
        chatModel: "gpt-4o-mini",
        embeddingsModel: "text-embedding-3-small",
      }).success,
    ).toBe(true);
  });

  it("aceita chave vazia (manter a atual no update)", () => {
    expect(
      aiProviderSchema.safeParse({ provider: "anthropic", apiKey: "", chatModel: "" }).success,
    ).toBe(true);
  });

  it("rejeita chave muito curta e provedor inválido", () => {
    expect(aiProviderSchema.safeParse({ provider: "google", apiKey: "curta" }).success).toBe(false);
    expect(aiProviderSchema.safeParse({ provider: "meta", apiKey: "" }).success).toBe(false);
  });
});

describe("allowedOriginsSchema / isValidOrigin / parseOrigins", () => {
  it("valida origens corretas", () => {
    expect(isValidOrigin("https://app.cliente.com")).toBe(true);
    expect(isValidOrigin("http://localhost:3000")).toBe(true);
    expect(isValidOrigin("*")).toBe(true);
  });

  it("rejeita origens inválidas (com caminho ou sem esquema)", () => {
    expect(isValidOrigin("cliente.com")).toBe(false);
    expect(isValidOrigin("https://cliente.com/widget")).toBe(false);
    expect(isValidOrigin("ftp://cliente.com")).toBe(false);
  });

  it("parseOrigins quebra por linha/vírgula e remove duplicatas", () => {
    expect(parseOrigins("https://a.com\nhttps://b.com, https://a.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
    expect(parseOrigins("  ")).toEqual([]);
  });

  it("schema aceita lista válida e rejeita inválida", () => {
    expect(allowedOriginsSchema.safeParse({ origins: ["https://a.com", "*"] }).success).toBe(true);
    expect(allowedOriginsSchema.safeParse({ origins: ["a.com"] }).success).toBe(false);
  });
});
