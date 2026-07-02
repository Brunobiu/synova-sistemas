import { describe, it, expect } from "vitest";
import { applyScope, assertScope } from "./access";

function mockQuery() {
  const calls: Array<[string, unknown]> = [];
  const q = {
    calls,
    eq(column: string, value: unknown) {
      calls.push([column, value]);
      return q;
    },
  };
  return q;
}

describe("assertScope", () => {
  it("lança quando falta system_id", () => {
    expect(() => assertScope(null)).toThrow();
    expect(() => assertScope({})).toThrow();
    expect(() => assertScope({ systemId: "" })).toThrow();
  });

  it("passa com system_id", () => {
    expect(() => assertScope({ systemId: "sys-1" })).not.toThrow();
  });
});

describe("applyScope", () => {
  it("filtra por system_id e tenant_id", () => {
    const q = mockQuery();
    applyScope(q, { systemId: "sys-1", tenantId: "ten-1" });
    expect(q.calls).toEqual([
      ["system_id", "sys-1"],
      ["tenant_id", "ten-1"],
    ]);
  });

  it("filtra só por system_id quando não há tenant", () => {
    const q = mockQuery();
    applyScope(q, { systemId: "sys-1" });
    expect(q.calls).toEqual([["system_id", "sys-1"]]);
  });

  it("lança (sem tocar na query) quando o escopo é inválido", () => {
    const q = mockQuery();
    expect(() => applyScope(q, { systemId: "" })).toThrow();
    expect(q.calls).toEqual([]);
  });
});
