import { describe, it, expect } from "vitest";
import { buildContext } from "./context";
import type { KnowledgeMatch } from "./types";

const companyDoc: KnowledgeMatch = {
  docId: "doc-empresa",
  tenantId: "ten-1",
  content: "Cliente tem desconto de 20%.",
  similarity: 0.9,
};
const systemDoc: KnowledgeMatch = {
  docId: "doc-sistema",
  tenantId: null,
  content: "Desconto padrão é 10%.",
  similarity: 0.8,
};

describe("buildContext", () => {
  it("coloca a base da empresa antes da base do sistema (precedência)", () => {
    const { text } = buildContext({
      systemName: "ERP X",
      matches: [systemDoc, companyDoc],
    });
    const idxEmpresa = text.indexOf("Base da empresa");
    const idxSistema = text.indexOf("Base geral do sistema");
    expect(idxEmpresa).toBeGreaterThan(-1);
    expect(idxSistema).toBeGreaterThan(-1);
    expect(idxEmpresa).toBeLessThan(idxSistema);
    expect(text).toContain("prioridade sobre as regras gerais");
  });

  it("registra as fontes usadas", () => {
    const { sources } = buildContext({
      systemName: "ERP X",
      systemContext: "Sistema de emissão de notas.",
      matches: [companyDoc, systemDoc],
      recentHistory: [{ role: "user", content: "oi" }],
    });
    const kinds = sources.map((s) => s.kind);
    expect(kinds).toContain("system_context");
    expect(kinds).toContain("company_base");
    expect(kinds).toContain("system_base");
    expect(kinds).toContain("history");
  });

  it("cumprimenta usuário conhecido e sinaliza desconhecido", () => {
    const known = buildContext({ systemName: "S", userName: "Bruno", userProfile: { role: "gerente" } });
    expect(known.text).toContain("Bruno");
    expect(known.text).toContain("gerente");
    const unknown = buildContext({ systemName: "S" });
    expect(unknown.text.toLowerCase()).toContain("desconhecido");
  });
});
