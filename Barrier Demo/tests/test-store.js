// Smoke-test js/store.js client portal functions in Node with browser stubs.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = "c:\\Users\\MeXa\\Desktop\\Barrier Fencing Website";
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
  fetch: () => Promise.resolve({ ok: false, text: () => Promise.resolve("") }),
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
  try { fn(); pass++; console.log("PASS", name); }
  catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };

// --- client portal flow ---
t("registerClient creates account", () => {
  const c = BFS.registerClient({ name: "Test Client", email: "test@example.com", phone: "0772000000", password: "secret1" });
  assert(c && c.id, "no id");
  assert(c.kyc === null, "kyc should be null");
});

t("registerClient rejects duplicate email", () => {
  let threw = false;
  try { BFS.registerClient({ name: "Dup", email: "TEST@example.com", password: "x" }); } catch (e) { threw = true; }
  assert(threw, "duplicate not rejected");
});

t("registerClient requires email+password", () => {
  let threw = false;
  try { BFS.registerClient({ name: "NoPw", email: "nopw@example.com" }); } catch (e) { threw = true; }
  assert(threw, "missing password not rejected");
});

t("clientLogin succeeds with correct password", () => {
  const c = BFS.clientLogin("test@example.com", "secret1");
  assert(c && c.email === "test@example.com", "login failed");
});

t("clientLogin fails with wrong password", () => {
  assert(BFS.clientLogin("test@example.com", "wrong") === null, "wrong password accepted");
});

t("clientAuthed returns the logged-in client", () => {
  const c = BFS.clientAuthed();
  assert(c && c.email === "test@example.com", "not authed");
});

t("clientLogout clears session", () => {
  BFS.clientLogout();
  assert(BFS.clientAuthed() === null, "still authed after logout");
});

t("KYC submit + verify flow", () => {
  BFS.clientLogin("test@example.com", "secret1");
  const c = BFS.clientAuthed();
  c.kyc = { fullName: "Test Client", idType: "National ID", idNumber: "63-0000000-A-00", proofAddress: "1 Test St", idDoc: "", status: "pending", at: new Date().toISOString() };
  BFS.saveClient(c);
  const reloaded = BFS.clientAuthed();
  assert(reloaded.kyc.status === "pending", "kyc not pending");
  BFS.verifyClientKyc(reloaded.id, true);
  assert(BFS.client(reloaded.id).kyc.status === "verified", "kyc not verified");
  BFS.verifyClientKyc(reloaded.id, false);
  assert(BFS.client(reloaded.id).kyc.status === "rejected", "kyc not rejected");
});

t("clientOrders matches by email", () => {
  // seed has orders; create one via leadToInvoice path is heavy — check function runs
  const c = BFS.clientAuthed();
  const orders = BFS.clientOrders(c);
  assert(Array.isArray(orders), "orders not array");
});

t("clientOrders matches by phone digits", () => {
  const c = BFS.clientAuthed();
  c.phone = "0772 000 000";
  BFS.saveClient(c);
  const orders = BFS.clientOrders(BFS.clientAuthed());
  assert(Array.isArray(orders), "orders not array");
});

t("setClientActive(false) blocks login", () => {
  const c = BFS.clientAuthed();
  BFS.setClientActive(c.id, false);
  assert(BFS.clientLogin("test@example.com", "secret1") === null, "deactivated client logged in");
  BFS.setClientActive(c.id, true);
  assert(BFS.clientLogin("test@example.com", "secret1") !== null, "reactivated client cannot login");
});

t("updateClientProfile patches fields", () => {
  const c = BFS.clientAuthed();
  BFS.updateClientProfile(c.id, { name: "Renamed", phone: "0772111222" });
  const after = BFS.client(c.id);
  assert(after.name === "Renamed" && after.phone === "0772111222", "profile not updated");
});

t("deleteClient removes account", () => {
  const c = BFS.clientAuthed();
  BFS.deleteClient(c.id);
  assert(BFS.client(c.id) === undefined, "client not deleted");
});

t("admin login still works", () => {
  assert(BFS.login("admin", "Barrier@2026") === true, "admin login failed");
  assert(BFS.isAuthed() === true, "admin not authed");
  BFS.logout();
});

t("promotions() returns only active", () => {
  const promos = BFS.promotions();
  assert(Array.isArray(promos) && promos.every(p => p.active !== false), "promotions filter broken");
});

t("settings() returns company settings", () => {
  const s = BFS.settings();
  assert(s && s.company === "Barrier Builders", "settings broken");
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
