/* Barrier Builders Admin — export / import helpers (CSV, Excel, PDF, PNG) */
(function (global) {
  const CDN = {
    xlsx: "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js",
    jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    autotable: "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
    html2canvas: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }
  async function ensureXLSX() { if (!global.XLSX) await loadScript(CDN.xlsx); return global.XLSX; }
  async function ensurePDF() {
    if (!global.jspdf) await loadScript(CDN.jspdf);
    if (!global.jspdf.jsPDF) await loadScript(CDN.jspdf);
    if (!global.jsPDF) { /* umd exposes jsPDF */ }
    if (!global.jspdf || !global.jspdf.jsPDF) throw new Error("jsPDF unavailable");
    if (!global.autoTable) await loadScript(CDN.autotable);
    return global.jspdf.jsPDF;
  }
  async function ensureCanvas() { if (!global.html2canvas) await loadScript(CDN.html2canvas); return global.html2canvas; }

  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
  }

  function toCSV(headers, rows) {
    const esc = v => {
      v = v == null ? "" : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    const lines = [headers.map(esc).join(",")];
    rows.forEach(r => lines.push(r.map(esc).join(",")));
    return lines.join("\r\n");
  }

  function parseCSV(text) {
    const rows = []; let row = [], cur = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i+1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i+1] === "\n") i++;
        row.push(cur); cur = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else cur += c;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  const api = {
    download,
    toCSV,
    parseCSV,
    exportCSV(filename, headers, rows) {
      download(filename, toCSV(headers, rows), "text/csv");
    },
    async exportExcel(filename, sheetName, headers, rows) {
      const XLSX = await ensureXLSX();
      const ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, (sheetName || "Data").slice(0, 31));
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      download(filename, new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    },
    async exportPDF(filename, title, headers, rows, subtitle) {
      const jsPDF = await ensurePDF();
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16); doc.text(title || "Report", 14, 16);
      if (subtitle) { doc.setFontSize(10); doc.setTextColor(120); doc.text(subtitle, 14, 23); doc.setTextColor(0); }
      doc.autoTable({
        startY: subtitle ? 28 : 22,
        head: [headers],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 114, 67] },
        alternateRowStyles: { fillColor: [245, 250, 247] }
      });
      doc.save(filename);
    },
    async exportPNG(filename, element) {
      const html2canvas = await ensureCanvas();
      const target = typeof element === "string" ? document.querySelector(element) : element;
      if (!target) throw new Error("Element not found for PNG export");
      const canvas = await html2canvas(target, { backgroundColor: "#ffffff", scale: 2 });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    },
    async importCSV(file) {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) return { headers: [], rows: [] };
      return { headers: rows[0], rows: rows.slice(1) };
    },
    async importExcel(file) {
      const XLSX = await ensureXLSX();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (!aoa.length) return { headers: [], rows: [] };
      return { headers: aoa[0].map(String), rows: aoa.slice(1) };
    }
  };

  global.BFSAdmin = api;
})(window);
