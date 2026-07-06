import { describe, it, expect } from "vitest";
import {
  canAccessErp,
  canAccessSupport,
  canManageAdmins,
  homeFor,
  isRole,
} from "./roles";

describe("isRole", () => {
  it("aceita admin e agent, rejeita o resto", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("agent")).toBe(true);
    expect(isRole("owner")).toBe(false);
    expect(isRole("")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("permissões por papel", () => {
  it("admin (dono) tem acesso total", () => {
    expect(canAccessErp("admin")).toBe(true);
    expect(canManageAdmins("admin")).toBe(true);
    expect(canAccessSupport("admin")).toBe(true);
    expect(homeFor("admin")).toBe("/erp");
  });

  it("agent (atendente) só acessa o atendimento", () => {
    expect(canAccessErp("agent")).toBe(false);
    expect(canManageAdmins("agent")).toBe(false);
    expect(canAccessSupport("agent")).toBe(true);
    expect(homeFor("agent")).toBe("/meu-atendimento");
  });
});
