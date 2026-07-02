import { describe, it, expect } from "vitest";
import { RateLimiter } from "./rate-limit";

describe("RateLimiter (janela fixa)", () => {
  it("permite até o limite e bloqueia o excedente", () => {
    const rl = new RateLimiter(() => 1_000);
    const opts = { limit: 3, windowMs: 60_000 };
    expect(rl.check("k", opts).allowed).toBe(true); // 1
    expect(rl.check("k", opts).allowed).toBe(true); // 2
    const third = rl.check("k", opts); // 3
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    const fourth = rl.check("k", opts); // 4 → bloqueia
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("reinicia a contagem quando a janela passa", () => {
    let now = 1_000;
    const rl = new RateLimiter(() => now);
    const opts = { limit: 1, windowMs: 10_000 };
    expect(rl.check("k", opts).allowed).toBe(true);
    expect(rl.check("k", opts).allowed).toBe(false);
    now += 10_001; // avança além da janela
    expect(rl.check("k", opts).allowed).toBe(true);
  });

  it("isola contagens por chave", () => {
    const rl = new RateLimiter(() => 1_000);
    const opts = { limit: 1, windowMs: 60_000 };
    expect(rl.check("a", opts).allowed).toBe(true);
    expect(rl.check("b", opts).allowed).toBe(true);
    expect(rl.check("a", opts).allowed).toBe(false);
  });

  it("sweep remove buckets expirados", () => {
    let now = 1_000;
    const rl = new RateLimiter(() => now);
    rl.check("k", { limit: 5, windowMs: 1_000 });
    now += 2_000;
    rl.sweep();
    // após limpar, a chave começa do zero de novo
    expect(rl.check("k", { limit: 1, windowMs: 1_000 }).remaining).toBe(0);
  });
});
