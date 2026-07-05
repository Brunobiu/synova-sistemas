import { describe, it, expect } from "vitest";
import { OfflineQueue } from "./queue";

describe("OfflineQueue", () => {
  it("enfileira e informa o tamanho", () => {
    const q = new OfflineQueue<number>();
    q.enqueue(1);
    q.enqueue(2);
    expect(q.size()).toBe(2);
    expect(q.peek()).toBe(1);
  });

  it("esvazia em ordem quando o envio funciona", async () => {
    const q = new OfflineQueue<number>();
    [1, 2, 3].forEach((n) => q.enqueue(n));
    const sent: number[] = [];
    const count = await q.flush(async (n) => {
      sent.push(n);
    });
    expect(count).toBe(3);
    expect(sent).toEqual([1, 2, 3]);
    expect(q.size()).toBe(0);
  });

  it("para no primeiro erro e mantém os restantes", async () => {
    const q = new OfflineQueue<number>();
    [1, 2, 3].forEach((n) => q.enqueue(n));
    const sent: number[] = [];
    const count = await q.flush(async (n) => {
      if (n === 2) throw new Error("offline");
      sent.push(n);
    });
    expect(count).toBe(1);
    expect(sent).toEqual([1]);
    expect(q.size()).toBe(2); // 2 e 3 permanecem
    expect(q.peek()).toBe(2);
  });
});
