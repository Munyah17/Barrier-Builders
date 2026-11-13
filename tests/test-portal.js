// Runtime test of portal/index.html using jsdom against the local PHP server.
// Client auth is server-side (PHP sessions), so the test shares a cookie jar
// across fetch() calls — same pattern as test-admin.js.
const { JSDOM } = require("jsdom");
const { CookieJar } = require("tough-cookie");

const PAGE_URL = "http://127.0.0.1:8080/portal/";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const jar = new CookieJar();
async function jarFetch(url, opts = {}) {
  const headers = new Headers(opts.headers || {});
  const cookie = await jar.getCookieString(url);
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(url, { ...opts, headers });
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of setCookies) await jar.setCookie(c, url);
  return res;
}

(async () => {
  const dom = await JSDOM.fromURL(PAGE_URL, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    beforeParse(window) {
      // jsdom has no fetch — give it Node's (with the shared cookie jar)
      window.fetch = (url, opts) => jarFetch(new URL(url, PAGE_URL).href, opts);
    }
  });
  const { window } = dom;
  const { document } = window;

  const errors = [];
  window.addEventListener("error", e => errors.push("window.onerror: " + e.message));

  // wait for external scripts + DOMContentLoaded handlers
  await new Promise(res => {
    if (document.readyState === "complete") return res();
    window.addEventListener("load", res);
    setTimeout(res, 8000);
  });
  await sleep(800);

  let pass = 0, fail = 0;
  const t = async (name, fn) => {
    try { await fn(); pass++; console.log("PASS", name); }
    catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
  };
  const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  await t("BFS store loaded", () => assert(window.BFS, "BFS undefined"));
  await t("BFSUI loaded", () => assert(window.BFSUI, "BFSUI undefined"));
  await t("header mounted", () => assert($("#site-header .site-header"), "header not mounted"));
  await t("footer mounted", () => assert($("#site-footer .site-footer"), "footer not mounted"));

  // --- auth screen ---
  await t("shows login form when logged out", () => {
    assert($("#af"), "auth form missing");
    assert($("#af input[name='email']"), "email input missing");
  });

  // --- register ---
  await t("switch to register view", () => {
    window.location.hash = "#/register";
    window.dispatchEvent(new window.Event("hashchange"));
    assert($("#af input[name='name']"), "name input missing in register mode");
  });

  // unique email per run — registrations persist in MySQL
  const TEST_EMAIL = `portal-${Date.now()}@test.co.zw`;

  await t("register new client", async () => {
    const f = $("#af");
    f.querySelector("[name='name']").value = "Portal Tester";
    f.querySelector("[name='email']").value = TEST_EMAIL;
    f.querySelector("[name='phone']").value = "0772111333";
    f.querySelector("[name='password']").value = "testpass123";
    f.dispatchEvent(new window.Event("submit", { cancelable: true }));
    await sleep(1200); // register + session are async server calls now
    assert(window.BFS.clientAuthed(), "not authed after register");
  });

  await sleep(300);

  await t("orders view renders after register", () => {
    assert($$(".portal-tabs").length === 1, "portal tabs missing");
    assert(document.body.textContent.includes("My orders"), "orders heading missing");
  });

  await t("bottom nav appears for authed client", () => {
    assert($(".bottom-nav"), "bottom nav missing");
    assert(document.body.classList.contains("bnav-on"), "bnav-on class missing");
  });

  // --- KYC ---
  await t("KYC tab renders form", () => {
    window.location.hash = "#/kyc";
    window.dispatchEvent(new window.Event("hashchange"));
    assert($("#kf"), "kyc form missing");
    assert(document.body.textContent.includes("Identity verification"), "kyc heading missing");
  });

  await t("submit KYC -> pending", () => {
    const f = $("#kf");
    f.querySelector("[name='fullName']").value = "Portal Tester";
    f.querySelector("[name='idNumber']").value = "63-1111111-A-11";
    f.querySelector("[name='proofAddress']").value = "5 Test Ave, Harare";
    f.dispatchEvent(new window.Event("submit", { cancelable: true }));
    const c = window.BFS.clientAuthed();
    assert(c.kyc && c.kyc.status === "pending", "kyc not pending, got " + JSON.stringify(c.kyc));
  });

  await sleep(200);
  await t("KYC pending banner shows", () => {
    assert(document.body.textContent.includes("pending review"), "pending banner missing");
  });

  // --- notifications ---
  await t("notifications tab renders", () => {
    window.location.hash = "#/notifications";
    window.dispatchEvent(new window.Event("hashchange"));
    assert(document.body.textContent.includes("Notifications"), "notifications heading missing");
    assert($$(".ntf").length > 0, "no notification items");
  });

  // --- promotions ---
  await t("promotions tab renders", () => {
    window.location.hash = "#/promos";
    window.dispatchEvent(new window.Event("hashchange"));
    assert(document.body.textContent.includes("Promotions"), "promos heading missing");
  });

  // --- settings ---
  await t("settings tab renders profile form", () => {
    window.location.hash = "#/settings";
    window.dispatchEvent(new window.Event("hashchange"));
    assert($("#sf"), "settings form missing");
    assert($("#pavatar"), "avatar input missing");
  });

  await t("save settings updates name", () => {
    const f = $("#sf");
    f.querySelector("[name='name']").value = "Portal Tester Renamed";
    f.querySelector("[name='phone']").value = "0772999888";
    f.dispatchEvent(new window.Event("submit", { cancelable: true }));
    const c = window.BFS.clientAuthed();
    assert(c.name === "Portal Tester Renamed", "name not saved: " + c.name);
    assert(c.phone === "0772999888", "phone not saved");
  });

  // --- logout ---
  await t("sign out clears auth and shows login", async () => {
    const out = document.getElementById("pout");
    assert(out, "sign-out button missing");
    out.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(400); // logout POST is async
    assert(!window.BFS.clientAuthed(), "still authed after sign out");
    assert($("#af"), "login form not shown after sign out");
  });

  // --- login again ---
  await t("login with registered credentials", async () => {
    window.location.hash = "#/login";
    window.dispatchEvent(new window.Event("hashchange"));
    const f = $("#af");
    f.querySelector("[name='email']").value = TEST_EMAIL;
    f.querySelector("[name='password']").value = "testpass123";
    f.dispatchEvent(new window.Event("submit", { cancelable: true }));
    await sleep(1200);
    assert(window.BFS.clientAuthed(), "login failed");
  });

  await sleep(300);
  await t("orders view after login", () => {
    assert(document.body.textContent.includes("My orders"), "orders view missing after login");
  });

  if (errors.length) {
    console.log("\nJS ERRORS:");
    errors.forEach(e => console.log("  " + e));
    fail += errors.length;
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
