import { describe, it, expect } from "vitest";
import { buildConfig } from "./config";

describe("buildConfig", () => {
  it("usa a chave e aplica defaults", () => {
    const c = buildConfig({ synovaKey: "pk_abc" }, "https://plat.example.com");
    expect(c.apiKey).toBe("pk_abc");
    expect(c.apiBase).toBe("https://plat.example.com");
    expect(c.title).toBe("Suporte");
    expect(c.color).toBe("#4f46e5");
  });

  it("respeita api-base, título e cor customizados e remove barra final", () => {
    const c = buildConfig(
      { synovaKey: "pk", apiBase: "https://api.x.com/", title: "Ajuda", color: "#f00" },
      "https://fallback",
    );
    expect(c.apiBase).toBe("https://api.x.com");
    expect(c.title).toBe("Ajuda");
    expect(c.color).toBe("#f00");
  });

  it("exige a chave", () => {
    expect(() => buildConfig({ synovaKey: "" }, "https://x")).toThrow();
    expect(() => buildConfig({}, "https://x")).toThrow();
  });
});
