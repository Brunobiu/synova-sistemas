// Teste de carga simples do handshake do widget (POST /api/widget/session).
// Ferramenta manual (não roda no CI) — precisa de um servidor no ar, uma chave
// pública válida (pk_...) e a origem na allowlist do sistema.
//
// Uso:
//   BASE=http://localhost:3000 KEY=pk_xxx ORIGIN=http://localhost:3000 \
//     REQS=200 CONC=20 node scripts/load-test.mjs

const BASE = process.env.BASE ?? "http://localhost:3000";
const KEY = process.env.KEY;
const ORIGIN = process.env.ORIGIN ?? BASE;
const REQS = Number(process.env.REQS ?? 200);
const CONC = Number(process.env.CONC ?? 20);

if (!KEY) {
  console.error("Defina KEY=pk_... (chave pública de um sistema).");
  process.exit(1);
}

let done = 0;
let ok = 0;
let failed = 0;
const latencies = [];

async function oneRequest() {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}/api/widget/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Synova-Key": KEY, Origin: ORIGIN },
      body: JSON.stringify({}),
    });
    if (res.ok) ok += 1;
    else failed += 1;
  } catch {
    failed += 1;
  } finally {
    latencies.push(performance.now() - start);
    done += 1;
  }
}

async function worker() {
  while (done < REQS) await oneRequest();
}

const startAll = performance.now();
await Promise.all(Array.from({ length: CONC }, () => worker()));
const elapsed = (performance.now() - startAll) / 1000;

latencies.sort((a, b) => a - b);
const p = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))] ?? 0;

console.log(`Requisições: ${done} (ok=${ok}, falhas=${failed})`);
console.log(`Tempo total: ${elapsed.toFixed(2)}s  |  Throughput: ${(done / elapsed).toFixed(1)} req/s`);
console.log(`Latência p50=${p(0.5).toFixed(0)}ms  p95=${p(0.95).toFixed(0)}ms  p99=${p(0.99).toFixed(0)}ms`);
