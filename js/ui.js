/* Shared chrome, helpers */
(function () {
  // Path depth: pages live at /products/ so assets need ../ prefix.
  // / -> 0, /products or /products/ -> 1, /admin/ -> 1, /x/y/ -> 2
  const segs = location.pathname.split("/").filter(Boolean);
  const depth = segs.length && /\.[^/]+$/.test(segs[segs.length - 1]) ? segs.length - 1 : segs.length;
  const BASE = "../".repeat(depth);
  // Current page = last meaningful segment (no .html extension)
  const page = (depth < segs.length ? segs[segs.length - 1] : (segs[segs.length - 1] || "index")).replace(/\.html$/i, "").toLowerCase();

  function icon(name) {
    const icons = {
      menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
      wa: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
    };
    return icons[name] || "";
  }

  function navLink(href, label) {
    const file = href.split("/").pop().replace(/\.html$/i, "");
    const active = page === file || (page === "" && file === "index") || (page === "index" && file === "index");
    return `<a href="${BASE}${href}" class="${active ? "active" : ""}">${label}</a>`;
  }

  /* ---- light/dark theme ---- */
  const THEME_SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const THEME_MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function currentTheme() {
    try {
      return localStorage.getItem("bfs-theme") ||
        (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch (e) { return "light"; }
  }
  function applyTheme(t, persist) {
    if (t !== "dark" && t !== "light") t = "light";
    document.documentElement.dataset.theme = t;
    if (persist !== false) { try { localStorage.setItem("bfs-theme", t); } catch (e) {} }
    document.querySelectorAll(".theme-toggle").forEach(b => {
      b.innerHTML = t === "dark" ? THEME_MOON : THEME_SUN;
      b.setAttribute("aria-label", t === "dark" ? "Dark mode" : "Light mode");
      b.title = t === "dark" ? "Switch to light mode" : "Switch to dark mode";
    });
    return t;
  }
  function toggleTheme() { applyTheme(currentTheme() === "dark" ? "light" : "dark"); }
  applyTheme(currentTheme(), false);

  let trackedPage = false;

  window.BFSUI = {
    base: BASE,
    setTheme(t) { return applyTheme(t); },
    toggleTheme() { toggleTheme(); },
    money(n) { return "$" + BFS.money(n); },
    toast(msg) {
      let t = document.querySelector(".toast");
      if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
      t.textContent = msg; t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 2800);
    },
    mount() {
      const s = BFS.settings();
      const c = (typeof BFS.content === "function") ? BFS.content() : {};
      const brand = c.branding || {}, foot = c.footer || {}, seo = c.seo || {};
      const logoSrc = brand.logo || "assets/logo.png";
      const favSrc = brand.favicon || "assets/favicon.png";
      // favicon + SEO
      const fav = document.querySelector('link[rel="icon"]');
      if (fav) fav.href = BASE + favSrc;
      const md = document.querySelector('meta[name="description"]');
      if (md && seo.description) md.setAttribute("content", seo.description);
      if (seo.title && (page === "index" || page === "")) document.title = seo.title;
      const client = (typeof BFS.clientAuthed === "function") ? BFS.clientAuthed() : null;
      document.body.classList.toggle("client-authed", !!client);
      const avMenuIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
      const avBell = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
      const avGear = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
      const avOut = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';
      const initials = ((client && (client.name || client.email)) || "U").trim().charAt(0).toUpperCase();
      const avatarHtml = client
        ? `<div class="av-wrap">
             <button class="av-btn" id="avBtn" aria-label="Account menu" aria-haspopup="true">${client.avatar ? `<img src="${client.avatar}" alt="">` : initials}</button>
             <div class="av-menu" id="avMenu">
               <a href="${BASE}portal#settings">${avMenuIcon}<span>My Profile</span></a>
               <a href="${BASE}portal#notifications">${avBell}<span>Notifications</span></a>
               <a href="${BASE}portal#settings">${avGear}<span>Settings</span></a>
               <div class="av-sep"></div>
               <a href="#" class="av-out" id="avLogout">${avOut}<span>Logout</span></a>
             </div>
           </div>`
        : "";
      const header = document.getElementById("site-header");
      if (header) {
        header.innerHTML = `
          <div class="site-header">
            <div class="container header-inner">
              <a class="logo" href="${BASE}">
                <img src="${BASE}${logoSrc}" alt="Barrier Builders">
              </a>
              <nav class="nav">
                ${navLink("","Home")}
                ${navLink("products","Products")}
                ${navLink("calculator","Instant Quote")}
                ${navLink("estimator","AI Estimator")}
                ${navLink("gallery","Gallery")}
                ${navLink("track","Track Order")}
                ${navLink("about","About")}
                ${navLink("contact","Contact")}
              </nav>
              <div class="header-cta">
                ${avatarHtml}
                <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle theme"></button>
                <a class="btn btn-green btn-sm" href="${BASE}calculator">Get Quote</a>
              </div>
              <button class="menu-btn" id="menuBtn" aria-label="Menu">${icon("menu")}</button>
            </div>
            <div class="mobile-nav" id="mobileNav">
              ${navLink("","Home")}
              ${navLink("products","Products")}
              ${navLink("calculator","Instant Quote")}
              ${navLink("estimator","AI Estimator")}
              ${navLink("gallery","Gallery")}
              ${navLink("track","Track Order")}
              ${navLink("promotions","Promotions")}
              ${navLink("about","About")}
              ${navLink("contact","Contact")}
            </div>
          </div>`;
        const btn = document.getElementById("menuBtn");
        const mob = document.getElementById("mobileNav");
        if (btn) btn.addEventListener("click", () => mob.classList.toggle("open"));
        const tt = document.getElementById("themeToggle");
        if (tt) tt.addEventListener("click", toggleTheme);
        applyTheme(currentTheme(), false);
        const avBtn = document.getElementById("avBtn");
        const avMenu = document.getElementById("avMenu");
        if (avBtn && avMenu) {
          avBtn.addEventListener("click", e => { e.stopPropagation(); avMenu.classList.toggle("open"); });
          document.addEventListener("click", e => { if (!e.target.closest(".av-wrap")) avMenu.classList.remove("open"); });
          const lo = document.getElementById("avLogout");
          if (lo) lo.addEventListener("click", e => {
            e.preventDefault();
            BFS.clientLogout();
            location.href = BASE + "portal#login";
          });
        }
      }

      const promos = BFS.promotions();
      const strip = document.getElementById("promo-strip");
      if (strip && promos.length) {
        const bits = promos.map(p => p.title + " — " + p.body).join("   ·   ");
        strip.innerHTML = `<div class="promo-strip"><div class="promo-track"><span>${bits}</span><span>${bits}</span></div></div>`;
      }

      const footer = document.getElementById("site-footer");
      if (footer) {
        footer.innerHTML = `
          <footer class="site-footer">
            <div class="container">
              <div class="footer-grid">
                <div class="footer-brand">
                  <a class="logo" href="${BASE}">
                    <img src="${BASE}${logoSrc}" alt="">
                  </a>
                  <p>${foot.brandText || "Supply and installation of galvanized fencing across all 10 provinces of Zimbabwe. Materials, labour, and nationwide delivery."}</p>
                </div>
                <div class="footer-col">
                  <h4>Products</h4>
                  <ul>
                    <li><a href="${BASE}products">All products</a></li>
                    <li><a href="${BASE}products?cat=Security">Security fencing</a></li>
                    <li><a href="${BASE}products?cat=Agricultural">Agricultural</a></li>
                    <li><a href="${BASE}calculator">Instant quote</a></li>
                  </ul>
                </div>
                <div class="footer-col">
                  <h4>Company</h4>
                  <ul>
                    <li><a href="${BASE}about">About us</a></li>
                    <li><a href="${BASE}gallery">Gallery</a></li>
                    <li><a href="${BASE}promotions">Promotions</a></li>
                    <li><a href="${BASE}track">Track an order</a></li>
                    <li><a href="${BASE}portal">Client login</a></li>
                  </ul>
                </div>
                <div class="footer-col">
                  <h4>Contact</h4>
                  <ul>
                    <li>${s.address}</li>
                    <li><a href="tel:${s.phone.replace(/\s/g,"")}">${s.phone}</a></li>
                    ${s.phone2 ? `<li><a href="tel:${s.phone2.replace(/\s/g,"")}">${s.phone2}</a></li>` : ""}
                    <li><a href="mailto:${s.email}">${s.email}</a></li>
                    <li>${s.hours}</li>
                  </ul>
                </div>
              </div>
              <div class="footer-bottom">
                <div>© ${new Date().getFullYear()} ${s.company}</div>
                <div>Developed and Powered by <a href="https://www.globalspaceweb.co.zw" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">Global Space Web</a> · +263718560128</div>
              </div>
            </div>
          </footer>
          <a class="wa-float" href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon("wa")}</a>`;
      }

      /* Bottom nav for signed-in clients on public pages (portal has its own) */
      if (page !== "portal" && typeof BFS.clientAuthed === "function" && BFS.clientAuthed()) {
        const ic = {
          home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
          products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
          quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 13h6M9 17h4"/></svg>',
          orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/></svg>',
          track: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>'
        };
        const nav = [
          ["home", "", "Home", ["index", ""]],
          ["products", "products", "Products", ["products", "product"]],
          ["quote", "calculator", "Quote", ["calculator", "estimator", "quote"]],
          ["orders", "portal#orders", "Orders", ["portal"]],
          ["track", "track", "Track", ["track"]]
        ];
        const bn = document.createElement("nav");
        bn.className = "bottom-nav";
        bn.setAttribute("aria-label", "Quick navigation");
        bn.innerHTML = nav.map(([key, href, label, pages]) => {
          const on = pages.includes(page);
          return key === "quote"
            ? `<a class="bn-item bn-center ${on ? "on" : ""}" href="${BASE}${href}"><span class="bn-fab">${ic[key]}</span><span>${label}</span></a>`
            : `<a class="bn-item ${on ? "on" : ""}" href="${BASE}${href}">${ic[key]}<span>${label}</span></a>`;
        }).join("");
        document.body.appendChild(bn);
        document.body.classList.add("bnav-on");
      }

      // count the pageview once — mount() can re-run when client auth resolves
      if (!trackedPage) { trackedPage = true; BFS.trackPage(); }
    }
  };

  document.addEventListener("DOMContentLoaded", () => BFSUI.mount());
  // client auth resolves asynchronously — re-mount so the avatar menu updates
  window.addEventListener("bfs-accounts", () => { try { BFSUI.mount(); } catch (e) {} });
})();
