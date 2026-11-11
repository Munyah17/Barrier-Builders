// Runtime smoke test of admin/index.html using jsdom against the local PHP server.
const { JSDOM } = require("jsdom");

const URL = "http://127.0.0.1:8080/admin/index.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

  await new Promise(res => {
    if (document.readyState === "complete") return res();
    window.addEventListener("load", res);
    setTimeout(res, 10000);
  });
  await sleep(800);

  let pass = 0, fail = 0;
  const t = (name, fn) => {
    try { fn(); pass++; console.log("PASS", name); }
    catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
  };
  const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };
  const $ = s => document.querySelector(s);

  t("BFS store loaded in admin", () => assert(window.BFS, "BFS undefined"));
  t("login screen shown when logged out", () => {
    assert($("#login-root .login-card"), "login card missing");
    assert($("#wrapper").style.display === "none", "wrapper should be hidden");
  });

  t("admin login with seed credentials", () => {
    const f = $("#login");
    f.querySelector("#user").value = "admin";
    f.querySelector("#pass").value = "Barrier@2026";
    f.dispatchEvent(new window.Event("submit", { cancelable: true }));
    assert(window.BFS.isAuthed(), "not authed after login");
  });

  await sleep(500);

  t("dashboard renders after login", () => {
    assert($("#app .page-header"), "page header missing");
    assert(document.body.textContent.includes("Dashboard"), "dashboard heading missing");
  });

  t("sidebar nav present", () => {
    assert($("#main-sidebar"), "sidebar missing");
    assert(document.body.textContent.includes("Quotations"), "nav missing");
  });

  t("clients route renders", () => {
    window.location.hash = "#/clients";
    window.dispatchEvent(new window.Event("hashchange"));
    assert(document.body.textContent.includes("Clients"), "clients page missing");
  });

  t("settings route renders", () => {
    window.location.hash = "#/settings";
    window.dispatchEvent(new window.Event("hashchange"));
    assert(document.body.textContent.includes("Settings"), "settings page missing");
  });

  t("logout returns to login screen", () => {
    const lo = document.getElementById("logout");
    assert(lo, "logout button missing");
    lo.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    assert(!window.BFS.isAuthed(), "still authed after logout");
    assert($("#login-root .login-card"), "login card not reshown");
  });

  if (errors.length) {
    console.log("\nJS ERRORS:");
    errors.forEach(e => console.log("  " + e));
    fail += errors.length;
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
