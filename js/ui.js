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
      wa: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.13 1.6 5.93L0 24l6.4-1.68a11.83 11.83 0 0 0 5.64 1.44h.01c6.53 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.37-8.44zM12.04 21.8h-.01a9.82 9.82 0 0 1-5-1.37l-.36-.21-3.8 1 .99-3.7-.23-.38a9.81 9.81 0 0 1-1.5-5.3c0-5.42 4.41-9.83 9.83-9.83 2.63 0 5.1 1.03 6.95 2.88a9.77 9.77 0 0 1 2.88 6.96c0 5.42-4.41 9.83-9.8 9.83z"/></svg>'
    };
    return icons[name] || "";
  }

  function navLink(href, label) {
    const file = href.split("/").pop().replace(/\.html$/i, "");
    const active = page === file || (page === "" && file === "index") || (page === "index" && file === "index");
    return `<a href="${BASE}${href}" class="${active ? "active" : ""}">${label}</a>`;
  }

  let trackedPage = false;

  window.BFSUI = {
    base: BASE,
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
                <a class="btn btn-gold btn-sm" href="${BASE}calculator">Get Quote</a>
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
