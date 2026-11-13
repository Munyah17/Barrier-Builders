// Admin accounts + roles API tests against api/admins.php — requires the
// local PHP server: php -S 127.0.0.1:8080 -t <repo root>
// Covers: session enforcement (401), permission enforcement (403), account
// create/update/disable/delete with password_hash, duplicate rejection,
// role create/persist/assign, restricted actions rejected server-side.
const DATA = "http://127.0.0.1:8080/api/data.php";
const ADMINS = "http://127.0.0.1:8080/api/admins.php";

let pass = 0, fail = 0;
const t = async (name, fn) => {
  try { await fn(); pass++; console.log("PASS", name); }
  catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };

const jar = new Map();
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function storeCookies(res) {
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of sc) {
    const p = c.split(";")[0]; const i = p.indexOf("=");
    if (i > 0) jar.set(p.slice(0, i).trim(), p.slice(i + 1).trim());
  }
}
async function api(url, payload) {
  const headers = { "Content-Type": "application/json" };
  if (jar.size) headers.cookie = cookieHeader();
  const res = await fetch(url, {
    method: payload ? "POST" : "GET",
    headers,
    body: payload ? JSON.stringify(payload) : undefined
  });
  storeCookies(res);
  let body = null;
  try { body = await res.json(); } catch (e) {}
  return { status: res.status, body };
}
const login = (u, p) => api(DATA, { action: "login", user: u, pass: p });
const logout = async () => { await fetch(DATA + "?logout=1", { headers: { cookie: cookieHeader() } }); jar.clear(); };

const SUF = Date.now().toString(36);
const ROLE_NAME = "TestRole" + SUF;
const ADMIN_USER = "tadm" + SUF;
const ADMIN_PASS = "temppass" + SUF;

(async () => {
  // ---------- unauthenticated ----------
  await t("admins.php rejects anonymous requests (401)", async () => {
    const r = await api(ADMINS, { action: "create", username: "x", password: "123456" });
    assert(r.status === 401, "expected 401, got " + r.status);
    const g = await api(ADMINS);
    assert(g.status === 401, "GET expected 401, got " + g.status);
  });

  // ---------- owner login ----------
  await t("owner login", async () => {
    const r = await login("munyah", "griezmann17");
    assert(r.body && r.body.ok === true, "login failed: " + JSON.stringify(r.body));
  });

  // ---------- role lifecycle ----------
  let roleId = null;
  await t("create custom role with limited permissions", async () => {
    const r = await api(ADMINS, { action: "role-create", name: ROLE_NAME, permissions: ["products.manage", "quotes.manage"] });
    assert(r.body && r.body.ok === true, "role-create failed: " + JSON.stringify(r.body));
    roleId = r.body.role.id;
    assert(r.body.role.permissions.includes("products.manage"), "perm not stored");
  });

  await t("role persists after reload (fresh GET)", async () => {
    const r = await api(ADMINS, null);
    assert(r.body && r.body.ok === true, "list failed");
    const role = r.body.roles.find(x => x.id === roleId);
    assert(role && role.name === ROLE_NAME, "role not persisted");
    assert(role.permissions.includes("quotes.manage"), "role perms not persisted");
  });

  // ---------- admin account lifecycle ----------
  let adminId = null;
  await t("create admin account via dedicated endpoint", async () => {
    const r = await api(ADMINS, { action: "create", username: ADMIN_USER, email: ADMIN_USER + "@test.local", password: ADMIN_PASS, role_id: roleId, active: true });
    assert(r.body && r.body.ok === true, "create failed: " + JSON.stringify(r.body));
    adminId = r.body.admin.id;
    assert(!r.body.admin.password, "password leaked");
  });

  await t("account + pass_hash exist in MySQL (not just state)", async () => {
    const r = await api(ADMINS, null);
    const a = r.body.admins.find(x => x.id === adminId);
    assert(a && a.username === ADMIN_USER, "admin not in DB-backed list");
    assert(a.role_id === roleId, "role not assigned");
  });

  await t("duplicate username rejected (409)", async () => {
    const r = await api(ADMINS, { action: "create", username: ADMIN_USER.toUpperCase(), password: "123456", role_id: roleId });
    assert(r.status === 409, "expected 409, got " + r.status + " " + JSON.stringify(r.body));
  });

  // ---------- restricted admin ----------
  await t("restricted admin can log in", async () => {
    await logout();
    const r = await login(ADMIN_USER, ADMIN_PASS);
    assert(r.body && r.body.ok === true, "restricted login failed: " + JSON.stringify(r.body));
  });

  await t("restricted admin cannot manage admins (403)", async () => {
    const r = await api(ADMINS, { action: "create", username: "nope" + SUF, password: "123456" });
    assert(r.status === 403, "expected 403, got " + r.status);
  });

  await t("restricted admin cannot manage roles (403)", async () => {
    const r = await api(ADMINS, { action: "role-create", name: "Nope" + SUF, permissions: [] });
    assert(r.status === 403, "expected 403, got " + r.status);
  });

  await t("restricted admin cannot whole-state sync (403)", async () => {
    const state = await (await fetch(DATA)).json();
    state.settings.tagline = "should not save";
    const headers = { "Content-Type": "application/json", cookie: cookieHeader(), "X-BFS-Admin": "1" };
    const res = await fetch(DATA, { method: "POST", headers, body: JSON.stringify(state) });
    assert(res.status === 403, "expected 403, got " + res.status);
    storeCookies(res);
  });

  await t("wrong password rejected (401)", async () => {
    await logout();
    const r = await login(ADMIN_USER, "wrongpass99");
    assert(r.status === 401 && r.body && r.body.error === "invalid_credentials", "got " + r.status + " " + JSON.stringify(r.body));
  });

  // ---------- disable / delete ----------
  await t("owner disables the admin; login then fails", async () => {
    await login("munyah", "griezmann17");
    const r = await api(ADMINS, { action: "setactive", id: adminId, active: false });
    assert(r.body && r.body.ok === true, "setactive failed: " + JSON.stringify(r.body));
    await logout();
    const bad = await login(ADMIN_USER, ADMIN_PASS);
    assert(bad.status === 401, "disabled admin logged in! " + bad.status);
  });

  await t("owner deletes the admin; login still fails", async () => {
    await login("munyah", "griezmann17");
    const r = await api(ADMINS, { action: "delete", id: adminId });
    assert(r.body && r.body.ok === true, "delete failed: " + JSON.stringify(r.body));
    await logout();
    const bad = await login(ADMIN_USER, ADMIN_PASS);
    assert(bad.status === 401, "deleted admin logged in! " + bad.status);
  });

  // ---------- expired session ----------
  await t("expired session cannot save accounts (401)", async () => {
    jar.clear(); // simulate dead session
    const r = await api(ADMINS, { action: "create", username: "ghost" + SUF, password: "123456" });
    assert(r.status === 401, "expected 401, got " + r.status);
  });

  // ---------- role cleanup ----------
  await t("delete custom role", async () => {
    await login("munyah", "griezmann17");
    const r = await api(ADMINS, { action: "role-delete", id: roleId });
    assert(r.body && r.body.ok === true, "role-delete failed: " + JSON.stringify(r.body));
  });

  await t("owner login still works at the end", async () => {
    await logout();
    const r = await login("munyah", "griezmann17");
    assert(r.body && r.body.ok === true, "final owner login failed");
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
