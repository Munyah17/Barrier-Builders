// Runtime smoke test of admin/index.php using jsdom against the local PHP server.
// jsdom cannot do full-page navigation, so the test reloads the page between
// phases and shares one tough-cookie jar (login POST -> reload -> assertions).
const { JSDOM } = require("jsdom");
const { CookieJar } = require("tough-cookie");

const PAGE_URL = "http://127.0.0.1:8080/admin/index.php";
const API = "http://127.0.0.1:8080/api/data.php";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const jar = new CookieJar();

// fetch() inside the page: attach jar cookies, store Set-Cookie back.
async function jarFetch(url, opts = {}) {
  const headers = new Headers(opts.headers || {});
  const cookie = await jar.getCookieString(url);
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(url, { ...opts, headers });
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of setCookies) await jar.setCookie(c, url.startsWith("http") ? url : PAGE_URL);
  return res;
}

function load() {
  return JSDOM.fromURL(PAGE_URL, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    cookieJar: jar,
    beforeParse(window) {
      window.fetch = (url, opts) => jarFetch(new URL(url, PAGE_URL).href, opts);
    }
  });
}

async function settle(dom, ms = 800) {
  const { window } = dom;
  await new Promise(res => {
    if (window.document.readyState === "complete") return res();
    window.addEventListener("load", res);
    setTimeout(res, 10000);
  });
  await sleep(ms);
}

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); pass++; console.log("PASS", name); }
  catch (e) { fail++; console.log("FAIL", name, "-", e.message); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };

(async () => {
  // ---- phase 1: logged-out page + login submit ----
  const dom1 = await load();
  const { window: w1 } = dom1;
  const d1 = w1.document;
  const errors1 = [];
  w1.addEventListener("error", e => errors1.push("window.onerror: " + e.message));
  await settle(dom1);

  t("BFS store loaded in admin", () => assert(w1.BFS, "BFS undefined"));
  t("login screen shown when logged out", () => {
    assert(d1.querySelector("#login-root .login-card"), "login card missing");
    assert(d1.querySelector("#wrapper").style.display === "none", "wrapper should be hidden");
  });

  const f = d1.querySelector("#login");
  f.querySelector("#user").value = "munyah";
  f.querySelector("#pass").value = "griezmann17";
  f.dispatchEvent(new w1.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(1500);
  const cookie = await jar.getCookieString(PAGE_URL);
  t("login POST established a session", () => assert(cookie.length > 0, "no session cookie stored"));

  // ---- phase 2: reload as the authenticated admin ----
  const dom2 = await load();
  const { window: w2 } = dom2;
  const d2 = w2.document;
  const errors2 = [];
  w2.addEventListener("error", e => errors2.push("window.onerror: " + e.message));
  await settle(dom2, 1200);
  const $ = s => d2.querySelector(s);

  t("admin login with seed credentials", () => assert(w2.BFS.isAuthed(), "not authed after login"));
  t("dashboard renders after login", () => {
    assert($("#app .page-header"), "page header missing");
    assert(d2.body.textContent.includes("Dashboard"), "dashboard heading missing");
  });
  t("sidebar nav present", () => {
    assert($("#main-sidebar"), "sidebar missing");
    assert(d2.body.textContent.includes("Quotations"), "nav missing");
  });
  t("clients route renders", () => {
    w2.location.hash = "#/clients";
    w2.dispatchEvent(new w2.Event("hashchange"));
    assert(d2.body.textContent.includes("Clients"), "clients page missing");
  });
  t("settings route renders", () => {
    w2.location.hash = "#/settings";
    w2.dispatchEvent(new w2.Event("hashchange"));
    assert(d2.body.textContent.includes("Settings"), "settings page missing");
  });

  // ---- phase 3: logout via API, reload logged-out ----
  await jarFetch(API + "?logout=1");
  const dom3 = await load();
  const w3 = dom3.window, d3 = w3.document;
  await settle(dom3);
  t("logout returns to login screen", () => {
    assert(!w3.BFS.isAuthed(), "still authed after logout");
    assert(d3.querySelector("#login-root .login-card"), "login card not reshown");
  });

  [...errors1, ...errors2].forEach(e => { console.log("  " + e); fail++; });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });

