/* Barrier Builders Admin SPA */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const route = () => (location.hash.replace(/^#\/?/, "") || "dashboard").split("/");
const EXPORTS = {};

// Await DB confirmation for the most recent save. Returns false (and alerts)
// when the server rejected it — callers should keep the form open.
async function awaitSync() {
  const r = await (BFS.syncNow ? BFS.syncNow() : Promise.resolve({ ok: true }));
  if (!r || r.ok === false) {
    alert("Save failed" + (r && r.status ? " (HTTP " + r.status + ")" : "") + " — the change was NOT stored. Check your connection and try again.");
    return false;
  }
  return true;
}

/* ---------- admin accounts & roles API (dedicated endpoint) ---------- */
const ADMINS_API = "../api/admins.php";
let ADMIN_DATA = null; // { admins, roles, permissions, me }
async function adminsApi(payload) {
  const res = await fetch(ADMINS_API, {
    method: payload ? "POST" : "GET",
    credentials: "same-origin",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined
  });
  const j = await res.json().catch(() => null);
  if (!j) { const e = new Error("server error"); e.status = res.status; throw e; }
  if (!j.ok) { const e = new Error(j.error || "request failed"); e.status = res.status; e.code = j.error; throw e; }
  return j;
}
async function loadAdminData(force) {
  if (ADMIN_DATA && !force) return ADMIN_DATA;
  ADMIN_DATA = await adminsApi(null);
  return ADMIN_DATA;
}
function canPerm(perm) {
  const p = (window.BFS_SESSION && window.BFS_SESSION.perms) || ["*"];
  return p.includes("*") || p.includes(perm);
}
const PERM_LABELS = {
  "dashboard.view": "View dashboard", "analytics.view": "View analytics",
  "products.manage": "Manage products", "promotions.manage": "Manage promotions",
  "gallery.manage": "Manage gallery", "quotes.manage": "Manage quotations",
  "invoices.manage": "Manage invoices", "orders.manage": "Manage orders",
  "content.manage": "Edit site content", "messages.manage": "Manage messages",
  "clients.manage": "Manage clients", "admins.manage": "Manage admin accounts",
  "roles.manage": "Manage roles", "settings.manage": "Manage settings",
  "sync": "Save site data (required for most edits)"
};
const ROUTE_PERM = {
  analytics: "analytics.view", products: "products.manage", promotions: "promotions.manage",
  gallery: "gallery.manage", quotes: "quotes.manage", invoices: "invoices.manage",
  orders: "orders.manage", content: "content.manage", messages: "messages.manage",
  clients: "clients.manage", admins: "admins.manage", roles: "roles.manage", settings: "settings.manage"
};

/* ---------- record normalization ----------
   Records can arrive with missing nested objects (customer/project/items/
   steps) — e.g. imports or older saves. Guard every read path once here so
   one malformed record can't kill an entire admin page render. */
(function normalizeBfsRecords() {
  if (!window.BFS) return;
  const norm = r => {
    if (!r || typeof r !== "object") return r;
    if (r.customer === undefined) r.customer = {};
    if (r.project === undefined) r.project = {};
    if (r.items === undefined) r.items = [];
    if (r.steps === undefined && r.tracking) r.steps = [];
    return r;
  };
  ["quotes", "invoices", "orders", "clients", "leads", "contacts", "promotions", "gallery", "products"].forEach(k => {
    const orig = BFS[k];
    if (typeof orig === "function") BFS[k] = () => orig().map(norm);
  });
  ["quote", "invoice", "order", "product", "client", "lead"].forEach(k => {
    const orig = BFS[k];
    if (typeof orig === "function") BFS[k] = (...a) => norm(orig(...a));
  });
})();

function requireAuth() {
  if (!BFS.isAuthed()) { renderLogin(); return false; }
  return true;
}

function showApp() {
  document.documentElement.classList.add("bfs-authed");
  const wrap = document.getElementById("wrapper");
  if (wrap) wrap.style.display = "";
}

function renderLogin() {
  document.documentElement.classList.remove("bfs-authed");
  const wrap = document.getElementById("wrapper");
  if (wrap) wrap.style.display = "none";
  const root = document.getElementById("login-root");
  if (root && !document.getElementById("login")) {
    root.innerHTML = `
    <div class="login-screen">
      <form class="login-card" id="login" method="post" action="../api/data.php">
        <div class="login-brand">
          <img src="../assets/logo.png" width="72" height="72" alt="Barrier Builders" class="login-logo">
        </div>
        <h1>Admin Panel</h1>
        <input type="hidden" name="action" value="login">
        <div class="login-field"><label>Username or email</label><input id="user" name="user" autocomplete="username" required></div>
        <div class="login-field"><label>Password</label><input id="pass" name="pass" type="password" autocomplete="current-password" required></div>
        <button class="login-btn" type="submit">Sign in</button>
        <p class="login-err" id="err"></p>
      </form>
    </div>`;
  }
  bindLogin();
}

function bindLogin() {
  const form = document.getElementById("login");
  if (!form || form.dataset.bound === "1") return;
  form.dataset.bound = "1";
  const user = document.getElementById("user");
  const pass = document.getElementById("pass");
  const err = document.getElementById("err");
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (err) err.textContent = "Checking…";
    const u = user.value.trim();
    const p = pass.value;
    let session = false, serverErr = false;
    try {
      const res = await fetch("../api/data.php", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", user: u, pass: p })
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j && j.ok) session = true;
      else if (j && j.error === "server_error") serverErr = true;
      else if (!j || typeof j.ok !== "boolean") serverErr = true;
    } catch (ex) { serverErr = true; }
    if (session) { location.href = "../admin/"; return; }
    if (err) err.textContent = serverErr ? "Server error — try again." : "Invalid credentials.";
  };
}

function shell(title, body, extra="") {
  return `<div class="page-header">
      <div><h1>${title}</h1><p class="subtitle">Barrier Builders — yard management</p></div>
      <div class="page-header__actions d-flex gap-2 flex-wrap align-items-center">${extra}</div>
    </div>${body}`;
}
function statCard(label, value, icon, tone, sparkId) {
  return `<article class="stat-card">
    <div class="stat-card__head">
      <p class="stat-card__label">${label}</p>
      <span class="stat-card__icon stat-card__icon--${tone}"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>
    </div>
    <p class="stat-card__value">${value}</p>
    <div class="stat-card__sparkline"><canvas id="${sparkId}"></canvas></div>
  </article>`;
}
function mCard(title, subtitle, body, action="") {
  return `<section class="m-card" style="margin-bottom:16px">
    <header class="m-card__header">
      <div><h2 class="m-card__title">${title}</h2>${subtitle?`<p class="m-card__subtitle">${subtitle}</p>`:""}</div>
      ${action}
    </header>
    ${body}
  </section>`;
}
function tbl(head, rows) {
  return `<div class="table-responsive"><table class="table table-striped align-middle">${head}${rows}</table></div>`;
}
const th = cols => `<thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead>`;
const badge = (text, cls) => `<span class="badge ${cls}">${text}</span>`;
const act = (icon, title, attrs) => `<button class="btn btn-sm btn-outline-secondary" title="${title}" ${attrs}><i class="fa-solid ${icon}"></i></button>`;
function showEditor(html) {
  const ed = document.getElementById("editor");
  if (!ed) return;
  ed.innerHTML = html;
  ed.scrollIntoView({ behavior: "smooth", block: "start" });
}
function notify(msg) {
  let t = document.getElementById("bfs-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "bfs-toast";
    t.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9999;background:#1e7a46;color:#fff;padding:12px 18px;border-radius:10px;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;transition:opacity .25s";
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = "1";
  clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = "0"; }, 2600);
}

/* ---------- CMS helpers ---------- */
function setPath(obj, keys, val) {
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i], nk = keys[i + 1];
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== "object") cur[k] = /^\d+$/.test(nk) ? [] : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = val;
}
function collectContent(form) {
  const patch = {};
  new FormData(form).forEach((v, k) => {
    if (k.indexOf("c[") === 0 && k.lastIndexOf("]") === k.length - 1) {
      const path = k.slice(2, -1);
      setPath(patch, path.split("."), v);
    }
  });
  return patch;
}
function cInput(path, label, value, opts) {
  opts = opts || {};
  const type = opts.type || "text";
  const rows = opts.rows ? ` rows="${opts.rows}"` : "";
  const uid = "ai_" + path.replace(/[^a-z0-9]/gi, "_");
  const aiBtn = opts.ai ? `<button type="button" class="m-btn m-btn--ghost ai-btn" data-ai-for="${uid}" data-ai-prompt="${esc(opts.ai)}" title="Generate with AI" style="white-space:nowrap"><i class="fa-solid fa-wand-magic-sparkles"></i> AI</button>` : "";
  const inner = opts.area
    ? `<textarea name="c[${path}]" class="form-control" id="${uid}"${rows}>${esc(value ?? "")}</textarea>`
    : `<input name="c[${path}]" type="${type}" class="form-control" id="${uid}" value="${esc(value ?? "")}"${opts.step ? ` step="${opts.step}"` : ""}>`;
  return `<div class="${opts.cls || "col-md-6"}"><label class="form-label">${label}</label><div class="d-flex gap-2 align-items-start">${inner}${aiBtn}</div></div>`;
}
function cImg(path, label, value) {
  const uid = "img_" + path.replace(/[^a-z0-9]/gi, "_");
  return `<div class="col-12">
    <label class="form-label">${label}</label>
    <div class="d-flex gap-2 align-items-start flex-wrap">
      <input name="c[${path}]" type="text" class="form-control" style="max-width:420px" value="${esc(value ?? "")}" placeholder="assets/img/... or assets/uploads/...">
      <label class="m-btn m-btn--ghost" style="cursor:pointer;white-space:nowrap"><i class="fa-solid fa-upload"></i> Upload
        <input type="file" accept="image/*" style="display:none" data-upload-for="${uid}"></label>
    </div>
    <div id="${uid}_prev" style="margin-top:8px">${value ? `<img src="../${esc(value)}" style="max-width:220px;border-radius:8px;border:1px solid #e4e7ec">` : `<span class="text-muted small">No image</span>`}</div>
    <input type="hidden" id="${uid}_val" value="${esc(value ?? "")}">
  </div>`;
}
async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("../api/upload.php", { method: "POST", body: fd });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || "upload failed");
  return j.path;
}
async function aiGenerate(prompt, system, maxTokens) {
  const res = await fetch("../api/ai.php", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system, max_tokens: maxTokens || 500 })
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || "AI request failed");
  return j.text;
}

/* ---------- export / import ---------- */
function regExport(key, cfg) { EXPORTS[key] = cfg; }
function exportMenu(key) {
  return `<div class="dropdown">
    <button class="m-btn m-btn--ghost dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="fa-solid fa-download"></i> Export</button>
    <ul class="dropdown-menu dropdown-menu-end">
      <li><a class="dropdown-item" href="#" data-exp="csv" data-key="${key}">CSV</a></li>
      <li><a class="dropdown-item" href="#" data-exp="excel" data-key="${key}">Excel (.xlsx)</a></li>
      <li><a class="dropdown-item" href="#" data-exp="pdf" data-key="${key}">PDF</a></li>
      <li><a class="dropdown-item" href="#" data-exp="png" data-key="${key}">PNG image</a></li>
    </ul>
  </div>`;
}
async function doExport(key, format) {
  const d = EXPORTS[key]; if (!d) return;
  try {
    if (format === "csv") BFSAdmin.exportCSV(d.filename + ".csv", d.headers, d.rows);
    else if (format === "excel") await BFSAdmin.exportExcel(d.filename + ".xlsx", d.title, d.headers, d.rows);
    else if (format === "pdf") await BFSAdmin.exportPDF(d.filename + ".pdf", d.title, d.headers, d.rows, d.subtitle);
    else if (format === "png") await BFSAdmin.exportPNG(d.filename + ".png", d.pngEl || ("#exp-" + key));
  } catch (e) { alert("Export failed: " + e.message); }
}
function importBtn(accept, onFile) {
  return `<label class="m-btn m-btn--ghost" style="cursor:pointer"><i class="fa-solid fa-upload"></i> Import
    <input type="file" accept="${accept}" style="display:none" data-import="${onFile}"></label>`;
}

/* ---------- dashboard ---------- */
function dashboard() {
  const quotes = BFS.quotes();
  const invoices = BFS.invoices();
  const orders = BFS.orders();
  const leads = BFS.leads();
  const revenue = invoices.filter(i => i.status==="paid").reduce((s,i)=>s+i.total,0);
  const low = BFS.products().filter(p => p.stock < 40);
  const a = BFS.analytics();
  const days = Object.keys(a.daily).sort().slice(-14);
  const recent = quotes.slice(0,6).map(q => `<tr>
    <td><a href="#/quote/${q.ref}">${q.ref}</a></td><td>${esc(q.customer.name)}</td>
    <td>$${BFS.money(q.total)}</td><td>${badge(q.status, q.status==="converted"?"bg-primary":q.status==="accepted"?"bg-success":"bg-warning")}</td></tr>`).join("");
  const activity = BFS.contacts().slice(-6).reverse().map(c => `<li class="activity-item">
    <div class="activity-item__body"><p class="activity-item__text"><b>${esc(c.name)}</b> sent a message.</p>
    <span class="activity-item__time">${new Date(c.at).toLocaleString()}</span></div></li>`).join("")
    || `<li class="activity-item"><div class="activity-item__body"><p class="activity-item__text text-muted">No recent activity.</p></div></li>`;
  const leadRows = leads.slice(0,8).map(l => {
    const conv = l.invoiceRef ? `<a class="btn btn-sm btn-outline-primary" href="#/invoice/${l.invoiceRef}">Invoice</a>`
      : `<button class="btn btn-sm btn-outline-success" data-leadconv="${l.id}">Convert</button>`;
    return `<tr><td>${esc(l.type||"lead")}</td><td><strong>${esc(l.name||"Website lead")}</strong><div class="text-muted small">${esc(l.contact||l.prompt||"")}</div></td>
      <td class="text-muted small">${l.at?new Date(l.at).toLocaleDateString():"—"}</td>
      <td>${badge(l.status, l.status==="converted"?"bg-primary":"bg-warning")}</td>
      <td class="text-end">${conv}</td></tr>`;
  }).join("");
  return shell("Dashboard", `
    <div class="row row-tight">
      <div class="col-sm-6 col-lg-3">${statCard("Quotations", quotes.length, "fa-file-invoice-dollar", "c1", "sp-q")}</div>
      <div class="col-sm-6 col-lg-3">${statCard("Invoices", invoices.length, "fa-receipt", "c2", "sp-i")}</div>
      <div class="col-sm-6 col-lg-3">${statCard("Paid revenue", "$"+BFS.money(revenue), "fa-dollar-sign", "c3", "sp-r")}</div>
      <div class="col-sm-6 col-lg-3">${statCard("Open orders", orders.filter(o=>o.status!=="complete").length, "fa-truck-fast", "c4", "sp-o")}</div>
    </div>
    <div class="row row-tight" style="margin-top:16px">
      <div class="col-lg-8">${mCard("Quote & invoice activity","Last 14 days", `<div style="height:280px;position:relative"><canvas id="dash-chart"></canvas></div>`)}</div>
      <div class="col-lg-4">${mCard("Recent activity","Latest messages", `<ul class="activity-list">${activity}</ul>`, `<a href="#/messages" class="m-btn m-btn--ghost" style="height:30px;padding:0 10px;font-size:12.5px">View all</a>`)}</div>
    </div>
    <div class="row row-tight" style="margin-top:16px">
      <div class="col-lg-7">${mCard("Latest quotations","", tbl(th(["Ref","Client","Total","Status"]), recent || `<tr><td colspan="4" class="text-muted">No quotations yet.</td></tr>`), `<a href="#/quotes" class="m-btn m-btn--ghost" style="height:30px;padding:0 10px;font-size:12.5px">View all</a>`)}</div>
      <div class="col-lg-5">${mCard("Low stock","Products under 40 units", low.length ? low.map(p=>`<div class="d-flex justify-content-between align-items-center py-2 border-bottom"><span>${esc(p.name)}</span>${badge(p.stock+" "+p.stockUnit,"bg-warning")}</div>`).join("") : `<p class="text-muted mb-0">Stock levels are healthy.</p>`)}</div>
    </div>
    <div style="margin-top:16px">${mCard("Leads","Quotes, AI estimates & enquiries from the website", `<div id="exp-dash-leads">${tbl(th(["Type","Lead","Date","Status",""]), leadRows || `<tr><td colspan="5" class="text-muted">No leads yet.</td></tr>`)}</div>`, `<a href="#/quotes" class="m-btn m-btn--ghost" style="height:30px;padding:0 10px;font-size:12.5px">All quotations</a>`)}</div>`);
}

/* ---------- analytics ---------- */
function analytics() {
  const a = BFS.analytics();
  const days = Object.keys(a.daily).sort().slice(-21);
  const pages = Object.entries(a.pageviews).sort((x,y)=>y[1]-x[1]);
  const pageRows = pages.map(([k,v]) => [k, v]);
  const qTot = days.reduce((s,d)=>s+a.daily[d].quotes,0);
  const iTot = days.reduce((s,d)=>s+a.daily[d].invoices,0);
  const vTot = days.reduce((s,d)=>s+a.daily[d].views,0);
  const dailyRows = days.map(d => [d, a.daily[d].views, a.daily[d].quotes, a.daily[d].invoices]);
  regExport("analytics-pages", { filename:"analytics-pages", title:"Top pages", headers:["Page","Views"], rows:pageRows, subtitle:"Barrier Builders analytics" });
  regExport("analytics-daily", { filename:"analytics-daily", title:"Daily activity", headers:["Date","Views","Quotes","Invoices"], rows:dailyRows, subtitle:"Last 21 days" });
  const kpi = (label, val, icon, tone) => `<div class="col-sm-6 col-lg-3"><article class="stat-card"><div class="stat-card__head"><p class="stat-card__label">${label}</p><span class="stat-card__icon stat-card__icon--${tone}"><i class="fa-solid ${icon}"></i></span></div><p class="stat-card__value">${val}</p></article></div>`;
  return shell("Analytics", `
    <div class="row row-tight">
      ${kpi("Views (21d)", vTot, "fa-eye", "c1")}
      ${kpi("Quotes (21d)", qTot, "fa-file-invoice-dollar", "c2")}
      ${kpi("Invoices (21d)", iTot, "fa-receipt", "c3")}
      ${kpi("Pages tracked", Object.keys(a.pageviews).length, "fa-chart-pie", "c4")}
    </div>
    <div style="margin-top:16px">${mCard("Daily page views","Last 21 days", `<div style="height:300px;position:relative"><canvas id="analytics-chart"></canvas></div>`)}</div>
    <div style="margin-top:16px">${mCard("Top pages","", `<div id="exp-analytics-pages">${tbl(th(["Page","Views"]), pages.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("") || `<tr><td colspan="2" class="text-muted">No data yet.</td></tr>`)}</div>`, exportMenu("analytics-pages"))}</div>
    <div style="margin-top:16px">${mCard("Daily breakdown","", `<div id="exp-analytics-daily">${tbl(th(["Date","Views","Quotes","Invoices"]), dailyRows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join(""))}</div>`, exportMenu("analytics-daily"))}</div>`);
}

/* ---------- inventory (products) ---------- */
function products() {
  const rows = BFS.products().map(p => `<tr>
    <td><strong>${esc(p.name)}</strong><div class="text-muted small">${esc(p.category)}</div></td>
    <td>$${p.pricePerM.toFixed(2)}/m</td>
    <td><input type="number" value="${p.stock}" data-id="${p.id}" class="form-control form-control-sm" style="width:90px"></td>
    <td>${esc(p.stockUnit)}</td>
    <td>${badge(p.stock<40?"Low":p.stock===0?"Out":"OK", p.stock<40?"bg-warning":p.stock===0?"bg-danger":"bg-success")}</td>
    <td class="text-end"><button class="btn btn-sm btn-outline-primary" data-edit="${p.id}">Edit</button></td>
  </tr>`).join("");
  const expRows = BFS.products().map(p => [p.name, p.category, p.pricePerM, p.rollPrice, p.rollMetres, p.postPrice, p.stock, p.stockUnit, p.featured?"Yes":"No"]);
  regExport("products", { filename:"inventory", title:"Inventory", headers:["Name","Category","Price/m","Roll price","Coverage m","Post price","Stock","Unit","Featured"], rows:expRows, subtitle:"Barrier Builders inventory" });
  return shell("Inventory", mCard("Products","Manage stock and pricing", `<div id="exp-products">${tbl(th(["Product","Price","Stock","Unit","Status",""]), rows)}</div>`,
    `<div class="d-flex gap-2 flex-wrap">${importBtn(".csv,.xlsx", "products")}${exportMenu("products")}<button class="m-btn m-btn--primary" id="addP"><i class="fa-solid fa-plus"></i> Add product</button></div>`) + `<div id="editor" style="margin-top:16px"></div>`);
}
function productForm(p) {
  p = p || { name:"", category:"Residential", slug:"", short:"", pricePerM:0, rollPrice:0, rollMetres:30, postPrice:0, stock:0, stockUnit:"rolls", image:"assets/img/diamond-mesh.jpg", featured:false };
  const f = (label, inner, cls="col-md-6") => `<div class="${cls}"><label class="form-label">${label}</label>${inner}</div>`;
  const inp = (name, val, type="text", step="") => `<input name="${name}" type="${type}" ${step?`step="${step}"`:""} class="form-control" value="${esc(val ?? "")}">`;
  return `<section class="m-card"><header class="m-card__header"><div><h2 class="m-card__title">${p.id ? "Edit product" : "New product"}</h2></div></header>
  <form id="pf">
    <div class="row g-3">
      ${f("Name", inp("name", p.name), "col-md-6")}
      ${f("Slug", inp("slug", p.slug), "col-md-6")}
      ${f("Category", inp("category", p.category), "col-md-6")}
      ${f("Price / m", inp("pricePerM", p.pricePerM, "number", "0.01"), "col-md-6")}
      ${f("Roll / panel price", inp("rollPrice", p.rollPrice, "number", "0.01"), "col-md-6")}
      ${f("Coverage (m)", inp("rollMetres", p.rollMetres, "number"), "col-md-6")}
      ${f("Post price", inp("postPrice", p.postPrice, "number", "0.01"), "col-md-6")}
      ${f("Stock", inp("stock", p.stock, "number"), "col-md-6")}
      ${f("Stock unit", inp("stockUnit", p.stockUnit), "col-md-6")}
      ${f("Image path", inp("image", p.image), "col-md-6")}
    </div>
    <div class="mt-3"><label class="form-label">Short description</label><textarea name="short" class="form-control" rows="3">${esc(p.short||"")}</textarea></div>
    <div class="form-check mt-3"><input class="form-check-input" type="checkbox" name="featured" id="pf-feat" ${p.featured?"checked":""}><label class="form-check-label" for="pf-feat">Featured on homepage</label></div>
    <div class="d-flex gap-2 mt-3">
      <button class="m-btn m-btn--primary" type="submit">Save</button>
      <button class="m-btn m-btn--ghost" type="button" id="cancel">Cancel</button>
      ${p.id ? `<button class="btn btn-danger" type="button" id="del">Delete</button>` : ""}
    </div>
  </form></section>`;
}
function bindProducts() {
  document.querySelectorAll("input[data-id]").forEach(inp => inp.onchange = () => {
    const p = BFS.product(inp.dataset.id); p.stock = +inp.value; BFS.saveProduct(p); render();
  });
  document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openProduct(BFS.product(b.dataset.edit)));
  const add = document.getElementById("addP");
  if (add) add.onclick = () => openProduct(null);
}
function openProduct(p) {
  const box = document.getElementById("editor");
  if (!box) return;
  showEditor(productForm(p));
  const cancelBtn = box.querySelector("#cancel");
  const form = box.querySelector("#pf");
  const delBtn = box.querySelector("#del");
  if (cancelBtn) cancelBtn.onclick = () => { box.innerHTML = ""; };
  if (form) form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form);
    const next = Object.assign({}, p || { id: BFS.uid("p"), specs:{}, keywords:[], topWirePerM:0.8, gatePrice:180, installPerM:3.5, concretePerPost:4, description: fd.get("short") });
    ["name","slug","category","image","short","stockUnit"].forEach(k => next[k] = fd.get(k));
    ["pricePerM","rollPrice","rollMetres","postPrice","stock"].forEach(k => next[k] = Number(fd.get(k)));
    next.featured = form.querySelector('[name="featured"]').checked;
    if (!next.slug) next.slug = next.name.toLowerCase().replace(/\s+/g,"-");
    BFS.saveProduct(next); location.hash = "#/products"; render();
  };
  if (delBtn) delBtn.onclick = () => { if (confirm("Delete this product?")) { BFS.deleteProduct(p.id); render(); } };
}

/* ---------- promotions ---------- */
function promotions() {
  const rows = BFS.allPromotions().map(p => `<tr>
    <td><strong>${esc(p.title)}</strong><div class="text-muted small">${esc(p.body||"")}</div></td>
    <td>${badge(p.tag||"Offer","bg-info")}</td>
    <td>${badge(p.active?"Live":"Off", p.active?"bg-success":"bg-secondary")}</td>
    <td class="text-muted small">${p.starts} → ${p.ends}</td>
    <td class="text-end">
      <div class="d-flex gap-2 justify-content-end">
        <button class="btn btn-sm btn-outline-primary" data-id="${p.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger" data-del="${p.id}">Delete</button>
      </div>
    </td></tr>`).join("");
  return shell("Promotions", mCard("Promotions","Manage public site offers", tbl(th(["Title","Tag","Status","Dates",""]), rows || `<tr><td colspan="5" class="text-muted">No promotions yet.</td></tr>`), `<button class="m-btn m-btn--primary" id="addPr"><i class="fa-solid fa-plus"></i> New promotion</button>`) + `<div id="editor" style="margin-top:16px"></div>`);
}
function promoForm(p) {
  p = p || { title:"", body:"", tag:"Offer", active:true, starts:"2026-11-06", ends:"2026-12-31" };
  return `<section class="m-card"><header class="m-card__header"><div><h2 class="m-card__title">${p.id?"Edit":"New"} promotion</h2></div></header>
  <form id="prf">
    <div class="mb-3"><label class="form-label">Title</label><input name="title" class="form-control" value="${esc(p.title||"")}" required></div>
    <div class="mb-3"><label class="form-label">Body</label><textarea name="body" class="form-control" rows="3">${esc(p.body||"")}</textarea></div>
    <div class="row g-3">
      <div class="col-md-4"><label class="form-label">Tag</label><input name="tag" class="form-control" value="${esc(p.tag||"")}"></div>
      <div class="col-md-4"><label class="form-label">Starts</label><input type="date" name="starts" class="form-control" value="${p.starts||""}"></div>
      <div class="col-md-4"><label class="form-label">Ends</label><input type="date" name="ends" class="form-control" value="${p.ends||""}"></div>
    </div>
    <div class="form-check mt-3"><input class="form-check-input" type="checkbox" name="active" id="prf-act" ${p.active?"checked":""}><label class="form-check-label" for="prf-act">Active on the public site</label></div>
    <div class="d-flex gap-2 mt-3"><button class="m-btn m-btn--primary" type="submit">Save</button><button class="m-btn m-btn--ghost" type="button" id="cancel">Cancel</button></div>
  </form></section>`;
}
function bindPromos() {
  document.getElementById("addPr").onclick = () => openPromo(null);
  document.querySelectorAll("[data-id]").forEach(b => b.onclick = () => openPromo(BFS.allPromotions().find(p => p.id===b.dataset.id)));
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { BFS.deletePromotion(b.dataset.del); render(); });
}
function openPromo(p) {
  const box = document.getElementById("editor");
  if (!box) return;
  showEditor(promoForm(p));
  const cancelBtn = box.querySelector("#cancel");
  const form = box.querySelector("#prf");
  if (cancelBtn) cancelBtn.onclick = () => { box.innerHTML = ""; };
  if (form) form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form);
    const next = Object.assign({}, p || {});
    next.title = fd.get("title"); next.body = fd.get("body"); next.tag = fd.get("tag");
    next.starts = fd.get("starts"); next.ends = fd.get("ends"); next.active = form.querySelector('[name="active"]').checked;
    BFS.savePromotion(next); render();
  };
}

/* ---------- quotations ---------- */
function quoteStatusBadge(q) {
  const map = { draft:"bg-secondary", sent:"bg-warning", accepted:"bg-success", converted:"bg-primary", suspended:"bg-dark" };
  return badge(q.status, map[q.status] || "bg-warning");
}
function quotes() {
  const rows = BFS.quotes().map(q => `<tr>
    <td><a href="#/quote/${q.ref}">${q.ref}</a></td>
    <td><strong>${esc(q.customer.name)}</strong><div class="text-muted small">${esc(q.customer.contact)}</div></td>
    <td class="text-muted small">${esc(q.project.typeName)} · ${q.project.perimeter}m</td>
    <td>$${BFS.money(q.total)}</td>
    <td>${quoteStatusBadge(q)}</td>
    <td class="text-end">
      ${q.invoiceRef ? `<a class="btn btn-sm btn-outline-primary" href="#/invoice/${q.invoiceRef}">Invoice</a>` : `<button class="btn btn-sm btn-outline-success" data-conv="${q.ref}">Convert</button>`}
      <button class="btn btn-sm btn-outline-secondary" title="Edit" data-qedit="${q.ref}"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-sm btn-outline-secondary" title="Send" data-qsend="${q.ref}"><i class="fa-solid fa-paper-plane"></i></button>
      <button class="btn btn-sm btn-outline-secondary" title="${q.status==="suspended"?"Resume":"Suspend"}" data-qsusp="${q.ref}"><i class="fa-solid ${q.status==="suspended"?"fa-play":"fa-pause"}"></i></button>
      <button class="btn btn-sm btn-outline-danger" title="Delete" data-qdel="${q.ref}"><i class="fa-solid fa-trash"></i></button>
    </td>
  </tr>`).join("");
  const expRows = BFS.quotes().map(q => [q.ref, q.customer.name, q.customer.contact, q.project.typeName, q.project.perimeter, q.total, q.status, q.createdAt?new Date(q.createdAt).toLocaleDateString():""]);
  regExport("quotes", { filename:"quotations", title:"Quotations", headers:["Ref","Client","Contact","Type","Perimeter m","Total","Status","Date"], rows:expRows, subtitle:"Barrier Builders quotations" });
  return shell("Quotations", mCard("Quotations","All customer quotes", `<div id="exp-quotes">${tbl(th(["Ref","Client","Project","Total","Status",""]), rows || `<tr><td colspan="6" class="text-muted">No quotations yet.</td></tr>`)}</div>`,
    `<div class="d-flex gap-2 flex-wrap">${importBtn(".csv,.xlsx", "quotes")}<button class="m-btn m-btn--ghost" id="createQ"><i class="fa-solid fa-plus"></i> Create</button>${exportMenu("quotes")}</div>`) + `<div id="editor" style="margin-top:16px"></div>`);
}
function quoteForm(q) {
  q = q || { customer:{name:"",contact:"",email:"",notes:""}, project:{typeName:"",perimeter:0,height:1.8,spacing:2.5}, items:[], subtotal:0, vat:0, total:0, status:"draft" };
  const items = (q.items||[]).map((it,i)=>`<tr><td><input class="form-control form-control-sm" name="in${i}" value="${esc(it.name)}"></td><td><input class="form-control form-control-sm" name="iq${i}" type="number" step="0.01" value="${it.qtyNum??it.qty??1}" style="width:80px"></td><td><input class="form-control form-control-sm" name="ip${i}" type="number" step="0.01" value="${it.unitPrice??it.total??0}" style="width:100px"></td></tr>`).join("");
  return `<section class="m-card"><header class="m-card__header"><div><h2 class="m-card__title">${q.ref?"Edit":"Create"} quotation</h2></div></header>
  <form id="qf">
    <div class="row g-3">
      <div class="col-md-4"><label class="form-label">Client name</label><input name="cname" class="form-control" value="${esc(q.customer.name)}" required></div>
      <div class="col-md-4"><label class="form-label">Contact</label><input name="ccontact" class="form-control" value="${esc(q.customer.contact)}"></div>
      <div class="col-md-4"><label class="form-label">Email</label><input name="cemail" class="form-control" value="${esc(q.customer.email)}"></div>
      <div class="col-md-4"><label class="form-label">Project type</label><input name="ptype" class="form-control" value="${esc(q.project.typeName)}"></div>
      <div class="col-md-4"><label class="form-label">Perimeter (m)</label><input name="pper" type="number" class="form-control" value="${q.project.perimeter||0}"></div>
      <div class="col-md-4"><label class="form-label">Status</label><select name="status" class="form-control">${["draft","sent","accepted","suspended"].map(s=>`<option ${q.status===s?"selected":""}>${s}</option>`).join("")}</select></div>
    </div>
    <div class="mt-3"><label class="form-label">Line items</label>
      <div class="table-responsive"><table class="table table-sm"><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th></tr></thead><tbody id="qitems">${items || `<tr><td><input class="form-control form-control-sm" name="in0"></td><td><input class="form-control form-control-sm" name="iq0" type="number" value="1" style="width:80px"></td><td><input class="form-control form-control-sm" name="ip0" type="number" step="0.01" value="0" style="width:100px"></td></tr>`}</tbody></table></div>
      <button type="button" class="btn btn-sm btn-outline-secondary" id="addItem">+ Add item</button>
    </div>
    <div class="d-flex gap-2 mt-3"><button class="m-btn m-btn--primary" type="submit">Save</button><button class="m-btn m-btn--ghost" type="button" id="cancel">Cancel</button></div>
  </form></section>`;
}
function bindQuotes() {
  document.querySelectorAll("[data-conv]").forEach(b => b.onclick = () => convertQuote(b.dataset.conv));
  document.querySelectorAll("[data-qedit]").forEach(b => b.onclick = () => openQuote(BFS.quote(b.dataset.qedit)));
  document.querySelectorAll("[data-qsend]").forEach(b => b.onclick = () => { const q=BFS.quote(b.dataset.qsend); q.status="sent"; BFS.saveQuote(q); render(); });
  document.querySelectorAll("[data-qsusp]").forEach(b => b.onclick = () => { const q=BFS.quote(b.dataset.qsusp); q.status = q.status==="suspended"?"sent":"suspended"; BFS.saveQuote(q); render(); });
  document.querySelectorAll("[data-qdel]").forEach(b => b.onclick = () => { if(confirm("Delete this quotation?")){ BFS.deleteQuote(b.dataset.qdel); render(); } });
  const cq = document.getElementById("createQ");
  if (cq) cq.onclick = () => openQuote(null);
}
function openQuote(q) {
  const box = document.getElementById("editor");
  if (!box) return;
  showEditor(quoteForm(q));
  const cancelBtn = box.querySelector("#cancel");
  const form = box.querySelector("#qf");
  const itemsBody = box.querySelector("#qitems");
  if (cancelBtn) cancelBtn.onclick = () => { box.innerHTML = ""; };
  const addItem = box.querySelector("#addItem");
  let idx = (q&&q.items?q.items.length:1);
  if (addItem && itemsBody) addItem.onclick = () => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><input class="form-control form-control-sm" name="in${idx}"></td><td><input class="form-control form-control-sm" name="iq${idx}" type="number" value="1" style="width:80px"></td><td><input class="form-control form-control-sm" name="ip${idx}" type="number" step="0.01" value="0" style="width:100px"></td>`;
    itemsBody.appendChild(tr); idx++;
  };
  if (form) form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form);
    const items = [];
    for (let i=0; i<idx+2; i++) {
      const name = fd.get("in"+i); if (!name) continue;
      const qty = Number(fd.get("iq"+i)||1); const price = Number(fd.get("ip"+i)||0);
      items.push({ name, qty: qty+"", qtyNum: qty, unitPrice: price, total: Math.round(qty*price*100)/100 });
    }
    const subtotal = items.reduce((s,i)=>s+i.total,0);
    const next = Object.assign({}, q || {});
    next.customer = { name: fd.get("cname"), contact: fd.get("ccontact"), email: fd.get("cemail"), notes: (q&&q.customer.notes)||"" };
    next.project = Object.assign({}, (q&&q.project)||{}, { typeName: fd.get("ptype"), perimeter: Number(fd.get("pper")||0) });
    next.items = items; next.subtotal = subtotal; next.status = fd.get("status");
    BFS.saveQuote(next); render();
  };
}
function quoteDetail(ref) {
  const q = BFS.quote(ref);
  if (!q) return shell("Missing", `<div class="m-card"><p class="text-muted mb-0">Quote not found.</p></div>`);
  const items = q.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>$${BFS.money(i.total)}</td></tr>`).join("");
  const extra = q.invoiceRef
    ? `<a class="m-btn m-btn--ghost" href="#/invoice/${q.invoiceRef}">Open invoice</a>`
    : `<button class="m-btn m-btn--primary" id="conv">Convert to invoice</button>`;
  return shell(q.ref, mCard("Quotation", `${esc(q.customer.name)} · ${esc(q.customer.contact)} · ${esc(q.project.typeName)} · ${q.project.perimeter} m · ${q.project.height} m`,
    tbl(th(["Item","Qty","Amount"]), items) +
    `<p class="mt-3 mb-0">Subtotal $${BFS.money(q.subtotal)} · VAT $${BFS.money(q.vat)} · <strong>$${BFS.money(q.total)}</strong></p>
     <div class="d-flex gap-2 mt-3">${extra}<a class="m-btn m-btn--ghost" href="../quote?ref=${q.ref}" target="_blank">Public view</a></div>`));
}
function convertQuote(ref) {
  try {
    const inv = BFS.quoteToInvoice(ref);
    location.hash = "#/invoice/" + inv.ref;
    render();
  } catch (e) { alert(e.message); }
}

/* ---------- invoices ---------- */
function invoiceStatusBadge(i) {
  const map = { unpaid:"bg-warning", paid:"bg-success", overdue:"bg-danger", cancelled:"bg-secondary" };
  return badge(i.status, map[i.status] || "bg-warning");
}
function invoices() {
  const rows = BFS.invoices().map(i => `<tr>
    <td><a href="#/invoice/${i.ref}">${i.ref}</a></td>
    <td><strong>${esc(i.customer.name)}</strong></td>
    <td>$${BFS.money(i.total)}</td>
    <td>${invoiceStatusBadge(i)}</td>
    <td class="text-muted small">${i.tracking || "—"}</td>
    <td class="text-end">
      ${i.status!=="paid"?`<button class="btn btn-sm btn-outline-success" data-pay="${i.id}">Mark paid</button>`:""}
      <button class="btn btn-sm btn-outline-secondary" title="Edit" data-iedit="${i.ref}"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-sm btn-outline-secondary" title="Send" data-isend="${i.ref}"><i class="fa-solid fa-paper-plane"></i></button>
      <button class="btn btn-sm btn-outline-danger" title="Delete" data-idel="${i.ref}"><i class="fa-solid fa-trash"></i></button>
    </td>
  </tr>`).join("");
  const expRows = BFS.invoices().map(i => [i.ref, i.customer.name, i.total, i.status, i.tracking||"", i.createdAt?new Date(i.createdAt).toLocaleDateString():""]);
  regExport("invoices", { filename:"invoices", title:"Invoices", headers:["Ref","Client","Total","Status","Tracking","Date"], rows:expRows, subtitle:"Barrier Builders invoices" });
  return shell("Invoices", mCard("Invoices","All customer invoices", `<div id="exp-invoices">${tbl(th(["Ref","Client","Total","Status","Tracking",""]), rows || `<tr><td colspan="6" class="text-muted">No invoices yet.</td></tr>`)}</div>`,
    `<div class="d-flex gap-2 flex-wrap">${importBtn(".csv,.xlsx", "invoices")}<button class="m-btn m-btn--ghost" id="createI"><i class="fa-solid fa-plus"></i> Create</button>${exportMenu("invoices")}</div>`) + `<div id="editor" style="margin-top:16px"></div>`);
}
function invoiceForm(i) {
  i = i || { customer:{name:"",contact:"",email:""}, project:{typeName:"",perimeter:0}, items:[], subtotal:0, vat:0, total:0, status:"unpaid", dueAt:new Date(Date.now()+14*864e5).toISOString() };
  const items = (i.items||[]).map((it,idx)=>`<tr><td><input class="form-control form-control-sm" name="in${idx}" value="${esc(it.name)}"></td><td><input class="form-control form-control-sm" name="iq${idx}" type="number" value="${it.qtyNum??it.qty??1}" style="width:80px"></td><td><input class="form-control form-control-sm" name="ip${idx}" type="number" step="0.01" value="${it.unitPrice??it.total??0}" style="width:100px"></td></tr>`).join("");
  return `<section class="m-card"><header class="m-card__header"><div><h2 class="m-card__title">${i.ref?"Edit":"Create"} invoice</h2></div></header>
  <form id="inf">
    <div class="row g-3">
      <div class="col-md-4"><label class="form-label">Client name</label><input name="cname" class="form-control" value="${esc(i.customer.name)}" required></div>
      <div class="col-md-4"><label class="form-label">Contact</label><input name="ccontact" class="form-control" value="${esc(i.customer.contact)}"></div>
      <div class="col-md-4"><label class="form-label">Status</label><select name="status" class="form-control">${["unpaid","paid","overdue","cancelled"].map(s=>`<option ${i.status===s?"selected":""}>${s}</option>`).join("")}</select></div>
      <div class="col-md-4"><label class="form-label">Due date</label><input name="due" type="date" class="form-control" value="${i.dueAt?i.dueAt.slice(0,10):""}"></div>
    </div>
    <div class="mt-3"><label class="form-label">Line items</label>
      <div class="table-responsive"><table class="table table-sm"><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th></tr></thead><tbody id="iitems">${items || `<tr><td><input class="form-control form-control-sm" name="in0"></td><td><input class="form-control form-control-sm" name="iq0" type="number" value="1" style="width:80px"></td><td><input class="form-control form-control-sm" name="ip0" type="number" step="0.01" value="0" style="width:100px"></td></tr>`}</tbody></table></div>
      <button type="button" class="btn btn-sm btn-outline-secondary" id="addItem">+ Add item</button>
    </div>
    <div class="d-flex gap-2 mt-3"><button class="m-btn m-btn--primary" type="submit">Save</button><button class="m-btn m-btn--ghost" type="button" id="cancel">Cancel</button></div>
  </form></section>`;
}
function bindInvoices() {
  document.querySelectorAll("[data-pay]").forEach(b => b.onclick = () => {
    const inv = BFS.invoice(b.dataset.pay); inv.status = "paid"; inv.paid = inv.total; BFS.saveInvoice(inv);
    const o = BFS.order(inv.tracking || inv.ref); if (o && o.status === "pending") BFS.advanceOrder(o.tracking);
    render();
  });
  document.querySelectorAll("[data-iedit]").forEach(b => b.onclick = () => openInvoice(BFS.invoice(b.dataset.iedit)));
  document.querySelectorAll("[data-isend]").forEach(b => b.onclick = () => { const i=BFS.invoice(b.dataset.isend); i.status = i.status==="unpaid"?"sent":i.status; BFS.saveInvoice(i); render(); });
  document.querySelectorAll("[data-idel]").forEach(b => b.onclick = () => { if(confirm("Delete this invoice?")){ BFS.deleteInvoice(b.dataset.idel); render(); } });
  const ci = document.getElementById("createI");
  if (ci) ci.onclick = () => openInvoice(null);
}
function openInvoice(i) {
  const box = document.getElementById("editor");
  if (!box) return;
  showEditor(invoiceForm(i));
  const cancelBtn = box.querySelector("#cancel");
  const form = box.querySelector("#inf");
  const itemsBody = box.querySelector("#iitems");
  if (cancelBtn) cancelBtn.onclick = () => { box.innerHTML = ""; };
  const addItem = box.querySelector("#addItem");
  let idx = (i&&i.items?i.items.length:1);
  if (addItem && itemsBody) addItem.onclick = () => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><input class="form-control form-control-sm" name="in${idx}"></td><td><input class="form-control form-control-sm" name="iq${idx}" type="number" value="1" style="width:80px"></td><td><input class="form-control form-control-sm" name="ip${idx}" type="number" step="0.01" value="0" style="width:100px"></td>`;
    itemsBody.appendChild(tr); idx++;
  };
  if (form) form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form);
    const items = [];
    for (let k=0; k<idx+2; k++) {
      const name = fd.get("in"+k); if (!name) continue;
      const qty = Number(fd.get("iq"+k)||1); const price = Number(fd.get("ip"+k)||0);
      items.push({ name, qty: qty+"", qtyNum: qty, unitPrice: price, total: Math.round(qty*price*100)/100 });
    }
    const subtotal = items.reduce((s,x)=>s+x.total,0);
    const tax = BFS.vatOn(subtotal);
    const next = Object.assign({}, i || {});
    next.customer = { name: fd.get("cname"), contact: fd.get("ccontact"), email: (i&&i.customer.email)||"", notes: "" };
    next.project = Object.assign({}, (i&&i.project)||{}, { typeName: (i&&i.project.typeName)||"Invoice" });
    next.items = items; next.subtotal = tax.total - tax.vat; next.vat = tax.vat; next.total = tax.total;
    next.status = fd.get("status"); next.dueAt = fd.get("due") ? new Date(fd.get("due")).toISOString() : next.dueAt;
    if (!next.id) { next.id = BFS.uid("i"); next.ref = BFS.nextRef("invoice"); next.createdAt = new Date().toISOString(); next.paid = next.status==="paid"?next.total:0; }
    BFS.saveInvoice(next); render();
  };
}
function invoiceDetail(ref) {
  const inv = BFS.invoice(ref);
  if (!inv) return shell("Missing", `<div class="m-card"><p class="text-muted mb-0">Invoice not found.</p></div>`);
  return shell(inv.ref, mCard("Invoice", `From quote ${inv.quoteRef||"—"} · Due ${inv.dueAt?new Date(inv.dueAt).toLocaleDateString():"—"}`,
    `<p class="mb-2">${invoiceStatusBadge(inv)} <strong class="ms-2">$${BFS.money(inv.total)}</strong> inc VAT</p>
     <div class="d-flex gap-2 flex-wrap">
       <a class="m-btn m-btn--primary" href="../invoice?ref=${inv.ref}" target="_blank">Print invoice</a>
       ${inv.tracking ? `<a class="m-btn m-btn--ghost" href="../track?code=${inv.tracking}" target="_blank">Track ${inv.tracking}</a>` : ""}
       ${inv.status!=="paid" ? `<button class="m-btn m-btn--ghost" id="pay">Mark paid</button>` : ""}
     </div>`));
}

/* ---------- orders ---------- */
function orders() {
  const rows = BFS.orders().map(o => `<tr>
    <td><strong>${o.tracking}</strong></td><td>${esc(o.customer.name)}</td>
    <td>${badge(o.status, o.status==="complete"?"bg-success":o.status==="cancelled"?"bg-dark":"bg-warning")}</td>
    <td class="text-muted small">${o.invoiceRef}</td>
    <td class="text-end">
      ${o.status!=="complete"&&o.status!=="cancelled"?`<button class="btn btn-sm btn-outline-primary" data-adv="${o.tracking}">Advance</button>`:`${badge("Done","bg-success")}`}
      <button class="btn btn-sm btn-outline-secondary" title="Edit notes" data-oedit="${o.tracking}"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-sm btn-outline-danger" title="Delete" data-odel="${o.tracking}"><i class="fa-solid fa-trash"></i></button>
    </td>
  </tr>`).join("");
  const expRows = BFS.orders().map(o => [o.tracking, o.customer.name, o.status, o.invoiceRef||"", o.createdAt?new Date(o.createdAt).toLocaleDateString():""]);
  regExport("orders", { filename:"orders", title:"Orders", headers:["Tracking","Client","Status","Invoice","Date"], rows:expRows, subtitle:"Barrier Builders orders" });
  return shell("Orders", mCard("Orders","Delivery pipeline", `<div id="exp-orders">${tbl(th(["Tracking","Client","Status","Invoice",""]), rows || `<tr><td colspan="5" class="text-muted">No orders yet.</td></tr>`)}</div>`, exportMenu("orders")));
}
function bindOrders() {
  document.querySelectorAll("[data-adv]").forEach(b => b.onclick = () => { BFS.advanceOrder(b.dataset.adv); render(); });
  document.querySelectorAll("[data-oedit]").forEach(b => b.onclick = () => {
    const o = BFS.order(b.dataset.oedit);
    const notes = prompt("Order notes:", o.notes || "");
    if (notes !== null) { o.notes = notes; BFS.saveOrder(o); render(); }
  });
  document.querySelectorAll("[data-odel]").forEach(b => b.onclick = () => { if(confirm("Delete this order?")){ BFS.deleteOrder(b.dataset.odel); render(); } });
}

/* ---------- gallery ---------- */
function gallery() {
  const cards = BFS.gallery().map(g => `<div class="d-flex gap-3 align-items-center py-3 border-bottom">
    <img src="${BFS.asset(g.image)}" alt="" width="96" height="72" style="object-fit:cover;border-radius:8px">
    <div style="flex:1"><strong>${esc(g.title)}</strong><div class="text-muted small">${esc(g.location)} · ${esc(g.type)} · ${g.year}</div></div>
    <div class="d-flex gap-2">
      <button class="btn btn-sm btn-outline-secondary" data-edit="${g.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <label class="btn btn-sm btn-outline-primary" title="Replace image" style="cursor:pointer;margin:0"><i class="fa-solid fa-image"></i><input type="file" accept="image/*" data-replace="${g.id}" style="display:none"></label>
      <button class="btn btn-sm btn-outline-danger" data-del="${g.id}" title="Remove"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`).join("");
  return shell("Gallery", mCard("Gallery","Project photos — add, edit and replace images", cards || `<p class="text-muted mb-0">No photos yet.</p>`, `<button class="m-btn m-btn--primary" id="addG"><i class="fa-solid fa-plus"></i> Add photo</button>`) + `<div id="editor" style="margin-top:16px"></div>`);
}
function galleryForm(g) {
  g = g || {};
  const uid = "gimg_" + (g.id || "new");
  return `<form id="gform" class="m-card" style="padding:18px">
    <input type="hidden" name="_id" value="${esc(g.id||"")}">
    <h3 class="m-card__title" style="margin-bottom:12px">${g.id ? "Edit photo" : "Add photo"}</h3>
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Caption</label><input name="title" class="form-control" value="${esc(g.title||"")}" required></div>
      <div class="col-md-3"><label class="form-label">Location</label><input name="location" class="form-control" value="${esc(g.location||"")}"></div>
      <div class="col-md-3"><label class="form-label">Type</label><input name="type" class="form-control" value="${esc(g.type||"")}"></div>
      <div class="col-md-3"><label class="form-label">Year</label><input name="year" type="number" class="form-control" value="${g.year||new Date().getFullYear()}"></div>
      <div class="col-12">
        <label class="form-label">Image</label>
        <div class="d-flex gap-2 align-items-start flex-wrap">
          <input name="image" type="text" class="form-control" style="max-width:420px" value="${esc(g.image||"")}" placeholder="assets/img/... or assets/uploads/...">
          <label class="m-btn m-btn--ghost" style="cursor:pointer;white-space:nowrap"><i class="fa-solid fa-upload"></i> Upload<input type="file" accept="image/*" style="display:none" id="${uid}_file"></label>
        </div>
        <div id="${uid}_prev" style="margin-top:8px">${g.image ? `<img src="${BFS.asset(g.image)}" style="max-width:220px;border-radius:8px;border:1px solid #e4e7ec">` : `<span class="text-muted small">No image</span>`}</div>
      </div>
    </div>
    <div class="d-flex gap-2 mt-3">
      <button class="m-btn m-btn--primary" type="submit"><i class="fa-solid fa-check"></i> Save</button>
      <button class="m-btn m-btn--ghost" type="button" id="gcancel">Cancel</button>
    </div>
  </form>`;
}
function bindGallery() {
  const ed = document.getElementById("editor");
  const openForm = g => { if (ed) { ed.innerHTML = galleryForm(g); ed.scrollIntoView({ behavior: "smooth", block: "start" }); } };
  document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openForm(BFS.gallery().find(x => x.id === b.dataset.edit)));
  // Replace image: hidden file inputs with data-replace
  document.querySelectorAll('input[data-replace]').forEach(inp => inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    const id = inp.dataset.replace;
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("../api/upload.php", { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "upload failed");
      const item = BFS.gallery().find(x => x.id === id);
      if (item) { item.image = j.path; BFS.saveGallery(item); notify("Image replaced."); render(); }
    } catch (err) { alert("Replace failed: " + err.message); }
  });
  const add = document.getElementById("addG");
  if (add) add.onclick = () => openForm(null);
  const cancel = document.getElementById("gcancel");
  if (cancel) cancel.onclick = () => { ed.innerHTML = ""; };
  // upload handler (find the file input inside editor)
  const upInp = ed.querySelector('input[type="file"]');
  if (upInp) upInp.onchange = async () => {
    const file = upInp.files[0]; if (!file) return;
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("../api/upload.php", { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "upload failed");
      const imgInp = ed.querySelector('input[name="image"]');
      if (imgInp) imgInp.value = j.path;
      const prev = ed.querySelector('[id$="_prev"]');
      if (prev) prev.innerHTML = `<img src="${BFS.asset(j.path)}" style="max-width:220px;border-radius:8px;border:1px solid #e4e7ec">`;
      notify("Image uploaded.");
    } catch (err) { alert("Upload failed: " + err.message); }
  };
  const form = document.getElementById("gform");
  if (form) form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form);
    const hid = form.querySelector('input[name="_id"]');
    const item = {
      id: hid && hid.value ? hid.value : undefined,
      title: fd.get("title"), location: fd.get("location"), type: fd.get("type"),
      year: Number(fd.get("year")) || new Date().getFullYear(), image: fd.get("image")
    };
    BFS.saveGallery(item);
    notify("Photo saved.");
    render();
  };
}

/* ---------- messages ---------- */
function replyLinks(contact, name) {
  const c = (contact || "").trim();
  if (!c) return `<span class="text-muted small">—</span>`;
  const isEmail = c.includes("@");
  const btns = [];
  if (isEmail) {
    const subject = encodeURIComponent("Re: your message to Barrier Builders");
    btns.push(`<a class="btn btn-sm btn-outline-primary" href="mailto:${encodeURIComponent(c)}?subject=${subject}" title="Reply by email"><i class="fa-solid fa-envelope"></i></a>`);
  } else {
    let digits = c.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "263" + digits.slice(1);
    if (digits.length >= 9) {
      const text = encodeURIComponent(`Hi ${name || "there"}, thanks for contacting Barrier Builders. `);
      btns.push(`<a class="btn btn-sm btn-outline-success" href="https://wa.me/${digits}?text=${text}" target="_blank" rel="noopener" title="Reply on WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>`);
    }
    btns.push(`<a class="btn btn-sm btn-outline-secondary" href="mailto:?subject=${encodeURIComponent("Re: your message to Barrier Builders")}" title="Copy email"><i class="fa-solid fa-at"></i></a>`);
  }
  return `<div class="d-flex gap-2 justify-content-end">${btns.join("")}</div>`;
}
function messages() {
  const contacts = BFS.contacts().slice().reverse();
  const leads = BFS.leads().filter(l => (l.type||"") !== "quote" && (l.type||"") !== "estimate").slice(0,20);
  const contactRows = contacts.map(c => `<tr>
    <td class="text-muted small">${new Date(c.at).toLocaleString()}</td><td><strong>${esc(c.name)}</strong></td><td class="text-muted small">${esc(c.contact)}</td><td>${esc(c.message)}</td>
    <td class="text-end">${replyLinks(c.contact, c.name)}</td>
  </tr>`).join("");
  const leadRows = leads.map(l => `<tr>
    <td class="text-muted small">${l.at?new Date(l.at).toLocaleString():"—"}</td><td><strong>${esc(l.name||"Website lead")}</strong></td><td class="text-muted small">${esc(l.contact||"")}</td><td>${esc(l.prompt||l.notes||l.title||"")}</td>
    <td class="text-end">${replyLinks(l.contact, l.name)}</td>
  </tr>`).join("");
  return shell("Messages", `
    ${mCard("Contact messages","Submissions from the contact form", tbl(th(["When","Name","Contact","Message",""]), contactRows || `<tr><td colspan="5" class="text-muted">No messages yet.</td></tr>`))}
    ${mCard("Enquiries & requests","Leads and other communication", tbl(th(["When","Name","Contact","Details",""]), leadRows || `<tr><td colspan="5" class="text-muted">No enquiries yet.</td></tr>`))}`);
}

/* ---------- clients ---------- */
function clients() {
  const rows = BFS.clients().map(c => {
    const orders = BFS.clientOrders(c).length;
    const k = c.kyc;
    const active = c.active !== false;
    const kycBadge = !k ? badge("No KYC","bg-secondary")
      : badge(k.status, k.status==="verified"?"bg-success":k.status==="rejected"?"bg-danger":"bg-warning");
    return `<tr>
      <td><strong>${esc(c.name)}</strong><div class="text-muted small">${esc(c.email)}</div></td>
      <td class="text-muted small">${esc(c.phone || "—")}</td>
      <td>${orders}</td>
      <td>${kycBadge}${k ? `<div class="text-muted small">${esc(k.idType)} ${esc(k.idNumber||"")}</div>` : ""}</td>
      <td>${badge(active?"Active":"Disabled", active?"bg-success":"bg-secondary")}</td>
      <td class="text-end">
        ${k && k.status === "pending" ? `<button class="btn btn-sm btn-outline-success" data-kyc-ok="${c.id}">Verify</button><button class="btn btn-sm btn-outline-danger" data-kyc-no="${c.id}">Reject</button>` : ""}
        <button class="btn btn-sm btn-outline-secondary" title="Edit" data-cedit="${c.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-outline-secondary" title="${active?"Deactivate":"Activate"}" data-cact="${c.id}"><i class="fa-solid ${active?"fa-user-slash":"fa-user-check"}"></i></button>
        <button class="btn btn-sm btn-outline-danger" title="Delete" data-cdel="${c.id}"><i class="fa-solid fa-trash"></i></button>
      </td></tr>`;
  }).join("") || `<tr><td colspan="6" class="text-muted">No client accounts yet.</td></tr>`;
  const expRows = BFS.clients().map(c => [c.name, c.email, c.phone||"", c.active!==false?"Active":"Disabled", c.kyc?c.kyc.status:"", c.createdAt?new Date(c.createdAt).toLocaleDateString():""]);
  regExport("clients", { filename:"clients", title:"Clients", headers:["Name","Email","Phone","Status","KYC","Joined"], rows:expRows, subtitle:"Barrier Builders clients" });
  return shell("Clients", mCard("Clients","Portal accounts & KYC", `<div id="exp-clients">${tbl(th(["Client","Phone","Orders","KYC","Status",""]), rows)}</div>`,
    `<div class="d-flex gap-2 flex-wrap">${importBtn(".csv,.xlsx", "clients")}<button class="m-btn m-btn--primary" id="addC"><i class="fa-solid fa-plus"></i> Add client</button>${exportMenu("clients")}</div>`) + `<div id="editor" style="margin-top:16px"></div>`);
}
function clientForm(c) {
  c = c || { name:"", email:"", phone:"", password:"", active:true };
  return `<section class="m-card"><header class="m-card__header"><div><h2 class="m-card__title">${c.id?"Edit":"New"} client account</h2></div></header>
  <form id="cf">
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Full name</label><input name="name" class="form-control" value="${esc(c.name)}" required></div>
      <div class="col-md-6"><label class="form-label">Email (login)</label><input name="email" type="email" class="form-control" value="${esc(c.email)}" ${c.id?"disabled":""} required></div>
      <div class="col-md-6"><label class="form-label">Phone / WhatsApp</label><input name="phone" class="form-control" value="${esc(c.phone||"")}"></div>
      <div class="col-md-6"><label class="form-label">${c.id?"New password (blank to keep)":"Password"}</label><input name="password" type="text" class="form-control" ${c.id?"":"required minlength=\"6\""}></div>
    </div>
    <div class="form-check mt-3"><input class="form-check-input" type="checkbox" name="active" id="cf-act" ${c.active!==false?"checked":""}><label class="form-check-label" for="cf-act">Account active</label></div>
    <div class="d-flex gap-2 mt-3"><button class="m-btn m-btn--primary" type="submit">Save</button><button class="m-btn m-btn--ghost" type="button" id="cancel">Cancel</button></div>
  </form></section>`;
}
function bindClients() {
  document.querySelectorAll("[data-kyc-ok]").forEach(b => b.onclick = () => { BFS.verifyClientKyc(b.dataset.kycOk, true); render(); });
  document.querySelectorAll("[data-kyc-no]").forEach(b => b.onclick = () => { BFS.verifyClientKyc(b.dataset.kycNo, false); render(); });
  document.querySelectorAll("[data-cedit]").forEach(b => b.onclick = () => openClient(BFS.client(b.dataset.cedit)));
  document.querySelectorAll("[data-cact]").forEach(b => b.onclick = () => { const c=BFS.client(b.dataset.cact); BFS.setClientActive(c.id, c.active===false); render(); });
  document.querySelectorAll("[data-cdel]").forEach(b => b.onclick = () => { if(confirm("Delete this client account?")){ BFS.deleteClient(b.dataset.cdel); render(); } });
  const ac = document.getElementById("addC");
  if (ac) ac.onclick = () => openClient(null);
}
function openClient(c) {
  const box = document.getElementById("editor");
  if (!box) return;
  showEditor(clientForm(c));
  const cancelBtn = box.querySelector("#cancel");
  const form = box.querySelector("#cf");
  if (cancelBtn) cancelBtn.onclick = () => { box.innerHTML = ""; };
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      if (c) {
        c.name = fd.get("name"); c.phone = fd.get("phone") || ""; c.active = form.querySelector('[name="active"]').checked;
        if (fd.get("password")) c.password = btoa(unescape(encodeURIComponent(fd.get("password"))));
        BFS.saveClient(c);
      } else {
        await BFS.registerClient({ name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), password: fd.get("password") });
        const nc = BFS.clientByEmail(fd.get("email")); if (nc) { nc.active = form.querySelector('[name="active"]').checked; BFS.saveClient(nc); }
      }
      if (!(await awaitSync())) return;
      render();
    } catch (err) { alert(err.message); }
  };
}

/* ---------- admins (server-side accounts & roles) ---------- */
function admins() {
  const d = ADMIN_DATA;
  if (!d) {
    loadAdminData().then(() => render()).catch(() => {});
    return shell("Admins", mCard("Admins", "Loading accounts…", `<div class="text-muted">Fetching from server…</div>`));
  }
  const sess = JSON.parse(sessionStorage.getItem("bfs_auth") || "null");
  const roleName = rid => { const r = (d.roles || []).find(x => x.id === rid); return r ? r.name : (rid || "—"); };
  const rows = (d.admins || []).map(a => {
    const owner = a.protected || BFS.isOwnerAdmin && BFS.isOwnerAdmin(a);
    const label = (a.name && String(a.name).toLowerCase() !== "yard admin") ? a.name : (a.username || "Admin");
    return `<tr>
    <td><strong>${esc(label)}</strong>${owner ? " " + badge("owner","bg-dark") : ""}${sess && String(sess.id) === String(a.id) ? " " + badge("you","bg-success") : ""}<div class="text-muted small">${esc(a.username || "")}${a.email ? " · " + esc(a.email) : ""}</div></td>
    <td class="text-muted small">${roleName(a.role_id)}</td>
    <td class="text-muted small">${a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-GB") : "—"}</td>
    <td>${badge(a.active!==false?"Active":"Disabled", a.active!==false?"bg-success":"bg-secondary")}</td>
    <td class="text-end">
      <button type="button" class="btn btn-sm btn-outline-secondary" title="Edit" data-aedit="${esc(a.id)}"><i class="fa-solid fa-pen"></i></button>
      ${owner ? "" : `<button type="button" class="btn btn-sm btn-outline-secondary" title="${a.active!==false?"Deactivate":"Activate"}" data-aact="${esc(a.id)}" data-active="${a.active!==false?"0":"1"}"><i class="fa-solid ${a.active!==false?"fa-user-slash":"fa-user-check"}"></i></button><button type="button" class="btn btn-sm btn-outline-danger" title="Delete" data-adel="${esc(a.id)}"><i class="fa-solid fa-trash"></i></button>`}
    </td></tr>`;
  }).join("") || `<tr><td colspan="5" class="text-muted">No admin accounts.</td></tr>`;
  const expRows = (d.admins || []).map(a => [a.username, a.email||"", roleName(a.role_id), a.active!==false?"Active":"Disabled", a.createdAt?new Date(a.createdAt).toLocaleDateString():""]);
  regExport("admins", { filename:"admins", title:"Admins", headers:["Username","Email","Role","Status","Created"], rows:expRows, subtitle:"Barrier Builders admins" });
  return shell("Admins", mCard("Admins","Admin accounts & assigned roles", `<div id="exp-admins">${tbl(th(["Admin","Role","Created","Status",""]), rows)}</div>`,
    `<div class="d-flex gap-2 flex-wrap"><button class="m-btn m-btn--primary" id="addA"><i class="fa-solid fa-plus"></i> Add admin</button>${exportMenu("admins")}</div>`) + `<div id="editor" style="margin-top:16px"></div>`);
}
function adminForm(a) {
  a = a || { username:"", email:"", password:"", active:true, role_id:"role-admin" };
  const roles = (ADMIN_DATA && ADMIN_DATA.roles) || [];
  const roleOpts = roles.map(r => `<option value="${esc(r.id)}" ${String(a.role_id||"role-admin")===r.id?"selected":""}>${esc(r.name)}</option>`).join("");
  return `<section class="m-card"><header class="m-card__header"><div><h2 class="m-card__title">${a.id?"Edit":"New"} admin account</h2></div></header>
  <form id="af2">
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Username</label><input name="username" class="form-control" value="${esc(a.username)}" required></div>
      <div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" value="${esc(a.email||"")}"></div>
      <div class="col-md-6"><label class="form-label">Role</label><select name="role_id" class="form-control">${roleOpts}</select></div>
      <div class="col-md-6"><label class="form-label">${a.id?"New password (blank to keep)":"Password"}</label><input name="password" type="text" class="form-control" ${a.id?"":"required minlength=\"6\""}></div>
    </div>
    <div class="form-check mt-3"><input class="form-check-input" type="checkbox" name="active" id="af-act" ${a.active!==false?"checked":""}><label class="form-check-label" for="af-act">Account active</label></div>
    <div class="d-flex gap-2 mt-3"><button class="m-btn m-btn--primary" type="submit">Save</button><button class="m-btn m-btn--ghost" type="button" id="cancel">Cancel</button></div>
  </form></section>`;
}
function bindAdmins() {
  const findAdmin = id => (ADMIN_DATA && ADMIN_DATA.admins || []).find(x => String(x.id) === String(id));
  document.querySelectorAll("[data-aedit]").forEach(b => b.onclick = () => { const a = findAdmin(b.getAttribute("data-aedit")); if (a) openAdmin(a); });
  document.querySelectorAll("[data-aact]").forEach(b => b.onclick = async () => {
    const id = b.getAttribute("data-aact"); const active = b.getAttribute("data-active") === "1";
    try { await adminsApi({ action: "setactive", id, active }); await loadAdminData(true); render(); }
    catch (err) { alert("Update failed: " + err.message); }
  });
  const aa = document.getElementById("addA");
  if (aa) aa.onclick = () => openAdmin(null);
}

if (!window.__bfsAdminDeleteBound) {
  window.__bfsAdminDeleteBound = true;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-adel]");
    if (!btn || !document.getElementById("app") || !document.getElementById("app").contains(btn)) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.getAttribute("data-adel");
    const admin = (ADMIN_DATA && ADMIN_DATA.admins || []).find(x => String(x.id) === String(id));
    if (admin && admin.protected) { alert("The owner admin profile cannot be deleted."); return; }
    const label = admin ? (admin.name || admin.username || admin.email || "this admin") : "this admin";
    if (!confirm("Delete " + label + "? They will no longer be able to sign in.")) return;
    (async () => {
      try {
        await adminsApi({ action: "delete", id });
        await loadAdminData(true);
        render();
      } catch (err) { alert("Delete failed: " + err.message); }
    })();
  }, true);
}
function openAdmin(a) {
  const box = document.getElementById("editor");
  if (!box) return;
  showEditor(adminForm(a));
  const cancelBtn = box.querySelector("#cancel");
  const form = box.querySelector("#af2");
  if (cancelBtn) cancelBtn.onclick = () => { box.innerHTML = ""; };
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const un = fd.get("username").trim();
    const pw = (fd.get("password") || "").trim();
    const list = (ADMIN_DATA && ADMIN_DATA.admins) || [];
    if (list.some(x => x.id !== (a && a.id) && (x.username || "").toLowerCase() === un.toLowerCase())) { alert("That username is taken."); return; }
    const payload = a
      ? { action: "update", id: a.id, username: un, email: fd.get("email").trim(), active: form.querySelector('[name="active"]').checked, role_id: fd.get("role_id") }
      : { action: "create", username: un, email: fd.get("email").trim(), password: pw, active: form.querySelector('[name="active"]').checked, role_id: fd.get("role_id") };
    if (pw) payload.password = pw;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await adminsApi(payload);       // server confirms before we close
      await loadAdminData(true);
      render();                        // editor closes only on success
    } catch (err) {
      alert("Save failed: " + err.message); // form stays open
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };
}

/* ---------- roles ---------- */
function roles() {
  const d = ADMIN_DATA;
  if (!d) {
    loadAdminData().then(() => render()).catch(() => {});
    return shell("Roles", mCard("Roles", "Loading…", `<div class="text-muted">Fetching from server…</div>`));
  }
  const permNames = d.permissions || [];
  const rows = (d.roles || []).map(r => {
    const members = (d.admins || []).filter(a => a.role_id === r.id).length;
    const desc = r.permissions.includes("*") ? "All permissions" : (r.permissions || []).map(p => PERM_LABELS[p] || p).join(", ") || "No permissions";
    return `<tr>
      <td><strong>${esc(r.name)}</strong>${r.builtin ? " " + badge("built-in","bg-dark") : ""}</td>
      <td class="text-muted small">${esc(desc)}</td>
      <td class="text-muted small">${members} admin${members===1?"":"s"}</td>
      <td class="text-end">
        ${r.builtin ? "" : `<button type="button" class="btn btn-sm btn-outline-secondary" title="Edit" data-redit="${esc(r.id)}"><i class="fa-solid fa-pen"></i></button><button type="button" class="btn btn-sm btn-outline-danger" title="Delete" data-rdel="${esc(r.id)}"><i class="fa-solid fa-trash"></i></button>`}
      </td></tr>`;
  }).join("");
  return shell("Roles", mCard("Roles","Permission sets assigned to admin accounts", `<div id="exp-roles">${tbl(th(["Role","Permissions","Members",""]), rows)}</div>`,
    canPerm("roles.manage") ? `<button class="m-btn m-btn--primary" id="addR"><i class="fa-solid fa-plus"></i> New role</button>` : "") + `<div id="editor" style="margin-top:16px"></div>`);
}
function roleForm(r) {
  r = r || { name: "", permissions: [] };
  const d = ADMIN_DATA || { permissions: [] };
  const boxes = (d.permissions || []).map(p =>
    `<div class="form-check"><input class="form-check-input" type="checkbox" name="perm" value="${esc(p)}" id="rp_${esc(p)}" ${ (r.permissions||[]).includes(p) ? "checked" : ""}><label class="form-check-label" for="rp_${esc(p)}">${esc(PERM_LABELS[p] || p)}</label></div>`
  ).join("");
  return `<section class="m-card"><header class="m-card__header"><div><h2 class="m-card__title">${r.id?"Edit":"New"} role</h2></div></header>
  <form id="rf">
    <div class="mb-3" style="max-width:420px"><label class="form-label">Role name</label><input name="name" class="form-control" value="${esc(r.name)}" required></div>
    <label class="form-label">Permissions</label>
    <div class="row g-2 mb-3">${boxes}</div>
    <div class="d-flex gap-2"><button class="m-btn m-btn--primary" type="submit">Save role</button><button class="m-btn m-btn--ghost" type="button" id="cancel">Cancel</button></div>
  </form></section>`;
}
function bindRoles() {
  const addR = document.getElementById("addR");
  if (addR) addR.onclick = () => openRole(null);
  document.querySelectorAll("[data-redit]").forEach(b => b.onclick = () => {
    const r = (ADMIN_DATA.roles || []).find(x => x.id === b.getAttribute("data-redit"));
    if (r) openRole(r);
  });
  document.querySelectorAll("[data-rdel]").forEach(b => b.onclick = async () => {
    const id = b.getAttribute("data-rdel");
    const r = (ADMIN_DATA.roles || []).find(x => x.id === id);
    if (!r || !confirm("Delete role " + r.name + "?")) return;
    try { await adminsApi({ action: "role-delete", id }); await loadAdminData(true); render(); }
    catch (err) { alert("Delete failed: " + err.message); }
  });
}
function openRole(r) {
  const box = document.getElementById("editor");
  if (!box) return;
  showEditor(roleForm(r));
  const cancelBtn = box.querySelector("#cancel");
  const form = box.querySelector("#rf");
  if (cancelBtn) cancelBtn.onclick = () => { box.innerHTML = ""; };
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const permissions = fd.getAll("perm");
    const payload = r
      ? { action: "role-update", id: r.id, name: fd.get("name").trim(), permissions }
      : { action: "role-create", name: fd.get("name").trim(), permissions };
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await adminsApi(payload);
      await loadAdminData(true);
      render();
    } catch (err) { alert("Save failed: " + err.message); }
    finally { if (submitBtn) submitBtn.disabled = false; }
  };
}

/* ---------- settings ---------- */
function settings() {
  const s = BFS.settings();
  const f = (label, inner, cls="col-md-6") => `<div class="${cls}"><label class="form-label">${label}</label>${inner}</div>`;
  const inp = (name, val, type="text") => `<input name="${name}" type="${type}" class="form-control" value="${esc(val ?? "")}">`;
  return shell("Settings", `
  <section class="m-card" style="margin-bottom:16px"><header class="m-card__header"><div><h2 class="m-card__title">Business details</h2></div></header>
  <form id="sf">
    <div class="row g-3">
      ${f("Company", inp("company", s.company))}
      ${f("Tagline", inp("tagline", s.tagline))}
      ${f("Email", inp("email", s.email, "email"))}
      ${f("Phone", inp("phone", s.phone))}
      ${f("WhatsApp (263…)", inp("whatsapp", s.whatsapp))}
      ${f("Admin username", inp("adminUser", s.adminUser))}
      ${f("Admin password", inp("adminPass", s.adminPass, "password"))}
      ${f("VAT rate", inp("vatRate", s.vatRate, "number"))}
      ${f("Address", inp("address", s.address), "col-12")}
      ${f("Hours", inp("hours", s.hours), "col-12")}
      <div class="col-12"><label class="form-label">Bank details</label><textarea name="bank" class="form-control" rows="2">${esc(s.bank||"")}</textarea></div>
    </div>
    <button class="m-btn m-btn--primary mt-3" type="submit">Save settings</button>
  </form></section>
  <section class="m-card"><header class="m-card__header"><div><h2 class="m-card__title">Data</h2><p class="m-card__subtitle">All site data is stored on the server database. Export a backup anytime.</p></div></header>
    <div class="d-flex gap-2 flex-wrap">
      <button class="m-btn m-btn--ghost" id="exp">Export backup (JSON)</button>
    </div>
  </section>`);
}

/* ---------- profile ---------- */
function profile() {
  const me = BFS.adminAuthed();
  if (!me) return shell("Profile", `<div class="m-card"><p class="text-muted mb-0">No admin profile found.</p></div>`);
  const avatar = me.avatar || "";
  return shell("My profile", mCard("Profile","Update your name, username, email and photo", `
    <form id="pf2">
      <div class="d-flex align-items-center gap-3 mb-3">
        ${avatar ? `<img src="${avatar}" alt="" width="72" height="72" style="border-radius:50%;object-fit:cover">` : `<div style="width:72px;height:72px;border-radius:50%;background:#E5F6EE;display:grid;place-items:center;font-size:28px;color:#007243"><i class="fa-solid fa-user"></i></div>`}
        <div><label class="form-label mb-1">Avatar image</label><input type="file" id="avatarFile" accept="image/*" class="form-control" style="max-width:280px"></div>
      </div>
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">Display name</label><input name="name" class="form-control" value="${esc(me.name||me.username)}"></div>
        <div class="col-md-6"><label class="form-label">Username</label><input name="username" class="form-control" value="${esc(me.username)}" required></div>
        <div class="col-md-6"><label class="form-label">Email</label><input name="email" type="email" class="form-control" value="${esc(me.email||"")}"></div>
        <div class="col-md-6"><label class="form-label">New password (blank to keep)</label><input name="password" type="text" class="form-control"></div>
      </div>
      <button class="m-btn m-btn--primary mt-3" type="submit">Save profile</button>
    </form>`));
}
function bindProfile() {
  const af = document.getElementById("avatarFile");
  let avatarData = BFS.adminAuthed() ? BFS.adminAuthed().avatar : "";
  if (af) af.onchange = () => {
    const file = af.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { avatarData = reader.result; };
    reader.readAsDataURL(file);
  };
  const form = document.getElementById("pf2");
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const me = BFS.adminAuthed(); if (!me) return;
    const un = fd.get("username").trim();
    const list = (ADMIN_DATA && ADMIN_DATA.admins) || BFS.admins();
    if (list.some(a => String(a.id) !== String(me.id) && (a.username||"").toLowerCase() === un.toLowerCase())) { alert("That username is taken."); return; }
    const pw = (fd.get("password") || "").trim();
    const payload = { action: "updateprofile", name: fd.get("name") || un, username: un, email: fd.get("email").trim(), avatar: avatarData || undefined };
    if (pw) payload.password = pw;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await adminsApi(payload); // server confirms before we claim success
      const auth = JSON.parse(sessionStorage.getItem("bfs_auth") || "null");
      if (auth) { auth.user = un; auth.name = payload.name; sessionStorage.setItem("bfs_auth", JSON.stringify(auth)); }
      if (window.BFS_SESSION) { window.BFS_SESSION.user = un; window.BFS_SESSION.name = payload.name; }
      alert("Profile saved."); render();
    } catch (err) { alert("Save failed: " + err.message); }
    finally { if (btn) btn.disabled = false; }
  };
}

/* ---------- content (CMS) ---------- */
const CTABS = [
  ["branding", "Branding"], ["homepage", "Homepage"], ["about", "About"],
  ["contact", "Contact"], ["footer", "Footer"], ["rules", "Rules"],
  ["posters", "Posters"], ["seo", "SEO"]
];
const LIST_FIELDS = {};
function listEditor(path, label, items, fields, addLabel) {
  LIST_FIELDS[path] = fields;
  const rows = (items || []).map((it, i) => listRow(path, i, it, fields)).join("");
  return `<div class="mb-3"><label class="form-label"><strong>${label}</strong></label>
    <div class="c-list" data-list="${path}">${rows || `<div class="text-muted small c-list-empty">No items yet.</div>`}</div>
    <button type="button" class="btn btn-sm btn-outline-secondary mt-2" data-list-add="${path}"><i class="fa-solid fa-plus"></i> ${addLabel || "Add item"}</button>
  </div>`;
}
function listRow(path, i, it, fields) {
  it = it || {};
  return `<div class="c-list-row" data-row="${i}" style="border:1px solid #eef0f3;border-radius:8px;padding:10px;margin-bottom:8px">
    <div class="row g-2 align-items-end">
      ${fields.map(f => `<div class="${f.cls || "col-md-3"}"><label class="form-label small mb-1">${f.label}</label>${
        f.area ? `<textarea name="c[${path}.${i}.${f.key}]" class="form-control form-control-sm" rows="2">${esc(it[f.key] ?? "")}</textarea>`
               : `<input name="c[${path}.${i}.${f.key}]" type="${f.type || "text"}" class="form-control form-control-sm" value="${esc(it[f.key] ?? "")}">`
      }</div>`).join("")}
      <div class="col-auto"><button type="button" class="btn btn-sm btn-outline-danger" data-list-del title="Remove"><i class="fa-solid fa-trash"></i></button></div>
    </div>
  </div>`;
}
function reindexList(listEl) {
  listEl.querySelectorAll(".c-list-row").forEach((row, i) => {
    row.dataset.row = i;
    row.querySelectorAll("[name]").forEach(inp => {
      const m = inp.name.match(/c\[([^\]]+)\]/);
      if (!m) return;
      const parts = m[1].split(".");
      parts[parts.length - 2] = i; // list index is the second-to-last segment
      inp.name = "c[" + parts.join(".") + "]";
    });
  });
  const empty = listEl.querySelector(".c-list-empty");
  if (empty && listEl.querySelector(".c-list-row")) empty.remove();
}
function secBranding(c) {
  const b = c.branding || {};
  return `<form class="cform" data-section="branding">
    <div class="row g-3">
      ${cImg("branding.logo", "Logo", b.logo)}
      ${cImg("branding.favicon", "Favicon", b.favicon)}
      ${cInput("branding.footerTagline", "Footer tagline", b.footerTagline, { area: true, rows: 2, cls: "col-12", ai: "Write a one-sentence tagline for Barrier Builders, a fencing supply and installation company in Zimbabwe." })}
    </div>
    <button class="m-btn m-btn--primary mt-3" type="submit"><i class="fa-solid fa-check"></i> Save branding</button>
  </form>`;
}
function secHomepage(c) {
  const h = c.hero || {}, qb = c.quoteBand || {};
  return `<form class="cform" data-section="homepage">
    <h3 class="m-card__title" style="margin-bottom:12px">Hero banner</h3>
    <div class="row g-3">
      ${cImg("hero.image", "Hero background image", h.image)}
      ${cInput("hero.title", "Headline (HTML allowed, e.g. <em>)", h.title, { cls: "col-12", ai: "Write a compelling homepage hero headline for Barrier Builders, a fencing company in Zimbabwe. Keep it short and punchy." })}
      ${cInput("hero.subtitle", "Subheadline", h.subtitle, { area: true, rows: 2, cls: "col-12", ai: "Write a 2-sentence hero subheadline for Barrier Builders fencing company Zimbabwe." })}
      ${cInput("hero.ctaPrimaryLabel", "Primary button label", h.ctaPrimaryLabel)}
      ${cInput("hero.ctaPrimaryHref", "Primary button link", h.ctaPrimaryHref)}
      ${cInput("hero.ctaSecondaryLabel", "Secondary button label", h.ctaSecondaryLabel)}
      ${cInput("hero.ctaSecondaryHref", "Secondary button link", h.ctaSecondaryHref)}
    </div>
    <hr>
    <h3 class="m-card__title" style="margin-bottom:12px">Trust tabs</h3>
    ${listEditor("trustTabs", "Trust tabs (homepage)", c.trustTabs, [
      { key: "title", label: "Title", cls: "col-md-3" }, { key: "subtitle", label: "Subtitle", cls: "col-md-3" }, { key: "href", label: "Link", cls: "col-md-3" }
    ], "Add tab")}
    <hr>
    <h3 class="m-card__title" style="margin-bottom:12px">Feature cards</h3>
    ${listEditor("features", "Feature cards (Why Barrier)", c.features, [
      { key: "num", label: "#", cls: "col-md-1" }, { key: "title", label: "Title", cls: "col-md-4" }, { key: "body", label: "Body", cls: "col-md-6", area: true }
    ], "Add feature")}
    <hr>
    <h3 class="m-card__title" style="margin-bottom:12px">Stats</h3>
    ${listEditor("stats", "Stats row", c.stats, [
      { key: "num", label: "Number", cls: "col-md-2" }, { key: "label", label: "Label", cls: "col-md-4" }
    ], "Add stat")}
    <hr>
    <h3 class="m-card__title" style="margin-bottom:12px">Quote band</h3>
    <div class="row g-3">
      ${cInput("quoteBand.title", "Title", qb.title, { cls: "col-12", ai: "Write a short call-to-action title encouraging visitors to get a fencing quote." })}
      ${cInput("quoteBand.body", "Body", qb.body, { area: true, rows: 2, cls: "col-12" })}
      ${cInput("quoteBand.ctaLabel", "Button label", qb.ctaLabel)}
      ${cInput("quoteBand.ctaHref", "Button link", qb.ctaHref)}
      ${cInput("quoteBand.hint", "Hint text", qb.hint, { cls: "col-12" })}
    </div>
    <button class="m-btn m-btn--primary mt-3" type="submit"><i class="fa-solid fa-check"></i> Save homepage</button>
  </form>`;
}
function secAbout(c) {
  const a = c.about || {};
  return `<form class="cform" data-section="about">
    <div class="row g-3">
      ${cImg("about.heroImage", "Page hero image", a.heroImage)}
      ${cInput("about.heroTitle", "Hero title", a.heroTitle, { cls: "col-12", ai: "Write a short hero title for the About page of Barrier Builders fencing company." })}
      ${cInput("about.heroSub", "Hero subtitle", a.heroSub, { area: true, rows: 2, cls: "col-12" })}
      ${cInput("about.kicker", "Kicker (small label)", a.kicker)}
      ${cInput("about.title", "Section title", a.title, { cls: "col-12" })}
      ${cInput("about.body", "Body", a.body, { area: true, rows: 4, cls: "col-12", ai: "Write an About Us body for Barrier Builders, a fencing supply and installation company in Harare, Zimbabwe. 2-3 sentences." })}
      ${cImg("about.image", "Side image", a.image)}
    </div>
    <hr>
    <h3 class="m-card__title" style="margin-bottom:12px">Bullet points</h3>
    ${listEditor("about.bullets", "Bullets", (a.bullets || []).map(b => ({ b })), [
      { key: "b", label: "Bullet", cls: "col-12", area: true }
    ], "Add bullet")}
    <hr>
    <h3 class="m-card__title" style="margin-bottom:12px">Stats</h3>
    ${listEditor("about.stats", "Stats", a.stats, [
      { key: "num", label: "Number", cls: "col-md-2" }, { key: "label", label: "Label", cls: "col-md-4" }
    ], "Add stat")}
    <button class="m-btn m-btn--primary mt-3" type="submit"><i class="fa-solid fa-check"></i> Save about</button>
  </form>`;
}
function secContact(c) {
  const ct = c.contact || {};
  return `<form class="cform" data-section="contact">
    <div class="row g-3">
      ${cImg("contact.heroImage", "Page hero image", ct.heroImage)}
      ${cInput("contact.heroTitle", "Hero title", ct.heroTitle, { cls: "col-12" })}
      ${cInput("contact.heroSub", "Hero subtitle", ct.heroSub, { area: true, rows: 2, cls: "col-12" })}
      ${cInput("contact.mapNote", "Map / visit note", ct.mapNote, { area: true, rows: 2, cls: "col-12" })}
    </div>
    <div class="alert alert-info mt-3 mb-0"><i class="fa-solid fa-circle-info"></i> Phone, email, WhatsApp, address and hours are managed under <a href="#/settings">Settings</a>.</div>
    <button class="m-btn m-btn--primary mt-3" type="submit"><i class="fa-solid fa-check"></i> Save contact</button>
  </form>`;
}
function secFooter(c) {
  const f = c.footer || {};
  return `<form class="cform" data-section="footer">
    <div class="row g-3">
      ${cInput("footer.brandText", "Brand paragraph (footer)", f.brandText, { area: true, rows: 3, cls: "col-12", ai: "Write a short brand paragraph for the footer of Barrier Builders fencing company Zimbabwe." })}
    </div>
    <button class="m-btn m-btn--primary mt-3" type="submit"><i class="fa-solid fa-check"></i> Save footer</button>
  </form>`;
}
function secRules(c) {
  const r = c.rules || {};
  return `<form class="cform" data-section="rules">
    <div class="row g-3">
      ${cInput("rules.quote", "Quotation terms & conditions", r.quote, { area: true, rows: 6, cls: "col-12", ai: "Write standard quotation terms and conditions for a fencing supply and installation company in Zimbabwe. Include validity period, deposit, and pricing notes." })}
      ${cInput("rules.invoice", "Invoice terms & conditions", r.invoice, { area: true, rows: 6, cls: "col-12", ai: "Write standard invoice payment terms for a fencing company in Zimbabwe. Include payment due, VAT, late payment, and ownership notes." })}
    </div>
    <button class="m-btn m-btn--primary mt-3" type="submit"><i class="fa-solid fa-check"></i> Save rules</button>
  </form>`;
}
function secPosters(c) {
  return `<form class="cform" data-section="posters">
    <p class="text-muted small">Posters are promotional banners shown on the public site. Toggle active to show/hide.</p>
    ${listEditor("posters", "Posters", c.posters, [
      { key: "title", label: "Title", cls: "col-md-3" },
      { key: "body", label: "Body", cls: "col-md-4", area: true },
      { key: "ctaLabel", label: "Button", cls: "col-md-2" },
      { key: "ctaHref", label: "Link", cls: "col-md-2" },
      { key: "active", label: "Active (1/0)", cls: "col-md-1", type: "number" }
    ], "Add poster")}
    <button class="m-btn m-btn--primary mt-3" type="submit"><i class="fa-solid fa-check"></i> Save posters</button>
  </form>`;
}
function secSeo(c) {
  const s = c.seo || {};
  return `<form class="cform" data-section="seo">
    <div class="row g-3">
      ${cInput("seo.title", "Site title", s.title, { cls: "col-12", ai: "Write an SEO title for Barrier Builders fencing company Zimbabwe." })}
      ${cInput("seo.description", "Meta description", s.description, { area: true, rows: 3, cls: "col-12", ai: "Write an SEO meta description for Barrier Builders fencing supply and installation Zimbabwe." })}
    </div>
    <button class="m-btn m-btn--primary mt-3" type="submit"><i class="fa-solid fa-check"></i> Save SEO</button>
  </form>`;
}
const CSECTIONS = { branding: secBranding, homepage: secHomepage, about: secAbout, contact: secContact, footer: secFooter, rules: secRules, posters: secPosters, seo: secSeo };
function content() {
  return shell("Content", mCard("Content Management", "Edit website content, images, copy and rules. Changes apply across the public site.", `
    <div class="d-flex gap-2 flex-wrap mb-3" id="ctabs">
      ${CTABS.map(([k, l]) => `<button type="button" class="m-btn m-btn--ghost ctab" data-ctab="${k}">${l}</button>`).join("")}
    </div>
    <div id="ctab-body"></div>`));
}
function renderCSection(key) {
  const body = document.getElementById("ctab-body");
  if (!body) return;
  const c = BFS.content();
  body.innerHTML = (CSECTIONS[key] || secBranding)(c);
  document.querySelectorAll(".ctab").forEach(b => b.classList.toggle("m-btn--primary", b.dataset.ctab === key));
  document.querySelectorAll(".ctab").forEach(b => b.classList.toggle("m-btn--ghost", b.dataset.ctab !== key));
}
function bindContent() {
  const body = document.getElementById("ctab-body");
  document.querySelectorAll(".ctab").forEach(b => b.onclick = () => renderCSection(b.dataset.ctab));
  renderCSection("branding");
  if (!body) return;

  // All handlers use delegation on ctab-body so they survive tab re-renders.
  body.addEventListener("submit", e => {
    const f = e.target.closest(".cform");
    if (!f) return;
    e.preventDefault();
    const patch = collectContent(f);
    if (patch.posters) patch.posters.forEach(p => { p.active = p.active === "1" || p.active === 1 || p.active === true; });
    BFS.saveContent(patch);
    notify("Content saved.");
  });

  body.addEventListener("change", e => {
    const inp = e.target.closest("[data-upload-for]");
    if (!inp || !inp.files || !inp.files[0]) return;
    const file = inp.files[0];
    const uid = inp.dataset.uploadFor;
    uploadImage(file).then(path => {
      const wrap = inp.closest(".col-12");
      const target = wrap ? wrap.querySelector("input[type=text]") : null;
      if (target) target.value = path;
      const prev = document.getElementById(uid + "_prev");
      if (prev) prev.innerHTML = `<img src="../${path}" style="max-width:220px;border-radius:8px;border:1px solid #e4e7ec">`;
      notify("Image uploaded.");
    }).catch(err => alert("Upload failed: " + err.message));
  });

  body.addEventListener("click", e => {
    const ai = e.target.closest(".ai-btn");
    if (ai) {
      const uid = ai.dataset.aiFor;
      const prompt = ai.dataset.aiPrompt || "Write marketing copy for Barrier Builders fencing company.";
      const target = document.getElementById(uid);
      if (!target) return;
      ai.disabled = true; ai.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI';
      aiGenerate(prompt, "You are a copywriter for Barrier Builders, a fencing supply and installation company in Harare, Zimbabwe. Write concise, professional marketing copy. Return only the text, no quotes or preamble.", 400)
        .then(text => { target.value = text; notify("AI content generated — review and save."); })
        .catch(err => alert("AI failed: " + err.message))
        .finally(() => { ai.disabled = false; ai.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI'; });
      return;
    }
    const add = e.target.closest("[data-list-add]");
    if (add) {
      const path = add.dataset.listAdd;
      const fields = LIST_FIELDS[path] || [];
      const list = body.querySelector(`[data-list="${path}"]`);
      if (!list) return;
      const idx = list.querySelectorAll(".c-list-row").length;
      list.querySelector(".c-list-empty")?.remove();
      const tmp = document.createElement("div");
      tmp.innerHTML = listRow(path, idx, {}, fields);
      list.appendChild(tmp.firstElementChild);
      return;
    }
    const del = e.target.closest("[data-list-del]");
    if (del) {
      const row = del.closest(".c-list-row");
      const list = del.closest("[data-list]");
      if (row && list) { row.remove(); reindexList(list); }
    }
  });
}

/* ---------- router ---------- */
function syncNav(r) {
  // hide nav entries the current role cannot access
  document.querySelectorAll("[data-nav]").forEach(a => {
    const need = ROUTE_PERM[a.dataset.nav];
    const li = a.closest("li");
    if (li) li.style.display = (!need || canPerm(need)) ? "" : "none";
  });
  document.querySelectorAll(".navbar-mobile__list a[href^='#/']").forEach(a => {
    const rr = a.getAttribute("href").replace(/^#\/?/, "");
    const need = ROUTE_PERM[rr];
    const li = a.closest("li");
    if (li) li.style.display = (!need || canPerm(need)) ? "" : "none";
  });
  document.querySelectorAll("[data-nav]").forEach(a => {
    const navKey = a.dataset.nav;
    const on = navKey === r || (r === "quote" && navKey === "quotes") || (r === "invoice" && navKey === "invoices");
    a.classList.toggle("active", on);
    if (on) {
      const li = a.closest("li"); if (li) li.classList.add("active");
      const sub = li && li.querySelector(":scope > .js-sub-list");
      if (sub) sub.style.display = "block";
      const arrow = li && li.querySelector(":scope > .js-arrow");
      if (arrow) arrow.classList.add("open");
    }
  });
}

function syncAccount() {
  const me = BFS.adminAuthed && BFS.adminAuthed();
  let sess = null;
  try { sess = JSON.parse(sessionStorage.getItem("bfs_auth") || "null"); } catch (e) {}
  const fromSession = sess && sess.user
    ? ((sess.name && String(sess.name).toLowerCase() !== "yard admin") ? sess.name : sess.user)
    : "Account";
  const name = me ? (BFS.adminLabel ? BFS.adminLabel(me) : (me.username || "Account")) : fromSession;
  const email = me ? (me.email || "") : ((sess && sess.email) || "");
  const btn = document.getElementById("acct-name");
  const drop = document.getElementById("acct-name-drop");
  const em = document.getElementById("acct-email");
  if (btn) btn.textContent = name;
  if (drop) drop.textContent = name;
  if (em) em.textContent = email;
  document.querySelectorAll(".acct-avatar").forEach(img => {
    if (me && me.avatar) { img.src = me.avatar; img.style.display = ""; }
    else { img.removeAttribute("src"); img.style.display = "none"; }
  });
  if (!me) return;
  try {
    const a = JSON.parse(sessionStorage.getItem("bfs_auth") || "null");
    if (a) {
      a.id = me.id;
      a.user = me.username;
      a.name = name;
      a.email = email;
      sessionStorage.setItem("bfs_auth", JSON.stringify(a));
    }
  } catch (e) {}
}

function render() {
  if (!requireAuth()) return;
  showApp();
  const [r, id] = route();
  const map = {
    dashboard, analytics, products, promotions, quotes, invoices, orders, gallery, content, messages, clients, admins, roles, settings, profile
  };
  let html;
  try {
    if (r === "quote" && id) html = quoteDetail(id);
    else if (r === "invoice" && id) html = invoiceDetail(id);
    else {
      const need = ROUTE_PERM[r];
      if (need && !canPerm(need)) {
        html = shell("No access", mCard("Access denied","Your role does not include this permission", `<p class="text-muted mb-0">Ask an administrator to grant <strong>${esc(PERM_LABELS[need] || need)}</strong> to your role.</p>`));
      } else {
        html = (map[r] || dashboard)();
      }
    }
  } catch (err) {
    console.error("admin render failed:", err);
    html = shell("Error", mCard("This page failed to load", esc(err && err.message || "Unknown error"), `<p class="text-muted mb-0">The underlying data may be incomplete — try reloading or editing the record.</p>`));
  }
  document.getElementById("app").innerHTML = html;
  syncNav(r);
  syncAccount();
  const signOut = e => {
    e.preventDefault();
    e.stopPropagation();
    BFS.logout();
    location.href = "../api/data.php?logout=1";
  };
  const lo = document.getElementById("logout");
  if (lo) lo.onclick = signOut;
  const lo2 = document.getElementById("logoutSide");
  if (lo2) lo2.onclick = signOut;
  const lo3 = document.getElementById("logoutMobile");
  if (lo3) lo3.onclick = signOut;

  // global export / import wiring
  document.querySelectorAll("[data-exp]").forEach(a => a.onclick = e => { e.preventDefault(); doExport(a.dataset.key, a.dataset.exp); });
  document.querySelectorAll("input[data-import]").forEach(inp => {
    inp.onchange = () => handleImport(inp.dataset.import, inp.files[0]);
  });
  document.querySelectorAll("[data-leadconv]").forEach(b => b.onclick = () => {
    try { const inv = BFS.leadToInvoice(b.dataset.leadconv); location.hash = "#/invoice/" + inv.ref; render(); }
    catch (e) { alert(e.message); }
  });

  if (r === "dashboard") { /* leads convert bound above */ }
  if (r === "products") bindProducts();
  if (r === "promotions") bindPromos();
  if (r === "quotes") bindQuotes();
  if (r === "quote" && id) {
    const c = document.getElementById("conv");
    if (c) c.onclick = () => convertQuote(id);
  }
  if (r === "invoices") bindInvoices();
  if (r === "invoice" && id) {
    const p = document.getElementById("pay");
    if (p) p.onclick = () => {
      const inv = BFS.invoice(id);
      inv.status = "paid"; inv.paid = inv.total; BFS.saveInvoice(inv);
      const o = BFS.order(inv.tracking || inv.ref);
      if (o && o.status === "pending") BFS.advanceOrder(o.tracking);
      render();
    };
  }
  if (r === "orders") bindOrders();
  if (r === "gallery") {
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { BFS.deleteGallery(b.dataset.del); render(); });
    bindGallery();
  }
  if (r === "content") bindContent();
  if (r === "clients") bindClients();
  if (r === "admins") bindAdmins();
  if (r === "roles") bindRoles();
  if (r === "settings") {
    const sfEl = document.getElementById("sf");
    if (sfEl) sfEl.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(sfEl);
      const patch = {};
      fd.forEach((v,k) => patch[k] = k==="vatRate" ? Number(v) : v);
      BFS.saveSettings(patch);
      alert("Settings saved.");
    };
    const expEl = document.getElementById("exp");
    if (expEl) expEl.onclick = () => {
      const blob = new Blob([BFS.export()], {type:"application/json"});
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "barrier-fencing-data.json"; a.click();
    };
    const rstEl = document.getElementById("rst");
    if (rstEl) rstEl.onclick = () => { alert("Data reset is disabled — site data lives on the server. Contact support for a restore."); };
  }
  if (r === "profile") bindProfile();
  initCharts();
}

async function handleImport(kind, file) {
  if (!file) return;
  try {
    const data = /\.xlsx?$/i.test(file.name) ? await BFSAdmin.importExcel(file) : await BFSAdmin.importCSV(file);
    const map = { headers: data.headers.map(h => String(h).toLowerCase().trim()), rows: data.rows };
    let count = 0;
    if (kind === "products") {
      map.rows.forEach(r => {
        const o = {}; map.headers.forEach((h,i)=>o[h]=r[i]);
        if (!o.name) return;
        BFS.saveProduct({ id: BFS.uid("p"), name:o.name, category:o.category||"General", slug:(o.name||"").toLowerCase().replace(/\s+/g,"-"), short:o.short||"", pricePerM:Number(o["price/m"]||o.priceperm||o.price||0), rollPrice:Number(o["roll price"]||o.rollprice||0), rollMetres:Number(o["coverage m"]||o.coveragem||30), postPrice:Number(o["post price"]||o.postprice||0), stock:Number(o.stock||0), stockUnit:o.unit||"units", image:o.image||"assets/img/diamond-mesh.jpg", featured:false });
        count++;
      });
    } else if (kind === "quotes") {
      map.rows.forEach(r => {
        const o = {}; map.headers.forEach((h,i)=>o[h]=r[i]);
        if (!o.ref && !o.client) return;
        const tot = Number(o.total||0), rate = (BFS.settings().vatRate||0.15);
        const sub = Math.round(tot/(1+rate)*100)/100; // imported total is VAT-inclusive
        BFS.saveQuote({ ref:o.ref, status:o.status||"draft", customer:{name:o.client||o.name||"",contact:o.contact||"",email:o.email||"",notes:""}, project:{typeName:o.type||"",perimeter:Number(o["perimeter m"]||o.perimeter||0),height:1.8,spacing:2.5}, items:[], subtotal:sub });
        count++;
      });
    } else if (kind === "invoices") {
      map.rows.forEach(r => {
        const o = {}; map.headers.forEach((h,i)=>o[h]=r[i]);
        if (!o.ref && !o.client) return;
        const tot = Number(o.total||0), rate = (BFS.settings().vatRate||0.15);
        const sub = Math.round(tot/(1+rate)*100)/100, vatI = Math.round((tot-sub)*100)/100;
        const inv = { id:BFS.uid("i"), ref:o.ref||BFS.nextRef("invoice"), status:o.status||"unpaid", customer:{name:o.client||o.name||"",contact:"",email:"",notes:""}, project:{typeName:"",perimeter:0}, items:[], subtotal:sub, vat:vatI, total:tot, paid:o.status==="paid"?tot:0, createdAt:new Date().toISOString(), dueAt:new Date(Date.now()+14*864e5).toISOString() };
        BFS.saveInvoice(inv); count++;
      });
    } else if (kind === "clients") {
      map.rows.forEach(r => {
        const o = {}; map.headers.forEach((h,i)=>o[h]=r[i]);
        if (!o.email) return;
        try { Promise.resolve(BFS.registerClient({ name:o.name||o.email, email:o.email, phone:o.phone||"", password:"imported"+Date.now() })).then(()=>count++).catch(()=>{}); } catch(e){}
      });
    }
    alert("Imported " + count + " record(s).");
    render();
  } catch (e) { alert("Import failed: " + e.message); }
}

function initCharts() {
  if (typeof Chart === "undefined") return;
  const a = BFS.analytics();
  const spark = (id, color) => {
    const el = document.getElementById(id); if (!el) return;
    const days = Object.keys(a.daily).sort().slice(-7);
    new Chart(el, { type:"line", data:{ labels:days.map(d=>d.slice(5)), datasets:[{ data:days.map(d=>a.daily[d].views), borderColor:color, backgroundColor:color+"22", fill:true, tension:.4, pointRadius:0 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{enabled:false}}, scales:{x:{display:false},y:{display:false}} } });
  };
  spark("sp-q","#007243"); spark("sp-i","#28a745"); spark("sp-r","#E6B325"); spark("sp-o","#dc3545");
  const dc = document.getElementById("dash-chart");
  if (dc) {
    const days = Object.keys(a.daily).sort().slice(-14);
    new Chart(dc, { type:"line", data:{ labels:days.map(d=>d.slice(5)), datasets:[
      { label:"Quotes", data:days.map(d=>a.daily[d].quotes), borderColor:"#007243", backgroundColor:"rgba(0,114,67,.12)", fill:true, tension:.35 },
      { label:"Invoices", data:days.map(d=>a.daily[d].invoices), borderColor:"#E6B325", backgroundColor:"rgba(230,179,37,.12)", fill:true, tension:.35 }
    ]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:"bottom"}}, scales:{y:{beginAtZero:true, ticks:{precision:0}}} } });
  }
  const ac = document.getElementById("analytics-chart");
  if (ac) {
    const days = Object.keys(a.daily).sort().slice(-21);
    new Chart(ac, { type:"bar", data:{ labels:days.map(d=>d.slice(5)), datasets:[{ label:"Views", data:days.map(d=>a.daily[d].views), backgroundColor:"#007243", borderRadius:4 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, ticks:{precision:0}}} } });
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("bfs-accounts", () => { if (BFS.isAuthed()) render(); });
// server rejected a save or the admin session expired mid-edit
window.addEventListener("bfs-save-failed", e => {
  const st = e && e.detail && e.detail.status;
  alert("Save failed" + (st ? " (HTTP " + st + ")" : "") + " — the change was NOT stored. Check your connection and try again.");
});
window.addEventListener("bfs-session-expired", () => {
  alert("Your admin session has expired — please sign in again.");
  location.href = "../api/data.php?logout=1";
});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
else render();
