/* Shared chrome, helpers */
(function () {
  const BASE = /\/admin\//.test(location.pathname) ? "../" : "";
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  function icon(name) {
    const icons = {
      menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
      wa: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.13 1.6 5.93L0 24l6.4-1.68a11.83 11.83 0 0 0 5.64 1.44h.01c6.53 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.37-8.44zM12.04 21.8h-.01a9.82 9.82 0 0 1-5-1.37l-.36-.21-3.8 1 .99-3.7-.23-.38a9.81 9.81 0 0 1-1.5-5.3c0-5.42 4.41-9.83 9.83-9.83 2.63 0 5.1 1.03 6.95 2.88a9.77 9.77 0 0 1 2.88 6.96c0 5.42-4.41 9.83-9.8 9.83z"/></svg>'
    };
    return icons[name] || "";
  }

  function navLink(href, label) {
    const file = href.split("/").pop();
    const active = page === file || (page === "" && file === "index.html");
    return `<a href="${BASE}${href}" class="${active ? "active" : ""}">${label}</a>`;
  }

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
      const header = document.getElementById("site-header");
      if (header) {
        header.innerHTML = `
          <div class="site-header">
            <div class="container header-inner">
              <a class="logo" href="${BASE}index.html">
                <img src="${BASE}assets/logo.svg" alt="Barrier Fencing Solutions">
                <div class="logo-text"><strong>BARRIER</strong><small>Fencing Solutions</small></div>
              </a>
              <nav class="nav">
                ${navLink("index.html","Home")}
                ${navLink("products.html","Products")}
                ${navLink("calculator.html","Instant Quote")}
                ${navLink("estimator.html","AI Estimator")}
                ${navLink("gallery.html","Gallery")}
                ${navLink("track.html","Track Order")}
                ${navLink("about.html","About")}
                ${navLink("contact.html","Contact")}
              </nav>
              <div class="header-cta">
                <a class="btn btn-gold btn-sm" href="${BASE}calculator.html">Get Quote</a>
                <button class="menu-btn" id="menuBtn" aria-label="Menu">${icon("menu")}</button>
              </div>
            </div>
            <div class="mobile-nav" id="mobileNav">
              ${navLink("index.html","Home")}
              ${navLink("products.html","Products")}
              ${navLink("calculator.html","Instant Quote")}
              ${navLink("estimator.html","AI Estimator")}
              ${navLink("gallery.html","Gallery")}
              ${navLink("track.html","Track Order")}
              ${navLink("promotions.html","Promotions")}
              ${navLink("about.html","About")}
              ${navLink("contact.html","Contact")}
            </div>
          </div>`;
        const btn = document.getElementById("menuBtn");
        const mob = document.getElementById("mobileNav");
        if (btn) btn.addEventListener("click", () => mob.classList.toggle("open"));
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
                  <a class="logo" href="${BASE}index.html">
                    <img src="${BASE}assets/logo.svg" alt="">
                    <div class="logo-text"><strong>BARRIER</strong><small>Fencing Solutions</small></div>
                  </a>
                  <p>Supply and installation of galvanized fencing across all 10 provinces of Zimbabwe. Materials, labour, and nationwide delivery.</p>
                </div>
                <div class="footer-col">
                  <h4>Products</h4>
                  <ul>
                    <li><a href="${BASE}products.html">All products</a></li>
                    <li><a href="${BASE}products.html?cat=Security">Security fencing</a></li>
                    <li><a href="${BASE}products.html?cat=Agricultural">Agricultural</a></li>
                    <li><a href="${BASE}calculator.html">Instant quote</a></li>
                  </ul>
                </div>
                <div class="footer-col">
                  <h4>Company</h4>
                  <ul>
                    <li><a href="${BASE}about.html">About us</a></li>
                    <li><a href="${BASE}gallery.html">Gallery</a></li>
                    <li><a href="${BASE}promotions.html">Promotions</a></li>
                    <li><a href="${BASE}track.html">Track an order</a></li>
                    <li><a href="${BASE}admin/">Admin portal</a></li>
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
                <div>© ${new Date().getFullYear()} ${s.company}. ${s.domain}</div>
                <div>USD pricing · VAT ${Math.round((s.vatRate||0.15)*100)}% on invoices</div>
              </div>
            </div>
          </footer>
          <a class="wa-float" href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon("wa")}</a>`;
      }

      BFS.trackPage();
    }
  };

  document.addEventListener("DOMContentLoaded", () => BFSUI.mount());
})();
