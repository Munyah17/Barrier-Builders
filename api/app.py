#!/usr/bin/env python3
"""
Optional Barrier Fencing API for cPanel / Python.
Run locally:  python api/app.py
On cPanel:    Passenger WSGI or python app.py behind a reverse proxy.

JSON files live in ../data/ when the process has write access.
The public site already works fully from the browser store without this.

If XAI_API_KEY is set, POST /estimate can call SpaceXAI (xAI) to refine
the natural-language fence estimate. Otherwise the JS rules engine is used.
"""
from __future__ import annotations

import json
import os
import ssl
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
PORT = int(os.environ.get("PORT", "8787"))
XAI_KEY = os.environ.get("XAI_API_KEY", "")
XAI_URL = "https://api.x.ai/v1/chat/completions"
XAI_MODEL = os.environ.get("XAI_MODEL", "grok-4")


def _read(name: str, default):
    path = DATA / name
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def _write(name: str, payload) -> None:
    (DATA / name).write_text(json.dumps(payload, indent=2), encoding="utf-8")


class Handler(BaseHTTPRequestHandler):
    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _json(self, code: int, payload) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/health"):
            self._json(200, {"ok": True, "service": "barrier-fencing-api", "ai": bool(XAI_KEY)})
            return
        if self.path.startswith("/data/"):
            name = self.path.split("/data/")[-1]
            if name not in {"products.json", "promotions.json", "gallery.json", "settings.json"}:
                self._json(404, {"error": "unknown collection"})
                return
            self._json(200, _read(name, []))
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._json(400, {"error": "invalid json"})
            return

        if self.path == "/estimate":
            self._json(200, estimate(payload.get("prompt", "")))
            return
        if self.path.startswith("/data/"):
            name = self.path.split("/data/")[-1]
            _write(name, payload)
            self._json(200, {"ok": True})
            return
        self._json(404, {"error": "not found"})

    def log_message(self, fmt: str, *args) -> None:
        print("[api]", fmt % args)


def estimate(prompt: str) -> dict:
    """Optional LLM pass. The browser engine remains the default."""
    if not prompt.strip():
        return {"error": "prompt required"}
    if not XAI_KEY:
        return {
            "engine": "rules-fallback",
            "note": "Set XAI_API_KEY to enable SpaceXAI. The website JS estimator already produces a BOQ without this API.",
            "prompt": prompt,
        }
    body = json.dumps({
        "model": XAI_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a Zimbabwe fencing estimator for Barrier Fencing Solutions. "
                    "Return JSON only with keys: product, perimeter_m, height_m, notes, "
                    "and items: [{name, qty, unit_price_usd}]."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }).encode("utf-8")
    req = urllib.request.Request(
        XAI_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {XAI_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
        return {"engine": "spacexai", "model": XAI_MODEL, "raw": content}
    except Exception as exc:  # noqa: BLE001
        return {"engine": "error", "error": str(exc)}


def application(environ, start_response):
    """Passenger / WSGI shim: health only; prefer the stdlib server for full routes."""
    start_response("200 OK", [("Content-Type", "application/json")])
    return [json.dumps({"ok": True, "hint": "run python api/app.py for the full API"}).encode()]


if __name__ == "__main__":
    print(f"Barrier Fencing API on http://127.0.0.1:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
