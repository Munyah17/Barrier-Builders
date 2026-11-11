/* Barrier Builders — client store (localStorage + JSON seed) */
(function (global) {
  const KEY = "bfs_store_v1";
  const AUTH_KEY = "bfs_auth";

  // Resolve the PHP API relative to the site root (js/store.js -> ../api/data.php)
  const API_URL = (() => {
    try {
      const src = (document.currentScript && document.currentScript.src) || "";
      const m = src.match(/^(.*)\/js\/store\.js/);
      if (m) return m[1] + "/api/data.php";
    } catch (e) {}
    return "api/data.php";
  })();

  function pushToServer(state) {
    try {
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
        keepalive: true
      }).catch(() => {});
    } catch (e) {}
  }

  const SEED = {
    settings: {
      company: "Barrier Builders",
      tagline: "The fence that holds.",
      domain: "barrierfencing.co.zw",
      email: "info@barrierfencing.co.zw",
      salesEmail: "sales@barrierfencing.co.zw",
      phone: "+263 77 132 0612",
      whatsapp: "263771320612",
      address: "42 Coventry Road, Workington, Harare, Zimbabwe",
      hours: "Mon–Fri 07:30–17:00 · Sat 08:00–13:00",
      vatRate: 0.15,
      currency: "USD",
      quoteValidityDays: 14,
      adminUser: "admin",
      adminPass: "Barrier@2026",
      vatNumber: "VAT 10001234",
      bank: "Stanbic Bank — Barrier Builders — Acc 000000000000"
    },
    products: [
      { id: "p1", slug: "diamond-mesh", name: "Diamond Mesh", category: "Residential", unit: "roll",
        short: "Versatile hot-dip galvanized chain-link for homes, schools and commercial plots.",
        description: "Our most requested fence. Woven diamond mesh in 2.0–4.0 mm gauges, apertures 50 / 63 / 75 mm, heights from 0.9 m to 2.4 m. Hot-dip galvanized for 15+ years of corrosion resistance in Zimbabwean conditions.",
        specs: { gauge: "2.0–4.0 mm", aperture: "50 / 63 / 75 mm", heights: "0.9–2.4 m", coating: "Hot-dip galvanized, min 80 µm" },
        pricePerM: 12, rollPrice: 120, rollMetres: 30, postPrice: 8, topWirePerM: 0.8, gatePrice: 180, installPerM: 3.5, concretePerPost: 4,
        stock: 420, stockUnit: "rolls", featured: true, image: "assets/img/diamond-mesh.jpg", keywords: ["diamond","chain","residential","home","house","plot","school","boundary"] },
      { id: "p2", slug: "game-fence", name: "Game Fence", category: "Agricultural", unit: "roll",
        short: "Heavy-duty knotted fence for wildlife ranches, conservancies and large farms.",
        description: "Knotted high-tensile game fence designed to contain large wildlife including kudu, eland and buffalo. Heights 1.2–2.4 m. Built for Matabeleland and Mashonaland ranch conditions.",
        specs: { gauge: "2.0–3.15 mm", joint: "Knotted, impact-resistant", heights: "1.2–2.4 m", coating: "Hot-dip galvanized" },
        pricePerM: 18, rollPrice: 280, rollMetres: 50, postPrice: 12, topWirePerM: 1.1, gatePrice: 220, installPerM: 4.0, concretePerPost: 5,
        stock: 86, stockUnit: "rolls", featured: true, image: "assets/img/game-fence.jpg", keywords: ["game","wildlife","farm","hectare","ranch","livestock","conservancy"] },
      { id: "p3", slug: "barbed-wire", name: "Barbed Wire", category: "Security", unit: "roll",
        short: "High-tensile 2.5 mm barbed wire for farm boundaries and perimeter topping.",
        description: "12.5 gauge galvanized barbed wire, barb spacing 75–100 mm, 100 m and 200 m rolls. Used as a standalone farm fence or as a top strand on diamond mesh.",
        specs: { gauge: "2.5 mm (12.5g)", barb: "75–100 mm", rolls: "100 m / 200 m", coating: "Hot-dip galvanized" },
        pricePerM: 1.9, rollPrice: 45, rollMetres: 100, postPrice: 8, topWirePerM: 0.6, gatePrice: 160, installPerM: 2.5, concretePerPost: 4,
        stock: 610, stockUnit: "rolls", featured: true, image: "assets/img/barbed-wire.jpg", keywords: ["barbed","perimeter","farm","budget","top wire"] },
      { id: "p4", slug: "razor-wire", name: "Razor Wire", category: "Security", unit: "coil",
        short: "Concertina BTO-22 razor coils for high-risk commercial and institutional sites.",
        description: "Maximum-security concertina razor wire in 450, 600 and 900 mm coil diameters. Hot-dip galvanized BTO-22 blades for prisons, mines, warehouses and wall-top upgrades.",
        specs: { blade: "BTO-22", coils: "450 / 600 / 900 mm", coating: "Hot-dip galvanized steel" },
        pricePerM: 6.5, rollPrice: 95, rollMetres: 50, postPrice: 14, topWirePerM: 1.4, gatePrice: 260, installPerM: 4.5, concretePerPost: 5,
        stock: 140, stockUnit: "coils", featured: true, image: "assets/img/razor-wire.jpg", keywords: ["razor","security","prison","commercial","industrial","warehouse","high"] },
      { id: "p5", slug: "clear-view", name: "Clear View Fence", category: "Security", unit: "panel",
        short: "Anti-climb welded mesh with unobstructed visibility for estates, schools and embassies.",
        description: "4.0 mm welded mesh, 76.2 × 12.7 mm aperture, anti-climb and anti-cut. Optional spike-top. Powder-coated forest green or galvanized finish.",
        specs: { wire: "4.0 mm", aperture: "76.2 × 12.7 mm", features: "Anti-climb, anti-cut, spike-top option" },
        pricePerM: 38, rollPrice: 190, rollMetres: 3, postPrice: 22, topWirePerM: 1.6, gatePrice: 420, installPerM: 8, concretePerPost: 8,
        stock: 74, stockUnit: "panels", featured: true, image: "assets/img/clear-view.jpg", keywords: ["clear","view","embassy","school","estate","anti-climb"] },
      { id: "p6", slug: "palisade", name: "Palisade Fencing", category: "Security", unit: "m",
        short: "Steel palisade pales for industrial yards, schools and high-security compounds.",
        description: "Locally fabricated W-section or D-section pales, powder-coated dark green or galvanized. A strong visual and physical deterrent.",
        specs: { pale: "W or D section", heights: "1.8–2.4 m", finish: "Galvanized / powder coat green" },
        pricePerM: 55, rollPrice: 55, rollMetres: 1, postPrice: 28, topWirePerM: 0, gatePrice: 480, installPerM: 12, concretePerPost: 10,
        stock: 210, stockUnit: "metres", featured: true, image: "assets/img/palisade.jpg", keywords: ["palisade","industrial","school","compound","steel"] },
      { id: "p7", slug: "welded-mesh", name: "Welded Mesh", category: "Industrial", unit: "panel",
        short: "Rigid welded panels for enclosures, reinforcement and industrial fencing.",
        description: "Square and rectangular welded mesh in multiple gauges. Used for cages, machine guards, slab reinforcement and light security fencing.",
        specs: { aperture: "50 × 50 mm and custom", gauge: "2.5–4.0 mm" },
        pricePerM: 14, rollPrice: 70, rollMetres: 6, postPrice: 10, topWirePerM: 0.7, gatePrice: 200, installPerM: 3.2, concretePerPost: 4,
        stock: 188, stockUnit: "panels", featured: false, image: "assets/img/welded-mesh.jpg", keywords: ["welded","panel","industrial","cage"] },
      { id: "p8", slug: "chicken-mesh", name: "Chicken Mesh", category: "Agricultural", unit: "roll",
        short: "Lightweight hexagonal netting for poultry runs, gardens and small animals.",
        description: "0.7–1.0 mm hex netting, 25 mm and 50 mm apertures, heights 0.6–1.8 m. Galvanized against rust in the rainy season.",
        specs: { gauge: "0.7–1.0 mm", aperture: "25 / 50 mm", heights: "0.6–1.8 m" },
        pricePerM: 4.2, rollPrice: 32, rollMetres: 30, postPrice: 6, topWirePerM: 0.5, gatePrice: 140, installPerM: 2.0, concretePerPost: 3,
        stock: 260, stockUnit: "rolls", featured: false, image: "assets/img/chicken-mesh.jpg", keywords: ["chicken","poultry","birds","coop","garden","pet"] },
      { id: "p9", slug: "field-fence", name: "Field Fence", category: "Agricultural", unit: "roll",
        short: "Woven field fence for cattle, goats and crop protection on rural properties.",
        description: "Graduated mesh field fence that keeps livestock in and predators out. Ideal for mixed farming operations.",
        specs: { type: "Hinged joint / woven", heights: "1.0–1.5 m", rolls: "50 m" },
        pricePerM: 8.5, rollPrice: 180, rollMetres: 50, postPrice: 10, topWirePerM: 0.9, gatePrice: 200, installPerM: 3.0, concretePerPost: 4,
        stock: 95, stockUnit: "rolls", featured: false, image: "assets/img/field-fence.jpg", keywords: ["field","cattle","goats","crop","rural","livestock"] },
      { id: "p10", slug: "electric-fence", name: "Electric Fence", category: "Security", unit: "kit",
        short: "Wall-top or full-height electric fence systems with energizer and siren.",
        description: "High-voltage pulsed deterrent for residential and commercial walls. Kits include energizer, insulators, HT wire and battery backup options.",
        specs: { type: "Wall-top or full height", kit: "Energizer, HT wire, insulators" },
        pricePerM: 9.5, rollPrice: 95, rollMetres: 20, postPrice: 0, topWirePerM: 0, gatePrice: 0, installPerM: 7, concretePerPost: 0,
        stock: 54, stockUnit: "kits", featured: false, image: "assets/img/electric-fence.jpg", keywords: ["electric","energizer","wall top","alarm"] },
      { id: "p11", slug: "gates", name: "Gates", category: "Access", unit: "set",
        short: "Custom sliding, swing and pedestrian gates fabricated to opening width.",
        description: "Hot-dip galvanized steel gates: sliding, double-leaf and pedestrian. Mesh, palisade or clear-view infill. Automation on request.",
        specs: { types: "Sliding / swing / pedestrian", finish: "Galvanized or powder coat" },
        pricePerM: 180, rollPrice: 180, rollMetres: 1, postPrice: 0, topWirePerM: 0, gatePrice: 180, installPerM: 40, concretePerPost: 0,
        stock: 22, stockUnit: "sets", featured: false, image: "assets/img/gate.jpg", keywords: ["gate","entrance","access","sliding"] },
      { id: "p12", slug: "posts", name: "Fence Posts & Standards", category: "Accessories", unit: "pc",
        short: "Galvanized line posts, corner posts, Y-posts and straining assemblies.",
        description: "Round tube, Y-post and corner assemblies from 1.2 m to 2.4 m. Sold with stay wires and fittings.",
        specs: { heights: "1.2–2.4 m", types: "Line, corner, Y-post" },
        pricePerM: 8, rollPrice: 8, rollMetres: 1, postPrice: 8, topWirePerM: 0, gatePrice: 0, installPerM: 0, concretePerPost: 4,
        stock: 980, stockUnit: "pcs", featured: false, image: "assets/img/posts.jpg", keywords: ["post","standard","y-post","corner"] }
    ],
    promotions: [
      { id: "pr1", title: "Farm bulk 10% off", body: "10% off materials on diamond mesh and game fence orders over 500 m. Valid until 31 Dec 2026.", active: true, tag: "Agriculture", starts: "2026-11-01", ends: "2026-12-31" },
      { id: "pr2", title: "Free Harare delivery over $500", body: "Orders above USD 500 delivered free within Harare metropolitan.", active: true, tag: "Delivery", starts: "2026-01-01", ends: "2026-12-31" },
      { id: "pr3", title: "Diaspora install package", body: "Pay from abroad. We survey, supply and install for family properties in Zimbabwe. WhatsApp progress photos included.", active: true, tag: "Diaspora", starts: "2026-01-01", ends: "2026-12-31" },
      { id: "pr4", title: "School clear-view special", body: "Preferential panel pricing for registered schools and clinics this term.", active: true, tag: "Education", starts: "2026-09-01", ends: "2026-12-15" }
    ],
    gallery: [
      { id: "g1", title: "Residential diamond mesh — Borrowdale", location: "Harare", type: "Diamond Mesh", image: "assets/img/gallery-residential.jpg", year: 2026 },
      { id: "g2", title: "Game fence — Matabeleland conservancy", location: "Matabeleland South", type: "Game Fence", image: "assets/img/gallery-game.jpg", year: 2025 },
      { id: "g3", title: "School palisade — sports field", location: "Harare", type: "Palisade", image: "assets/img/gallery-school.jpg", year: 2026 },
      { id: "g4", title: "Clear view estate perimeter", location: "Mount Pleasant", type: "Clear View", image: "assets/img/clear-view.jpg", year: 2026 },
      { id: "g5", title: "Farm boundary — Mashonaland East", location: "Marondera", type: "Field Fence", image: "assets/img/field-fence.jpg", year: 2025 },
      { id: "g6", title: "Sliding gate — Highlands", location: "Harare", type: "Gates", image: "assets/img/gate.jpg", year: 2026 }
    ],
    quotes: [],
    invoices: [],
    orders: [],
    contacts: [],
    leads: [],
    clients: [
      { id: "cl-demo-1", name: "Tariro Ncube", email: "tariro@example.com", phone: "0772 441 190",
        password: "ZGVtbzEyMzQ=", createdAt: "2026-10-28T09:00:00.000Z",
        kyc: { fullName: "Tariro Ncube", idType: "National ID", idNumber: "63-1234567-A-12", proofAddress: "12 Mbuya Nehanda St, Harare", idDoc: "ID scanned copy on file", status: "verified", at: "2026-10-29T10:00:00.000Z" } },
      { id: "cl-demo-2", name: "Demo User", email: "demo@barrierfencing.co.zw", phone: "0770000000",
        password: "RGVtb0AxMjM=", createdAt: "2026-11-01T09:00:00.000Z", kyc: null }
    ],
    admins: [
      { id: "ad-1", username: "Munyah", email: "munyah777@gmail.com",
        password: "QEBHcmllem1hbm4xNzcjJA==", createdAt: "2026-11-06T00:00:00.000Z" }
    ],
    analytics: { pageviews: {}, events: [], daily: {} },
    content: {
      branding: {
        logo: "assets/logo.png",
        favicon: "assets/favicon.png",
        footerTagline: "Supply and installation of galvanized fencing across all 10 provinces of Zimbabwe. Materials, labour, and nationwide delivery."
      },
      seo: {
        title: "Barrier Builders | Fencing Supply & Installation — Zimbabwe",
        description: "Barrier Builders supplies and installs diamond mesh, game fence, clear view, palisade, razor wire and gates across Zimbabwe. Instant quotes, AI estimator, nationwide delivery."
      },
      hero: {
        image: "assets/img/hero-farm.jpg",
        title: "Fencing that <em>holds the line</em> across Zimbabwe.",
        subtitle: "Diamond mesh, game fence, clear view, palisade and gates — supplied, quoted and installed. Get a bill of quantities in seconds, then convert it to an invoice with one click.",
        ctaPrimaryLabel: "Instant quote calculator", ctaPrimaryHref: "calculator",
        ctaSecondaryLabel: "Try the AI estimator", ctaSecondaryHref: "estimator"
      },
      trustTabs: [
        { title: "Nationwide Delivery", subtitle: "Across Zimbabwe", href: "about" },
        { title: "Quality Assured", subtitle: "SABS Compliant", href: "about" },
        { title: "Expert Support", subtitle: "Quote to Installation", href: "contact" },
        { title: "Fast Quotations", subtitle: "Results in Seconds", href: "calculator" }
      ],
      features: [
        { num: "01", title: "Hot-dip galvanized stock", body: "Wire and posts with zinc coating built for rainy-season rust. Heights and gauges held in the Harare yard." },
        { num: "02", title: "Quote → invoice in one click", body: "Every estimate becomes a numbered quotation. Admin converts it to a VAT invoice and a trackable order instantly." },
        { num: "03", title: "Supply and install", body: "Materials only, or a full crew. Diaspora clients can pay remotely and receive WhatsApp progress photos." }
      ],
      stats: [
        { num: "15+", label: "Years on the tools" },
        { num: "1,200+", label: "Fences completed" },
        { num: "10", label: "Provinces covered" },
        { num: "USD", label: "Transparent pricing" }
      ],
      quoteBand: {
        title: "Get a fencing quote <em>in seconds.</em>",
        body: "Enter perimeter, height and fence type. The calculator builds a full bill of quantities with posts, wire, gates and labour — then saves a numbered quotation.",
        ctaLabel: "Start calculator", ctaHref: "calculator",
        hint: "Or describe the job in plain English on the AI Estimator."
      },
      about: {
        heroImage: "assets/img/hero-farm.jpg",
        heroTitle: "The fence that holds.",
        heroSub: "Barrier Builders is a Harare fencing yard: materials in stock, crews on the road, quotes that become invoices without retyping.",
        kicker: "Who we are",
        title: "Supply, install, document.",
        body: "We fence farms, homes, schools, mines and commercial yards across all ten provinces. The public site is built around two jobs: helping a buyer see the bill of quantities, and helping the office turn that quote into a tax invoice and a tracked order.",
        bullets: [
          "Hot-dip galvanized diamond mesh, game fence, clear view, palisade and razor wire",
          "Custom gates and post assemblies fabricated to opening width",
          "Diaspora orders with remote payment and WhatsApp progress photos"
        ],
        image: "assets/img/gallery-school.jpg",
        stats: [
          { num: "Harare", label: "Yard & office" },
          { num: "10", label: "Provinces" },
          { num: "12", label: "Product lines" },
          { num: "14d", label: "Quote validity" }
        ]
      },
      contact: {
        heroImage: "assets/img/hero-farm.jpg",
        heroTitle: "Talk to the yard.",
        heroSub: "Call, WhatsApp or send a message — we reply during yard hours.",
        mapNote: "Visit us at the Harare yard, or request a site survey."
      },
      footer: {
        brandText: "Supply and installation of galvanized fencing across all 10 provinces of Zimbabwe. Materials, labour, and nationwide delivery."
      },
      rules: {
        quote: "Quotations are valid for 14 days from the date of issue. Prices are in USD and include materials; installation and transport are quoted separately unless stated. A 50% deposit secures materials, balance due on completion or before dispatch for supply-only orders.",
        invoice: "Payment is due within 14 days of invoice date unless otherwise agreed. A 15% VAT is applied to all taxable supplies. Late payments may attract interest at 5% per month. Goods remain the property of Barrier Builders until paid in full."
      },
      posters: [
        { id: "po1", image: "assets/img/hero-farm.jpg", title: "Farm season special", body: "Bulk diamond mesh and game fence pricing for the planting season.", ctaLabel: "Get a quote", ctaHref: "calculator", active: true, position: "home" }
      ]
    }
  };

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function deepMerge(base, over) {
    if (over === undefined || over === null) return base;
    if (Array.isArray(base) || Array.isArray(over)) return over === undefined ? base : over;
    if (typeof base === "object" && typeof over === "object" && base && over) {
      const out = Object.assign({}, base);
      Object.keys(over).forEach(k => { out[k] = deepMerge(base[k], over[k]); });
      return out;
    }
    return over;
  }

  function seedDemoDocs(state) {
    if (state.quotes.length) return;
    const q1 = {
      id: "q-demo-1", ref: "BFS-Q-2026-1042", createdAt: "2026-10-28T09:12:00.000Z",
      status: "accepted", source: "calculator",
      customer: { name: "Tariro Ncube", contact: "0772 441 190", email: "tariro@example.com", notes: "Site in Ruwa" },
      project: { perimeter: 180, corners: 4, height: 1.8, spacing: 2.5, type: "diamond-mesh", typeName: "Diamond Mesh" },
      options: { topWire: true, gate: true, install: true, concrete: true },
      items: [
        { name: "Diamond Mesh (1.8m)", qty: "6 rolls", unitPrice: 120, total: 720 },
        { name: "Fence Posts (1.8m)", qty: "76 pcs", unitPrice: 8, total: 608 },
        { name: "Corner Posts", qty: "4 pcs", unitPrice: 12, total: 48 },
        { name: "Top Wire (barbed)", qty: "180 m", unitPrice: 0.8, total: 144 },
        { name: "Access Gate (4m)", qty: "1 set", unitPrice: 180, total: 180 },
        { name: "Concrete Post Bases", qty: "76 posts", unitPrice: 4, total: 304 },
        { name: "Installation (labour)", qty: "180 m", unitPrice: 3.5, total: 630 }
      ],
      subtotal: 2634, vat: 395.1, total: 3029.1
    };
    const q2 = {
      id: "q-demo-2", ref: "BFS-Q-2026-1088", createdAt: "2026-11-02T14:40:00.000Z",
      status: "sent", source: "ai",
      customer: { name: "Chinhoyi High School", contact: "067 21234", email: "estates@chs.ac.zw", notes: "" },
      project: { perimeter: 420, corners: 6, height: 2.1, spacing: 2.5, type: "clear-view", typeName: "Clear View Fence" },
      options: { topWire: true, gate: true, install: true, concrete: true },
      items: [
        { name: "Clear View Fence (2.1m)", qty: "140 panels", unitPrice: 190, total: 26600 },
        { name: "Fence Posts (2.1m)", qty: "174 pcs", unitPrice: 22, total: 3828 },
        { name: "Access Gate (4m)", qty: "1 set", unitPrice: 420, total: 420 }
      ],
      subtotal: 30848, vat: 4627.2, total: 35475.2
    };
    const q3 = {
      id: "q-demo-3", ref: "BFS-Q-2026-1101", createdAt: "2026-11-05T08:05:00.000Z",
      status: "draft", source: "calculator",
      customer: { name: "Farai Moyo", contact: "0783 221 009", email: "", notes: "Waiting on site visit" },
      project: { perimeter: 800, corners: 4, height: 1.8, spacing: 3, type: "game-fence", typeName: "Game Fence" },
      options: { topWire: true, gate: true, install: false, concrete: true },
      items: [
        { name: "Game Fence (1.8m)", qty: "16 rolls", unitPrice: 280, total: 4480 },
        { name: "Fence Posts (1.8m)", qty: "271 pcs", unitPrice: 12, total: 3252 }
      ],
      subtotal: 7732, vat: 1159.8, total: 8891.8
    };
    state.quotes.push(q1, q2, q3);

    const inv = {
      id: "i-demo-1", ref: "BFS-INV-2026-031", quoteRef: q1.ref, quoteId: q1.id,
      createdAt: "2026-10-30T10:00:00.000Z", dueAt: "2026-11-13T10:00:00.000Z",
      status: "paid", customer: q1.customer, project: q1.project, items: q1.items,
      subtotal: q1.subtotal, vat: q1.vat, total: q1.total, paid: q1.total
    };
    state.invoices.push(inv);
    q1.invoiceRef = inv.ref;

    state.orders.push({
      id: "o-demo-1", tracking: "BFS-TRK-88421", invoiceRef: inv.ref, quoteRef: q1.ref,
      customer: q1.customer, createdAt: "2026-10-30T10:05:00.000Z",
      status: "dispatched",
      steps: [
        { key: "pending", label: "Order received", at: "2026-10-30T10:05:00.000Z", done: true },
        { key: "confirmed", label: "Payment confirmed", at: "2026-10-30T15:20:00.000Z", done: true },
        { key: "production", label: "Materials packed", at: "2026-11-01T09:00:00.000Z", done: true },
        { key: "dispatched", label: "Dispatched to Ruwa", at: "2026-11-03T07:40:00.000Z", done: true },
        { key: "installed", label: "Installation", at: null, done: false },
        { key: "complete", label: "Complete", at: null, done: false }
      ],
      notes: "Driver: Tendai. ETA 3 Nov."
    });

    state.orders.push(demoOrder2());
  }

  function demoOrder2() {
    return {
      id: "o-demo-2", tracking: "BFS-TRK-90117", invoiceRef: "BFS-INV-2026-032", quoteRef: "BFS-Q-2026-1090",
      customer: { name: "Demo User", contact: "0770000000", email: "demo@barrierfencing.co.zw", notes: "" },
      createdAt: "2026-11-04T11:30:00.000Z", status: "production",
      steps: [
        { key: "pending", label: "Order received", at: "2026-11-04T11:30:00.000Z", done: true },
        { key: "confirmed", label: "Payment confirmed", at: "2026-11-04T14:00:00.000Z", done: true },
        { key: "production", label: "Materials packed", at: null, done: false },
        { key: "dispatched", label: "Dispatched", at: null, done: false },
        { key: "installed", label: "Installation", at: null, done: false },
        { key: "complete", label: "Complete", at: null, done: false }
      ],
      notes: ""
    };
  }

  function ensureDemoDocs(state) {
    if (!state.orders.some(o => o.id === "o-demo-2")) state.orders.push(demoOrder2());
  }

  function seedAnalytics(state) {
    if (Object.keys(state.analytics.daily).length) return;
    const today = new Date("2026-11-06");
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      state.analytics.daily[key] = {
        views: 40 + Math.round(Math.sin(i / 3) * 18 + Math.random() * 20),
        quotes: Math.max(0, Math.round(Math.random() * 4)),
        invoices: Math.random() > 0.7 ? 1 : 0
      };
    }
    state.analytics.pageviews = {
      "index": 842, "products": 410, "estimator": 266,
      "calculator": 318, "gallery": 190, "track": 74, "contact": 155
    };
  }

  function normalizeState(parsed) {
    parsed.settings = Object.assign({}, SEED.settings, parsed.settings || {});
    ["quotes","invoices","orders","contacts","clients","promotions","gallery","admins","leads"].forEach(k => {
      if (!Array.isArray(parsed[k])) parsed[k] = clone(SEED[k]);
    });
    parsed.content = deepMerge(clone(SEED.content), parsed.content || {});
    SEED.admins.forEach(sa => {
      if (!parsed.admins.some(a => a.id === sa.id || (a.username || "").toLowerCase() === sa.username.toLowerCase()))
        parsed.admins.push(clone(sa));
    });
    SEED.clients.forEach(sc => {
      if (!parsed.clients.some(c => c.id === sc.id || (c.email || "").toLowerCase() === sc.email.toLowerCase()))
        parsed.clients.push(clone(sc));
    });
    ensureDemoDocs(parsed);
    return parsed;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalizeState(JSON.parse(raw));
    } catch (e) {}
    const state = clone(SEED);
    seedDemoDocs(state);
    seedAnalytics(state);
    save(state);
    return state;
  }

  function save(state) {
    state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    pushToServer(state);
  }

  const hadPersisted = !!localStorage.getItem(KEY);
  let state = load();

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }
  function nextNum(list, fallback) {
    const nums = list.map(x => parseInt(String(x.ref || "").split("-").pop(), 10)).filter(n => !isNaN(n));
    return (nums.length ? Math.max.apply(null, nums) : fallback) + 1;
  }
  function nextRef(kind) {
    const year = new Date().getFullYear();
    if (kind === "quote") return "BFS-Q-" + year + "-" + nextNum(state.quotes, 1000);
    if (kind === "invoice") return "BFS-INV-" + year + "-" + String(nextNum(state.invoices, 30)).padStart(3, "0");
    const used = new Set(state.orders.map(o => o.tracking));
    let code;
    do { code = "BFS-TRK-" + (80000 + Math.floor(Math.random() * 19999)); } while (used.has(code));
    return code;
  }
  function money(n) {
    return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function vatOn(subtotal) {
    const rate = state.settings.vatRate || 0.15;
    const vat = Math.round(subtotal * rate * 100) / 100;
    return { vat, total: Math.round((subtotal + vat) * 100) / 100, rate };
  }

  const api = {
    get: () => state,
    settings: () => state.settings,
    saveSettings(patch) {
      Object.assign(state.settings, patch);
      save(state);
    },
    products: () => state.products,
    product(slug) { return state.products.find(p => p.slug === slug || p.id === slug); },
    saveProduct(p) {
      const i = state.products.findIndex(x => x.id === p.id);
      if (i >= 0) state.products[i] = p;
      else { p.id = p.id || uid("p"); state.products.push(p); }
      save(state);
      return p;
    },
    deleteProduct(id) {
      state.products = state.products.filter(p => p.id !== id);
      save(state);
    },
    promotions: () => state.promotions.filter(p => p.active !== false),
    allPromotions: () => state.promotions,
    savePromotion(p) {
      const i = state.promotions.findIndex(x => x.id === p.id);
      if (i >= 0) state.promotions[i] = p;
      else { p.id = uid("pr"); state.promotions.push(p); }
      save(state);
      return p;
    },
    deletePromotion(id) {
      state.promotions = state.promotions.filter(p => p.id !== id);
      save(state);
    },
    gallery: () => state.gallery,
    content: () => state.content,
    saveContent(patch) {
      state.content = deepMerge(state.content || {}, patch || {});
      save(state);
      return state.content;
    },
    savePoster(p) {
      const list = (state.content.posters = state.content.posters || []);
      const i = list.findIndex(x => x.id === p.id);
      if (i >= 0) list[i] = p; else { p.id = p.id || uid("po"); list.push(p); }
      save(state); return p;
    },
    deletePoster(id) {
      state.content.posters = (state.content.posters || []).filter(p => p.id !== id);
      save(state);
    },
    activePosters: () => (state.content.posters || []).filter(p => p.active !== false),
    saveGallery(item) {
      const i = state.gallery.findIndex(x => x.id === item.id);
      if (i >= 0) state.gallery[i] = item;
      else { item.id = uid("g"); state.gallery.push(item); }
      save(state);
      return item;
    },
    deleteGallery(id) {
      state.gallery = state.gallery.filter(g => g.id !== id);
      save(state);
    },
    quotes: () => state.quotes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    quote(ref) { return state.quotes.find(q => q.ref === ref || q.id === ref); },
    saveQuote(q) {
      if (!q.id) q.id = uid("q");
      if (!q.ref) q.ref = nextRef("quote");
      if (!q.createdAt) q.createdAt = new Date().toISOString();
      if (!q.status) q.status = "sent";
      const tax = vatOn(q.subtotal || q.items.reduce((s, i) => s + Number(i.total || 0), 0));
      q.subtotal = tax.total - tax.vat; q.vat = tax.vat; q.total = tax.total;
      const i = state.quotes.findIndex(x => x.id === q.id);
      if (i >= 0) state.quotes[i] = q; else state.quotes.push(q);
      api.track("quote");
      save(state);
      return q;
    },
    invoices: () => state.invoices.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    invoice(ref) { return state.invoices.find(i => i.ref === ref || i.id === ref); },
    quoteToInvoice(quoteRef) {
      const q = api.quote(quoteRef);
      if (!q) throw new Error("Quote not found");
      if (q.invoiceRef) {
        const existing = api.invoice(q.invoiceRef);
        if (existing && existing.quoteId === q.id) return existing;
      }
      const due = new Date(); due.setDate(due.getDate() + 14);
      const inv = {
        id: uid("i"), ref: nextRef("invoice"), quoteRef: q.ref, quoteId: q.id,
        createdAt: new Date().toISOString(), dueAt: due.toISOString(),
        status: "unpaid", customer: q.customer, project: q.project, items: q.items,
        subtotal: q.subtotal, vat: q.vat, total: q.total, paid: 0
      };
      state.invoices.push(inv);
      q.status = "converted";
      q.invoiceRef = inv.ref;
      api.track("invoice");
      const order = api.createOrderFromInvoice(inv);
      inv.tracking = order.tracking;
      save(state);
      return inv;
    },
    deleteQuote(ref) { const q = api.quote(ref); if (q) { state.quotes = state.quotes.filter(x => x.id !== q.id); save(state); } },
    deleteInvoice(ref) { const inv = api.invoice(ref); if (inv) { state.invoices = state.invoices.filter(x => x.id !== inv.id); save(state); } },
    deleteOrder(tracking) { const o = api.order(tracking); if (o) { state.orders = state.orders.filter(x => x.id !== o.id); save(state); } },
    saveInvoice(inv) {
      const i = state.invoices.findIndex(x => x.id === inv.id);
      if (i >= 0) state.invoices[i] = inv;
      save(state);
      return inv;
    },
    orders: () => state.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    order(tracking) {
      return state.orders.find(o => o.tracking === tracking || o.invoiceRef === tracking || o.quoteRef === tracking);
    },
    createOrderFromInvoice(inv) {
      const existing = state.orders.find(o => o.invoiceRef === inv.ref);
      if (existing) return existing;
      const now = new Date().toISOString();
      const order = {
        id: uid("o"), tracking: nextRef("track"), invoiceRef: inv.ref, quoteRef: inv.quoteRef,
        customer: inv.customer, createdAt: now, status: "pending",
        steps: [
          { key: "pending", label: "Order received", at: now, done: true },
          { key: "confirmed", label: "Payment confirmed", at: null, done: false },
          { key: "production", label: "Materials packed", at: null, done: false },
          { key: "dispatched", label: "Dispatched", at: null, done: false },
          { key: "installed", label: "Installation", at: null, done: false },
          { key: "complete", label: "Complete", at: null, done: false }
        ],
        notes: ""
      };
      state.orders.push(order);
      save(state);
      return order;
    },
    advanceOrder(tracking) {
      const o = api.order(tracking);
      if (!o) return null;
      const next = o.steps.find(s => !s.done);
      if (!next) return o;
      next.done = true;
      next.at = new Date().toISOString();
      o.status = next.key;
      save(state);
      return o;
    },
    saveOrder(o) {
      const i = state.orders.findIndex(x => x.id === o.id);
      if (i >= 0) state.orders[i] = o;
      save(state);
    },
    saveContact(c) {
      c.id = uid("c"); c.at = new Date().toISOString();
      state.contacts.push(c);
      save(state);
      return c;
    },
    contacts: () => state.contacts,
    /* ---- Leads (front-end quotes, AI estimates, enquiries) ---- */
    leads: () => state.leads.slice().sort((a, b) => (b.at || "").localeCompare(a.at || "")),
    lead(id) { return state.leads.find(l => l.id === id); },
    saveLead(l) {
      if (!l.id) l.id = uid("lead");
      if (!l.at) l.at = new Date().toISOString();
      if (!l.status) l.status = "new";
      const i = state.leads.findIndex(x => x.id === l.id);
      if (i >= 0) state.leads[i] = l; else state.leads.push(l);
      save(state);
      return l;
    },
    deleteLead(id) { state.leads = state.leads.filter(l => l.id !== id); save(state); },
    leadToInvoice(id) {
      const l = api.lead(id); if (!l) throw new Error("Lead not found");
      if (l.invoiceRef) return api.invoice(l.invoiceRef);
      const items = (l.items && l.items.length) ? l.items : [{ name: l.title || "Lead enquiry", qty: "1", unitPrice: l.estimate || 0, total: l.estimate || 0 }];
      const subtotal = items.reduce((s, i) => s + Number(i.total || 0), 0) || (l.estimate || 0);
      const tax = vatOn(subtotal);
      const due = new Date(); due.setDate(due.getDate() + 14);
      const inv = {
        id: uid("i"), ref: nextRef("invoice"), quoteRef: l.quoteRef || "", quoteId: l.quoteId || "",
        createdAt: new Date().toISOString(), dueAt: due.toISOString(),
        status: "unpaid",
        customer: { name: l.name || "Website lead", contact: l.contact || "", email: l.email || "", notes: l.notes || l.prompt || "" },
        project: l.project || { typeName: l.typeName || "Lead", perimeter: l.perimeter || 0 },
        items, subtotal: tax.total - tax.vat, vat: tax.vat, total: tax.total, paid: 0, leadId: l.id
      };
      state.invoices.push(inv);
      l.status = "converted"; l.invoiceRef = inv.ref;
      api.track("invoice");
      const order = api.createOrderFromInvoice(inv);
      inv.tracking = order.tracking;
      save(state);
      return inv;
    },
    /* ---- Client portal accounts ---- */
    clients: () => state.clients.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    client(id) { return state.clients.find(c => c.id === id); },
    clientByEmail(email) {
      const e = String(email || "").trim().toLowerCase();
      return state.clients.find(c => (c.email || "").toLowerCase() === e);
    },
    registerClient(p) {
      const email = String(p.email || "").trim().toLowerCase();
      if (!email || !p.password) throw new Error("Email and password are required");
      if (api.clientByEmail(email)) throw new Error("An account with that email already exists");
      const c = {
        id: uid("cl"), name: String(p.name || "").trim() || email.split("@")[0],
        email, phone: String(p.phone || "").trim(),
        password: btoa(unescape(encodeURIComponent(p.password))),
        kyc: null, createdAt: new Date().toISOString()
      };
      state.clients.push(c); save(state);
      return c;
    },
    saveClient(c) { const i = state.clients.findIndex(x => x.id === c.id); if (i >= 0) state.clients[i] = c; save(state); return c; },
    deleteClient(id) { state.clients = state.clients.filter(c => c.id !== id); save(state); },
    setClientActive(id, active) { const c = api.client(id); if (c) { c.active = !!active; save(state); } return c; },
    updateClientProfile(id, patch) { const c = api.client(id); if (c) { Object.assign(c, patch); save(state); } return c; },
    verifyClientKyc(id, ok) {
      const c = api.client(id); if (!c || !c.kyc) return null;
      c.kyc.status = ok ? "verified" : "rejected"; c.kyc.reviewedAt = new Date().toISOString();
      save(state); return c;
    },
    clientLogin(email, password) {
      const c = api.clientByEmail(email);
      if (!c || c.active === false) return null;
      if (c.password !== btoa(unescape(encodeURIComponent(password)))) return null;
      sessionStorage.setItem("bfs_client_auth", JSON.stringify({ id: c.id, at: Date.now() }));
      return c;
    },
    clientLogout() { sessionStorage.removeItem("bfs_client_auth"); },
    clientAuthed() {
      try {
        const a = JSON.parse(sessionStorage.getItem("bfs_client_auth") || "null");
        return a && a.id ? api.client(a.id) : null;
      } catch (e) { return null; }
    },
    clientOrders(client) {
      const em = (client.email || "").toLowerCase();
      const ph = (client.phone || "").replace(/\D/g, "").slice(-9);
      return state.orders.filter(o => {
        const oe = (o.customer.email || "").toLowerCase();
        const op = (o.customer.contact || "").replace(/\D/g, "").slice(-9);
        return (em && oe === em) || (ph && op && op === ph);
      }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    trackPage(path) {
      let p = path || (location.pathname.split("/").filter(Boolean).pop() || "index");
      p = p.replace(/\.html$/i, "") || "index";
      state.analytics.pageviews[p] = (state.analytics.pageviews[p] || 0) + 1;
      const day = new Date().toISOString().slice(0, 10);
      state.analytics.daily[day] = state.analytics.daily[day] || { views: 0, quotes: 0, invoices: 0 };
      state.analytics.daily[day].views += 1;
      save(state);
    },
    track(kind) {
      const day = new Date().toISOString().slice(0, 10);
      state.analytics.daily[day] = state.analytics.daily[day] || { views: 0, quotes: 0, invoices: 0 };
      if (kind === "quote") state.analytics.daily[day].quotes += 1;
      if (kind === "invoice") state.analytics.daily[day].invoices += 1;
      state.analytics.events.push({ kind, at: new Date().toISOString() });
      save(state);
    },
    analytics: () => state.analytics,
    /* ---- Admin accounts ---- */
    admins: () => state.admins.slice(),
    admin(id) { return state.admins.find(a => a.id === id); },
    saveAdmin(a) {
      if (!a.id) a.id = uid("ad");
      if (!a.createdAt) a.createdAt = new Date().toISOString();
      const i = state.admins.findIndex(x => x.id === a.id);
      if (i >= 0) state.admins[i] = a; else state.admins.push(a);
      save(state); return a;
    },
    deleteAdmin(id) {
      const me = JSON.parse(sessionStorage.getItem(AUTH_KEY) || "null");
      if (me && me.id === id) throw new Error("You cannot delete your own account");
      if (state.admins.length <= 1) throw new Error("At least one admin must remain");
      state.admins = state.admins.filter(a => a.id !== id); save(state);
    },
    setAdminActive(id, active) { const a = api.admin(id); if (a) { a.active = !!active; save(state); } return a; },
    updateAdminProfile(id, patch) { const a = api.admin(id); if (a) { Object.assign(a, patch); save(state); } return a; },
    adminAuthed() {
      try {
        const a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || "null");
        if (!a || !a.user) return null;
        let adm = a.id ? api.admin(a.id) : null;
        if (!adm) {
          // Stale or missing id: resolve by username (case-insensitive).
          const uname = String(a.user || "");
          adm = state.admins.find(x => (x.username || "").toLowerCase() === uname.toLowerCase() && x.active !== false);
          if (!adm) {
            // No matching admin at all — ensure one exists for this session user
            // so profile/admin features (which key off the session id) work.
            adm = api.saveAdmin({ username: uname, name: uname, email: "", active: true });
          }
          a.id = adm.id; a.user = adm.username || a.user;
          sessionStorage.setItem(AUTH_KEY, JSON.stringify(a));
        }
        if (adm.active === false) return null;
        return adm;
      } catch (e) { return null; }
    },
    login(user, pass) {
      const id = String(user || "").trim().toLowerCase();
      const hash = btoa(unescape(encodeURIComponent(pass || "")));
      const adm = state.admins.find(a =>
        (a.username || "").toLowerCase() === id || (a.email || "").toLowerCase() === id)
        || SEED.admins.find(a =>
        (a.username || "").toLowerCase() === id || (a.email || "").toLowerCase() === id);
      if (adm && adm.active === false) return false;
      if (adm && adm.password === hash) {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify({ id: adm.id, user: adm.username, at: Date.now() }));
        return true;
      }
      if (!adm && user === state.settings.adminUser && pass === state.settings.adminPass) {
        // Legacy settings login: map to a real admin account so profile/admin
        // features (which key off the session id) work for this user too.
        const uname = String(user);
        let target = state.admins.find(a => (a.username || "").toLowerCase() === uname.toLowerCase() && a.active !== false);
        if (!target) {
          target = api.saveAdmin({ username: uname, name: uname, email: "", password: hash, active: true });
        }
        sessionStorage.setItem(AUTH_KEY, JSON.stringify({ id: target.id, user: target.username || uname, at: Date.now() }));
        return true;
      }
      return false;
    },
    logout() { sessionStorage.removeItem(AUTH_KEY); },
    isAuthed() {
      try {
        const a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || "null");
        return !!(a && a.user);
      } catch (e) { return false; }
    },
    reset() { localStorage.removeItem(KEY); state = load(); },
    export() { return JSON.stringify(state, null, 2); },
    import(json) { state = JSON.parse(json); save(state); },
    money, vatOn, uid, nextRef,
    asset(path) {
      if (!path) return "";
      if (path.startsWith("http")) return path;
      const inAdmin = /\/admin\//.test(location.pathname);
      return inAdmin ? "../" + path.replace(/^\.\.\//, "") : path;
    }
  };

  // Pull the latest state from the PHP/MySQL API once on page load.
  // If the server has newer/different data, adopt it into localStorage and reload once.
  // If the API is unavailable (e.g. Node preview), silently stay on localStorage.
  async function syncFromServer() {
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;
      const server = JSON.parse(text);
      if (!server || server.empty) return;
      const merged = normalizeState(server);
      // Skip stale snapshots: a server copy older than persisted local state
      // must never clobber local changes (e.g. a just-created admin account).
      // Fresh browsers (no prior localStorage) always adopt the server copy.
      if (hadPersisted && (merged.updatedAt || 0) <= (state.updatedAt || 0)) return;
      const localRaw = localStorage.getItem(KEY);
      if (JSON.stringify(merged) !== localRaw) {
        localStorage.setItem(KEY, JSON.stringify(merged));
        state = merged;
        if (!sessionStorage.getItem("bfs_synced")) {
          sessionStorage.setItem("bfs_synced", "1");
          location.reload();
        }
      }
    } catch (e) { /* API unavailable — offline/localStorage mode */ }
  }
  syncFromServer();

  global.BFS = api;
})(window);
