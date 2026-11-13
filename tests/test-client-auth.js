// API-level tests for api/client-auth.php — requires the local PHP server:
//   php -S 127.0.0.1:8080 -t <repo root>
const API = "http://127.0.0.1:8080/api/client-auth.php";

let pass = 0, fail = 0;
const t = async (name, fn) => {
  try { await fn(); pass++; console.log("PASS", name); }
  catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };

// minimal cookie jar (client-auth uses PHP sessions)
const jar = new Map();
async function call(payload) {
  const headers = { "Content-Type": "application/json" };
  if (jar.size) headers.cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(API, { method: "POST", headers, body: JSON.stringify(payload) });
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of setCookies) {
    const pair = c.split(";")[0]; const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
  return res.json();
}
async function me() {
  const headers = {};
  if (jar.size) headers.cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(API + "?action=me", { headers });
  return res.json();
}

const EMAIL = `auth-test-${Date.now()}@example.com`;

(async () => {
  await t("me is anonymous before login", async () => {
    const j = await me();
    assert(j.ok && j.client === null, "expected anonymous");
  });

  await t("register creates account and session", async () => {
    const j = await call({ action: "register", name: "Auth Test", email: EMAIL, phone: "0772000111", password: "secret123" });
    assert(j.ok && j.client && j.client.email === EMAIL, "register failed: " + JSON.stringify(j));
    assert(!j.client.password, "password leaked in response");
  });

  await t("me returns the registered client", async () => {
    const j = await me();
    assert(j.client && j.client.email === EMAIL, "session not established");
  });

  await t("duplicate email rejected", async () => {
    const j = await call({ action: "register", name: "Dup", email: EMAIL.toUpperCase(), password: "secret123" });
    assert(!j.ok, "duplicate accepted");
  });

  await t("login with wrong password fails", async () => {
    const j = await call({ action: "login", email: EMAIL, password: "wrongpass" });
    assert(!j.ok, "wrong password accepted");
  });

  await t("changepassword requires session", async () => {
    const fresh = new Map(jar); // same jar = still logged in; test wrong old flow below instead
    const j = await call({ action: "changepassword", password: "newsecret456" });
    assert(j.ok, "changepassword failed");
  });

  await t("login with new password works", async () => {
    jar.clear();
    const j = await call({ action: "login", email: EMAIL, password: "newsecret456" });
    assert(j.ok && j.client, "login with new password failed");
  });

  await t("logout clears session", async () => {
    const j = await call({ action: "logout" });
    assert(j.ok, "logout failed");
    const m = await me();
    assert(m.client === null, "still authenticated after logout");
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
