// Admin account lifecycle tests against api/data.php — requires the local
// PHP server: php -S 127.0.0.1:8080 -t <repo root>
// Covers: create admin -> persists in MySQL -> logout -> fresh login works ->
// delete -> login fails. Plus the expired-session 401 guard.
const API = "http://127.0.0.1:8080/api/data.php";
const b64 = s => Buffer.from(s, "utf8").toString("base64");

let pass = 0, fail = 0;
const t = async (name, fn) => {
  try { await fn(); pass++; console.log("PASS", name); }
  catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };

const jar = new Map();
async function call(payload, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (jar.size) headers.cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(API, { method: "POST", headers, body: JSON.stringify(payload) });
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of sc) {
    const p = c.split(";")[0]; const i = p.indexOf("=");
    if (i > 0) jar.set(p.slice(0, i).trim(), p.slice(i + 1).trim());
  }
  let body = null;
  try { body = await res.json(); } catch (e) {}
  return { status: res.status, body };
}
async function getState() {
  const headers = {};
  if (jar.size) headers.cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(API, { headers });
  return res.json();
}
async function logout() { await fetch(API + "?logout=1", { headers: { cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ") } }); jar.clear(); }
const login = (u, p) => call({ action: "login", user: u, pass: p });

const TEMP = { id: "ad-temp-test", username: "tempadm", name: "Temp Admin", email: "tempadm@test.local",
  password: b64("temppass123"), active: true, protected: false, createdAt: new Date().toISOString() };

(async () => {
  await t("owner login works", async () => {
    const r = await login("munyah", "griezmann17");
    assert(r.body && r.body.ok === true, "owner login failed: " + JSON.stringify(r.body));
  });

  await t("create admin persists to MySQL", async () => {
    const state = await getState();
    state.admins = state.admins.filter(a => a.id !== TEMP.id);
    state.admins.push(TEMP);
    const r = await call(state);
    assert(r.body && r.body.ok === true, "save failed: " + JSON.stringify(r.body));
    // verify it is actually in the DB-backed state, not just localStorage
    const after = await getState();
    assert(after.admins.some(a => a.id === TEMP.id && a.username === "tempadm"), "admin not persisted");
    assert(!after.admins.find(a => a.id === TEMP.id).password, "password leaked in GET");
  });

  await t("new admin can log in after logout", async () => {
    await logout();
    const r = await login("tempadm", "temppass123");
    assert(r.body && r.body.ok === true, "new admin login failed: " + JSON.stringify(r.body));
  });

  await t("expired-session write is rejected (401), not silently dropped", async () => {
    // simulate an admin page whose session died: header set, no valid session
    jar.clear();
    const state = await getState();
    state.settings.tagline = "should not save";
    const r = await call(state, { "X-BFS-Admin": "1" });
    assert(r.status === 401, "expected 401, got " + r.status);
    assert(r.body && r.body.ok === false, "expected ok:false");
    // and the write really did not happen
    const check = await getState();
    assert(check.settings.tagline !== "should not save", "write leaked through");
  });

  await t("admin deletion removes login", async () => {
    await login("munyah", "griezmann17");
    const state = await getState();
    state.admins = state.admins.filter(a => a.id !== TEMP.id);
    const r = await call(state);
    assert(r.body && r.body.ok === true, "delete save failed");
    await logout();
    const bad = await login("tempadm", "temppass123");
    assert(bad.body && bad.body.ok === false, "deleted admin still logs in");
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
