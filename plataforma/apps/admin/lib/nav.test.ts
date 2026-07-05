import { describe, it, expect } from "vitest";
import { crumbsFor, isNavActive } from "./nav";

describe("isNavActive", () => {
  it("Projetos ativo em /erp e no detalhe de sistema, mas não em /erp/ia", () => {
    expect(isNavActive("/erp", "/erp")).toBe(true);
    expect(isNavActive("/erp", "/erp/systems/123")).toBe(true);
    expect(isNavActive("/erp", "/erp/ia")).toBe(false);
    expect(isNavActive("/erp", "/erp/admins")).toBe(false);
  });

  it("IA e Admins só ativam nas próprias rotas", () => {
    expect(isNavActive("/erp/ia", "/erp/ia")).toBe(true);
    expect(isNavActive("/erp/admins", "/erp/admins")).toBe(true);
    expect(isNavActive("/erp/ia", "/erp")).toBe(false);
  });

  it("Atendimento ativo na caixa e na conversa, não em notificações", () => {
    expect(isNavActive("/meu-atendimento", "/meu-atendimento")).toBe(true);
    expect(isNavActive("/meu-atendimento", "/meu-atendimento/chats/9")).toBe(true);
    expect(isNavActive("/meu-atendimento", "/meu-atendimento/notificacoes")).toBe(false);
  });

  it("Notificações e Métricas ativam nas próprias rotas", () => {
    expect(isNavActive("/meu-atendimento/notificacoes", "/meu-atendimento/notificacoes")).toBe(true);
    expect(isNavActive("/meu-atendimento/metricas", "/meu-atendimento/metricas")).toBe(true);
  });
});

describe("crumbsFor", () => {
  it("rotas de topo do ERP", () => {
    expect(crumbsFor("/erp").map((c) => c.label)).toEqual(["Projetos"]);
    expect(crumbsFor("/erp/ia").map((c) => c.label)).toEqual(["IA"]);
    expect(crumbsFor("/erp/admins").map((c) => c.label)).toEqual(["Admins"]);
  });

  it("detalhe e criação de sistema descem de Projetos", () => {
    expect(crumbsFor("/erp/systems/new").map((c) => c.label)).toEqual([
      "Projetos",
      "Novo sistema",
    ]);
    expect(crumbsFor("/erp/systems/abc").map((c) => c.label)).toEqual([
      "Projetos",
      "Sistema",
    ]);
    // o pai (Projetos) sempre aponta para /erp
    expect(crumbsFor("/erp/systems/abc")[0].href).toBe("/erp");
  });

  it("Atendimento e subáreas", () => {
    expect(crumbsFor("/meu-atendimento").map((c) => c.label)).toEqual([
      "Atendimento",
      "Caixa",
    ]);
    expect(crumbsFor("/meu-atendimento/chats/9").map((c) => c.label)).toEqual([
      "Atendimento",
      "Caixa",
      "Conversa",
    ]);
    expect(crumbsFor("/meu-atendimento/notificacoes").map((c) => c.label)).toEqual([
      "Atendimento",
      "Notificações",
    ]);
  });

  it("rota desconhecida não gera trilha", () => {
    expect(crumbsFor("/qualquer")).toEqual([]);
  });
});
