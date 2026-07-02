import { describe, it, expect } from "vitest";
import { apiOk, apiErr, httpStatusForCode, sanitizeError, safeMessage } from "./api";

describe("envelope de API", () => {
  it("apiOk embrulha os dados", () => {
    expect(apiOk({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
  });

  it("apiErr monta erro com e sem detalhes", () => {
    expect(apiErr("validation", "x")).toEqual({ ok: false, code: "validation", message: "x" });
    expect(apiErr("validation", "x", { field: "y" })).toEqual({
      ok: false,
      code: "validation",
      message: "x",
      details: { field: "y" },
    });
  });

  it("mapeia códigos para status HTTP", () => {
    expect(httpStatusForCode("unauthorized")).toBe(401);
    expect(httpStatusForCode("forbidden")).toBe(403);
    expect(httpStatusForCode("validation")).toBe(422);
    expect(httpStatusForCode("rate_limited")).toBe(429);
    expect(httpStatusForCode("not_found")).toBe(404);
    expect(httpStatusForCode("server_error")).toBe(500);
  });
});

describe("sanitizeError", () => {
  it("não vaza a mensagem original do erro", () => {
    const secret = new Error("connect ECONNREFUSED 10.0.0.5:5432 senha=xyz");
    const out = sanitizeError(secret);
    expect(out.code).toBe("server_error");
    expect(out.message).toBe(safeMessage("server_error"));
    expect(JSON.stringify(out)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(out)).not.toContain("senha");
  });

  it("respeita um código conhecido e seguro", () => {
    const out = sanitizeError(new Error("qualquer"), "not_found");
    expect(out).toEqual({ ok: false, code: "not_found", message: safeMessage("not_found") });
  });
});
