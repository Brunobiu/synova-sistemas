// Garante o usuário admin no Supabase (Auth + tabela profiles).
// Lê do ambiente: SUPABASE_URL, ANON_KEY, SERVICE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD.
// Não imprime senha nem tokens.

const URL = process.env.SUPABASE_URL;
const ANON = process.env.ANON_KEY;
const SVC = process.env.SERVICE_KEY;
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!URL || !ANON || !SVC) {
  console.error("Faltam URL/ANON/SERVICE no ambiente.");
  process.exit(1);
}
if (!EMAIL || !PASSWORD) {
  console.error("Faltam ADMIN_EMAIL/ADMIN_PASSWORD (verifique o Anotações).");
  process.exit(1);
}

async function login() {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json().catch(() => ({}));
  return {
    ok: r.ok,
    id: j?.user?.id,
    token: j?.access_token,
    err: j?.error_description || j?.msg || j?.error_code || j?.error,
  };
}

async function createUser() {
  const r = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  });
  const j = await r.json().catch(() => ({}));
  return {
    ok: r.ok,
    id: j?.id || j?.user?.id,
    err: j?.msg || j?.error_description || j?.error || JSON.stringify(j).slice(0, 160),
  };
}

async function upsertProfile(id) {
  const r = await fetch(`${URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({ id, email: EMAIL, role: "admin" }),
  });
  const j = await r.json().catch(() => null);
  return { status: r.status, body: j };
}

(async () => {
  console.log("email:", EMAIL);

  let l = await login();
  let id = l.id;

  if (l.ok && id) {
    console.log("login inicial: OK (usuario ja existia)");
  } else {
    console.log("login inicial falhou (" + (l.err || "?") + ") -> criando usuario...");
    const c = await createUser();
    if (!c.ok || !c.id) {
      console.log("FALHA ao criar usuario:", c.err);
      process.exit(1);
    }
    id = c.id;
    console.log("usuario criado: OK");
  }

  const p = await upsertProfile(id);
  console.log("profile (upsert) status:", p.status, "->", JSON.stringify(p.body));

  const l2 = await login();
  console.log(
    "login final:",
    l2.ok && l2.token ? "SIM (token recebido)" : "NAO (" + (l2.err || "?") + ")",
  );
  console.log("uid:", id);
})();
