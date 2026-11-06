/* Fence BOQ + AI rules engine */
(function (global) {
  function catalogItem(slug) {
    return BFS.product(slug) || BFS.products()[0];
  }

  function computeBOQ(input) {
    const p = catalogItem(input.type);
    const perimeter = Math.max(0, Number(input.perimeter) || 0);
    const corners = Math.max(0, Number(input.corners) || 0);
    const height = Number(input.height) || 1.8;
    const spacing = Math.max(1, Number(input.spacing) || 2.5);
    const opts = input.options || {};
    if (!p || perimeter <= 0) return { items: [], subtotal: 0, p, input };

    const items = [];
    const rolls = Math.max(1, Math.ceil(perimeter / (p.rollMetres || 30)));
    items.push({
      name: p.name + " (" + height.toFixed(1) + "m)",
      sku: p.slug, qty: rolls + (p.unit === "panel" ? " panels" : " rolls"),
      qtyNum: rolls, unitPrice: p.rollPrice, total: rolls * p.rollPrice
    });

    const posts = Math.ceil(perimeter / spacing) + corners;
    if (p.postPrice) {
      items.push({
        name: "Fence Posts (" + height.toFixed(1) + "m)",
        sku: "posts", qty: posts + " pcs", qtyNum: posts,
        unitPrice: p.postPrice, total: posts * p.postPrice
      });
    }
    if (corners > 0 && p.postPrice) {
      items.push({
        name: "Corner Posts", sku: "corner-posts", qty: corners + " pcs", qtyNum: corners,
        unitPrice: Math.round(p.postPrice * 1.5 * 100) / 100,
        total: Math.round(corners * p.postPrice * 1.5 * 100) / 100
      });
    }
    if (opts.topWire && p.topWirePerM) {
      const t = Math.round(perimeter * p.topWirePerM * 100) / 100;
      items.push({ name: "Top Wire (barbed / razor)", sku: "top-wire", qty: perimeter + " m", qtyNum: perimeter, unitPrice: p.topWirePerM, total: t });
    }
    if (opts.gate && p.gatePrice) {
      items.push({ name: "Access Gate (4m)", sku: "gates", qty: "1 set", qtyNum: 1, unitPrice: p.gatePrice, total: p.gatePrice });
    }
    if (opts.concrete && p.concretePerPost) {
      items.push({ name: "Concrete Post Bases", sku: "concrete", qty: posts + " posts", qtyNum: posts, unitPrice: p.concretePerPost, total: posts * p.concretePerPost });
    }
    if (opts.install && p.installPerM) {
      const t = Math.round(perimeter * p.installPerM * 100) / 100;
      items.push({ name: "Installation (labour)", sku: "install", qty: perimeter + " m", qtyNum: perimeter, unitPrice: p.installPerM, total: t });
    }
    items.push({ name: "Binding wire & fittings", sku: "fittings", qty: "1 lot", qtyNum: 1, unitPrice: 60, total: 60 });

    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const tax = BFS.vatOn(subtotal);
    return { items, subtotal, vat: tax.vat, total: tax.total, p, input: { perimeter, corners, height, spacing, type: p.slug, typeName: p.name, options: opts } };
  }

  function detectFenceType(text) {
    const t = text.toLowerCase();
    let best = BFS.products()[0], bestScore = 0;
    BFS.products().forEach(p => {
      let score = 0;
      (p.keywords || []).forEach(k => { if (t.includes(k)) score += 1; });
      if (t.includes(p.name.toLowerCase())) score += 5;
      if (t.includes(p.slug.replace("-", " "))) score += 3;
      if (score > bestScore) { bestScore = score; best = p; }
    });
    return best;
  }

  function detectPerimeter(text) {
    const t = text.toLowerCase();
    const ha = t.match(/(\d+(?:\.\d+)?)\s*(hectare|hectares|ha)\b/);
    if (ha) return Math.round(Math.sqrt(parseFloat(ha[1]) * 10000) * 4);
    const ac = t.match(/(\d+(?:\.\d+)?)\s*(acre|acres)\b/);
    if (ac) return Math.round(Math.sqrt(parseFloat(ac[1]) * 4046.86) * 4);
    const matches = t.matchAll(/(\d+(?:\.\d+)?)\s*(m|metres?|meters?|km)\b/g);
    for (const m of matches) {
      let n = parseFloat(m[1]);
      if (m[2] === "km") n *= 1000;
      if (n >= 0.5 && n <= 4 && m[2] !== "km") continue;
      return Math.round(n);
    }
    return 100;
  }

  function detectHeight(text, fallback) {
    const m = text.toLowerCase().match(/(\d(?:\.\d)?)\s*m(?:etre)?s?\s*(?:high|tall|height)?/) ||
              text.toLowerCase().match(/height\s*(?:of\s*)?(\d(?:\.\d)?)/);
    if (m) {
      const h = parseFloat(m[1]);
      if (h >= 0.6 && h <= 3.5) return h;
    }
    return fallback || 1.8;
  }

  function detectOptions(text) {
    const t = text.toLowerCase();
    return {
      topWire: /top\s*wire|barbed\s*top|razor/.test(t),
      gate: /gate|entrance|access/.test(t),
      install: /install|labour|labor|erect|fit/.test(t),
      concrete: /concrete|cement|footing|base/.test(t)
    };
  }

  function estimateFromText(text) {
    const p = detectFenceType(text);
    const perimeter = detectPerimeter(text);
    const height = detectHeight(text, 1.8);
    const options = detectOptions(text);
    const boq = computeBOQ({ type: p.slug, perimeter, corners: 4, height, spacing: 2.5, options });
    const low = Math.round(boq.subtotal * 0.9 / 10) * 10;
    const high = Math.round(boq.subtotal * 1.15 / 10) * 10;
    return Object.assign({ product: p, low, high, prompt: text }, boq);
  }

  function persistQuote(boq, customer, source) {
    const q = {
      source: source || "calculator",
      status: "sent",
      customer: customer || { name: "Walk-in", contact: "", email: "", notes: "" },
      project: boq.input,
      options: boq.input.options,
      items: boq.items,
      subtotal: boq.subtotal
    };
    return BFS.saveQuote(q);
  }

  global.BFSEst = { computeBOQ, estimateFromText, persistQuote, detectFenceType };
})(window);
