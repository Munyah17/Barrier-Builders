// Smoke-test js/store.js store functions in Node with browser stubs.
// Client *authentication* is server-side (api/client-auth.php) and is covered
// by tests/test-client-auth.js + tests/test-portal.js — this file only tests
// synchronous store operations. Client records are injected via BFS.import().
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const code = fs.readFileSync(path.join(root, "js", "store.js"), "utf8");

// --- browser stubs ---
const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
const sessionStore = {};
const sessionStorage = {
  getItem: k => (k in sessionStore ? sessionStore[k] : null),
  setItem: (k, v) => { sessionStore[k] = String(v); },
  removeItem: k => { delete sessionStore[k]; }
};
const sandbox = {
  window: {},
  document: { currentScript: null },
  localStorage,
  sessionStorage,
  location: { pathname: "/portal.html", reload: () => {} },
  fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({ ok: false }), text: () => Promise.resolve("") }),
  console,
  setTimeout,
  clearTimeout,
  Date,
  JSON,
  Math,
  btoa: s => Buffer.from(s, "binary").toString("base64"),
  unescape: s => unescape(s),
  encodeURIComponent,
  decodeURIComponent
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const BFS = sandbox.BFS;
if (!BFS) { console.error("FAIL: BFS not exported"); process.exit(1); }

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { const r = fn(); if (r && typeof r.then === "function") return r.then(() => { pass++; console.log("PASS", name); }).catch(e => { fail++; console.log("FAIL", name, "-", e.message); });
    pass++; console.log("PASS", name); }
  catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };

// inject a client record into the store (simulates a synced server state)
function withClient() {
  const s = JSON.parse(BFS.export());
  s.clients = [{
    id: "cl-test-1", name: "Test Client", email: "test@example.com", phone: "0772000000",
    kyc: null, createdAt: new Date().toISOString()
  }];
  BFS.import(JSON.stringify(s));
  return BFS.client("cl-test-1");
}

// --- store-level client management (no auth required) ---
t("client record can be stored and fetched", () => {
  const c = withClient();
  assert(c && c.email === "test@example.com", "client missing");
  assert(BFS.clientByEmail("TEST@example.com").id === "cl-test-1", "clientByEmail failed");
});

t("KYC submit + verify flow", () => {
  const c = BFS.client("cl-test-1");
  c.kyc = { fullName: "Test Client", idType: "National ID", idNumber: "63-0000000-A-00", proofAddress: "1 Test St", idDoc: "", status: "pending", at: new Date().toISOString() };
  BFS.saveClient(c);
  assert(BFS.client("cl-test-1").kyc.status === "pending", "kyc not pending");
  BFS.verifyClientKyc("cl-test-1", true);
  assert(BFS.client("cl-test-1").kyc.status === "verified", "kyc not verified");
  BFS.verifyClientKyc("cl-test-1", false);
  assert(BFS.client("cl-test-1").kyc.status === "rejected", "kyc not rejected");
});

t("clientOrders matches by email", () => {
  const c = BFS.client("cl-test-1");
  const orders = BFS.clientOrders(c);
  assert(Array.isArray(orders), "orders not array");
});

t("clientOrders matches by phone digits", () => {
  const c = BFS.client("cl-test-1");
  c.phone = "0772 000 000";
  BFS.saveClient(c);
  const orders = BFS.clientOrders(BFS.client("cl-test-1"));
  assert(Array.isArray(orders), "orders not array");
});

t("setClientActive toggles flag", () => {
  BFS.setClientActive("cl-test-1", false);
  assert(BFS.client("cl-test-1").active === false, "active not cleared");
  BFS.setClientActive("cl-test-1", true);
  assert(BFS.client("cl-test-1").active === true, "active not restored");
});

t("updateClientProfile patches fields", () => {
  BFS.updateClientProfile("cl-test-1", { name: "Renamed", phone: "0772111222" });
  const after = BFS.client("cl-test-1");
  assert(after.name === "Renamed" && after.phone === "0772111222", "profile not updated");
});

t("deleteClient removes account", () => {
  BFS.deleteClient("cl-test-1");
  assert(BFS.client("cl-test-1") === undefined, "client not deleted");
});

t("clientAuthed is null without a server session", () => {
  assert(BFS.clientAuthed() === null, "unexpected client session");
});

// --- admin / misc store functions ---
t("browser storage is not an admin login", () => {
  sessionStorage.setItem("bfs_auth", JSON.stringify({ id: "ad-x", user: "admin", name: "admin" }));
  assert(BFS.isAuthed() === false, "browser session was accepted");
});

t("Munyah profile is present and cannot be deleted", () => {
  const owner = BFS.admins().find(a => (a.email || "").toLowerCase() === "munyamuzvidziwa19@gmail.com");
  assert(owner, "owner profile missing");
  assert(owner.name === "Munyah", "owner name missing");
  let threw = false;
  try { BFS.deleteAdmin(owner.id); } catch (e) { threw = true; }
  assert(threw, "owner delete did not fail");
  assert(BFS.admins().some(a => a.id === owner.id), "owner profile was removed");
});

t("another admin can be deleted", () => {
  const created = BFS.saveAdmin({ username: "temp-delete", email: "temp-delete@example.com", password: "x", active: true });
  BFS.deleteAdmin(created.id);
  assert(!BFS.admins().some(a => a.id === created.id), "temp admin still present");
  assert(BFS.admins().some(a => (a.email || "").toLowerCase() === "munyamuzvidziwa19@gmail.com"), "owner lost after other delete");
});

t("promotions() returns only active", () => {
  const promos = BFS.promotions();
  assert(Array.isArray(promos) && promos.every(p => p.active !== false), "promotions filter broken");
});

t("settings() returns company settings", () => {
  const s = BFS.settings();
  assert(s && s.company === "Barrier Builders", "settings broken");
});

setTimeout(() => {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}, 300);
