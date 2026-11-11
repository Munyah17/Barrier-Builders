// Runtime test of portal.html using jsdom against the local PHP server.
const { JSDOM } = require("jsdom");

const URL = "http://127.0.0.1:8080/portal.html";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const dom = await JSDOM.fromURL(URL, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true
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
  await sleep(500);

  let pass = 0, fail = 0;
  const t = (name, fn) => {
    try { fn(); pass++; console.log("PASS", name); }
    catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
  };
  const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  t("BFS store loaded", () => assert(window.BFS, "BFS undefined"));
  t("BFSUI loaded", () => assert(window.BFSUI, "BFSUI undefined"));
  t("header mounted", () => assert($("#site-header .site-header"), "header not mounted"));
  t("footer mounted", () => assert($("#site-footer .site-footer"), "footer not mounted"));

  // --- auth screen ---
  t("shows login form when logged out", () => {
    assert($("#af"), "auth form missing");
    assert($("#af input[name='email']"), "email input missing");
  });

  // --- register ---
  t("switch to register view", () => {
    window.location.hash = "#/register";
    window.dispatchEvent(new window.Event("hashchange"));
    assert($("#af input[name='name']"), "name input missing in register mode");
  });

  t("register new client", () => {
    const f = $("#af");
    f.querySelector("[name='name']").value = "Portal Tester";
    f.querySelector("[name='email']").value = "portal@test.co.zw";
    f.querySelector("[name='phone']").value = "0772111333";
    f.querySelector("[name='password']").value = "testpass123";
    f.dispatchEvent(new window.Event("submit", { cancelable: true }));
    assert(window.BFS.clientAuthed(), "not authed after register");
  });

  await sleep(300);

  t("orders view renders after register", () => {
    assert($$(".portal-tabs").length === 1, "portal tabs missing");
    assert(document.body.textContent.includes("My orders"), "orders heading missing");
  });

  t("bottom nav appears for authed client", () => {
    assert($(".bottom-nav"), "bottom nav missing");
    assert(document.body.classList.contains("bnav-on"), "bnav-on class missing");
  });

  // --- KYC ---
  t("KYC tab renders form", () => {
    window.location.hash = "#/kyc";
    window.dispatchEvent(new window.Event("hashchange"));
    assert($("#kf"), "kyc form missing");
    assert(document.body.textContent.includes("Identity verification"), "kyc heading missing");
  });

  t("submit KYC -> pending", () => {
    const f = $("#kf");
    f.querySelector("[name='fullName']").value = "Portal Tester";
    f.querySelector("[name='idNumber']").value = "63-1111111-A-11";
    f.querySelector("[name='proofAddress']").value = "5 Test Ave, Harare";
    f.dispatchEvent(new window.Event("submit", { cancelable: true }));
    const c = window.BFS.clientAuthed();
    assert(c.kyc && c.kyc.status === "pending", "kyc not pending, got " + JSON.stringify(c.kyc));
  });

  await sleep(200);
  t("KYC pending banner shows", () => {
    assert(document.body.textContent.includes("pending review"), "pending banner missing");
  });

  // --- notifications ---
  t("notifications tab renders", () => {
    window.location.hash = "#/notifications";
    window.dispatchEvent(new window.Event("hashchange"));
    assert(document.body.textContent.includes("Notifications"), "notifications heading missing");
    assert($$(".ntf").length > 0, "no notification items");
  });

  // --- promotions ---
  t("promotions tab renders", () => {
    window.location.hash = "#/promos";
    window.dispatchEvent(new window.Event("hashchange"));
    assert(document.body.textContent.includes("Promotions"), "promos heading missing");
  });

  // --- settings ---
  t("settings tab renders profile form", () => {
    window.location.hash = "#/settings";
    window.dispatchEvent(new window.Event("hashchange"));
    assert($("#sf"), "settings form missing");
    assert($("#pavatar"), "avatar input missing");
  });

  t("save settings updates name", () => {
    const f = $("#sf");
    f.querySelector("[name='name']").value = "Portal Tester Renamed";
    f.querySelector("[name='phone']").value = "0772999888";
    f.dispatchEvent(new window.Event("submit", { cancelable: true }));
    const c = window.BFS.clientAuthed();
    assert(c.name === "Portal Tester Renamed", "name not saved: " + c.name);
    assert(c.phone === "0772999888", "phone not saved");
  });

  // --- logout ---
  t("sign out clears auth and shows login", () => {
    const out = document.getElementById("pout");
    assert(out, "sign-out button missing");
    out.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    assert(!window.BFS.clientAuthed(), "still authed after sign out");
    assert($("#af"), "login form not shown after sign out");
  });

  // --- login again ---
  t("login with registered credentials", () => {
    window.location.hash = "#/login";
    window.dispatchEvent(new window.Event("hashchange"));
    const f = $("#af");
    f.querySelector("[name='email']").value = "portal@test.co.zw";
    f.querySelector("[name='password']").value = "testpass123";
    f.dispatchEvent(new window.Event("submit", { cancelable: true }));
    assert(window.BFS.clientAuthed(), "login failed");
  });

  await sleep(300);
  t("orders view after login", () => {
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
