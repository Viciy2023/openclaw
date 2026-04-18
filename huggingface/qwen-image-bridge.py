#!/usr/bin/env python3

import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


UPSTREAM_BASE = os.environ.get("OPENCLAW_QWEN_IMAGE_BRIDGE_UPSTREAM", "").rstrip("/")
UPSTREAM_KEY = os.environ.get("OPENCLAW_QWEN_IMAGE_BRIDGE_KEY", "")
LISTEN_HOST = os.environ.get("OPENCLAW_QWEN_IMAGE_BRIDGE_HOST", "127.0.0.1")
LISTEN_PORT = int(os.environ.get("OPENCLAW_QWEN_IMAGE_BRIDGE_PORT", "18891"))


def log(message: str) -> None:
    print(message, flush=True)


def guess_extension(content_type: str) -> str:
    mime = (content_type or "image/png").split(";", 1)[0].strip().lower()
    extension = mimetypes.guess_extension(mime) or ".png"
    return extension if extension.startswith(".") else f".{extension}"


def read_json_body(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length) if length > 0 else b"{}"
    return json.loads(raw.decode("utf-8")) if raw else {}


def fetch_json(url: str, payload: dict) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {UPSTREAM_KEY}",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_bytes(url: str) -> tuple[bytes, str]:
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request, timeout=120) as response:
        content_type = response.headers.get("Content-Type", "image/png")
        return response.read(), content_type


def normalize_image_entry(entry: dict, index: int) -> dict | None:
    if isinstance(entry.get("b64_json"), str) and entry["b64_json"].strip():
        return {
            "b64_json": entry["b64_json"],
            **({"revised_prompt": entry.get("revised_prompt")} if entry.get("revised_prompt") else {}),
        }

    url = entry.get("url")
    if not isinstance(url, str) or not url.strip():
        return None

    image_bytes, content_type = fetch_bytes(url)
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return {
        "b64_json": encoded,
        "mime_type": content_type.split(";", 1)[0].strip(),
        "file_name": f"image-{index + 1}{guess_extension(content_type)}",
        **({"revised_prompt": entry.get("revised_prompt")} if entry.get("revised_prompt") else {}),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "OpenClawQwenImageBridge/1.0"

    def log_message(self, format: str, *args) -> None:
        log(f"[bridge] {self.address_string()} - {format % args}")

    def _write_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/healthz":
            self._write_json(200, {"ok": True, "status": "live"})
            return
        self._write_json(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path.rstrip("/") != "/v1/images/generations":
            self._write_json(404, {"error": "not found"})
            return
        if not UPSTREAM_BASE or not UPSTREAM_KEY:
            self._write_json(500, {"error": "bridge upstream is not configured"})
            return

        try:
            payload = read_json_body(self)
            upstream = fetch_json(f"{UPSTREAM_BASE}/images/generations", payload)
            normalized = [
                item
                for index, entry in enumerate(upstream.get("data", []))
                for item in [normalize_image_entry(entry, index)]
                if item is not None
            ]
            if not normalized:
                log(f"[bridge] upstream returned no compatible images; keys={list(upstream.keys())}")
            self._write_json(
                200,
                {
                    "created": upstream.get("created"),
                    "data": normalized,
                },
            )
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            log(f"[bridge] upstream HTTP {error.code}: {detail[:500]}")
            self._write_json(error.code, {"error": detail or f"upstream http {error.code}"})
        except Exception as error:  # noqa: BLE001
            log(f"[bridge] failure: {error}")
            self._write_json(500, {"error": str(error)})


def main() -> int:
    log(
        f"[bridge] starting qwen image bridge on http://{LISTEN_HOST}:{LISTEN_PORT} -> {UPSTREAM_BASE or '<unset>'}"
    )
    server = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
