// Admin write-path tests: expired-session 401 guard on data.php plus the
// dedicated admins.php account lifecycle. Requires the local PHP server:
//   php -S 127.0.0.1:8080 -t <repo root>
const DATA = "http://127.0.0.1:8080/api/data.php";
const ADMINS = "http://127.0.0.1:8080/api/admins.php";

let pass = 0, fail = 0;
const t = async (name, fn) => {
  try { await fn(); pass++; console.log("PASS", name); }
  catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };

const jar = new Map();
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
function storeCookies(res) {
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of sc) {
    const p = c.split(";")[0]; const i = p.indexOf("=");
    if (i > 0) jar.set(p.slice(0, i).trim(), p.slice(i + 1).trim());
  }
}
async function call(url, payload, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (jar.size) headers.cookie = cookieHeader();
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  storeCookies(res);
  let body = null;
  try { body = await res.json(); } catch (e) {}
  return { status: res.status, body };
}
async function getState() {
  const res = await fetch(DATA, { headers: jar.size ? { cookie: cookieHeader() } : {} });
  return res.json();
}
const login = (u, p) => call(DATA, { action: "login", user: u, pass: p });
const adminsApi = (payload) => call(ADMINS, payload);

const SUF = Date.now().toString(36);
const ADMIN_USER = "acct" + SUF;

(async () => {
  await t("owner login works", async () => {
    const r = await login("munyah", "griezmann17");
    assert(r.body && r.body.ok === true, "owner login failed: " + JSON.stringify(r.body));
  });

  await t("whole-state POST cannot create admins anymore (admins.php only)", async () => {
    const state = await getState();
    state.admins.push({ id: "ad-bypass-" + SUF, username: "bypass" + SUF, name: "Bypass", email: "b@t.local", password: "e30=", active: true, createdAt: new Date().toISOString() });
    const r = await call(DATA, state, { "X-BFS-Admin": "1" });
    assert(r.body && r.body.ok === true, "sync failed: " + JSON.stringify(r.body));
    const after = await getState();
    assert(!after.admins.some(a => a.id === "ad-bypass-" + SUF), "admin was created via whole-state — bypass still open");
  });

  await t("expired-session write is rejected (401), not silently dropped", async () => {
    jar.clear();
    const state = await getState();
    state.settings.tagline = "should not save";
    const r = await call(DATA, state, { "X-BFS-Admin": "1" });
    assert(r.status === 401, "expected 401, got " + r.status);
    const check = await getState();
    assert(check.settings.tagline !== "should not save", "write leaked through");
  });

  await t("create -> persist -> logout -> fresh login -> delete -> fails", async () => {
    await login("munyah", "griezmann17");
    const c = await adminsApi({ action: "create", username: ADMIN_USER, password: "pw" + SUF + "123", role_id: "role-admin" });
    assert(c.body && c.body.ok === true, "create failed: " + JSON.stringify(c.body));
    const id = c.body.admin.id;
    const gl = await fetch(ADMINS, { headers: { cookie: cookieHeader() } });
    const gj = await gl.json();
    assert(gj.admins.some(a => a.id === id), "admin not persisted in DB-backed list");
    jar.clear();
    const li = await login(ADMIN_USER, "pw" + SUF + "123");
    assert(li.body && li.body.ok === true, "fresh login failed: " + JSON.stringify(li.body));
    // back as owner, delete
    await login("munyah", "griezmann17");
    const del = await adminsApi({ action: "delete", id });
    assert(del.body && del.body.ok === true, "delete failed: " + JSON.stringify(del.body));
    jar.clear();
    const bad = await login(ADMIN_USER, "pw" + SUF + "123");
    assert(bad.status === 401, "deleted admin still logs in");
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
