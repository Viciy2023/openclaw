#!/usr/bin/env python3

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from PIL import Image, ImageOps


WATCH_DIR = Path(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_WATCH_DIR", "/root/.openclaw/media/tool-image-generation"))
MAX_EDGE = int(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_MAX_EDGE", "1024"))
JPEG_QUALITY = int(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_QUALITY", "80"))
POLL_INTERVAL = float(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_POLL_INTERVAL", "1.5"))
MIN_AGE_SECONDS = float(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_MIN_AGE", "2.0"))
MARKER_SUFFIX = ".weixin-normalized"
SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def log(message: str) -> None:
    print(f"[weixin-image-normalizer] {message}", flush=True)


def marker_path(file_path: Path) -> Path:
    return file_path.with_name(f"{file_path.name}{MARKER_SUFFIX}")


def should_process(file_path: Path) -> bool:
    if file_path.suffix.lower() not in SUPPORTED_EXTS:
        return False
    if not file_path.is_file():
        return False
    if marker_path(file_path).exists():
        return False
    age = time.time() - file_path.stat().st_mtime
    return age >= MIN_AGE_SECONDS


def normalize_image(file_path: Path) -> None:
    tmp_path = file_path.with_suffix(".weixin-tmp.jpg")
    with Image.open(file_path) as image:
      image = ImageOps.exif_transpose(image)
      rgb = image.convert("RGB")
      rgb.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
      rgb.save(tmp_path, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=False)

    tmp_path.replace(file_path)
    marker_path(file_path).write_text(
        f"normalized_at={int(time.time())}\nquality={JPEG_QUALITY}\nmax_edge={MAX_EDGE}\n",
        encoding="utf-8",
    )
    log(f"normalized image for weixin upload: {file_path}")


def main() -> int:
    WATCH_DIR.mkdir(parents=True, exist_ok=True)
    log(f"watching {WATCH_DIR} (max_edge={MAX_EDGE}, quality={JPEG_QUALITY})")
    while True:
        try:
            for file_path in sorted(WATCH_DIR.iterdir()):
                if not should_process(file_path):
                    continue
                try:
                    normalize_image(file_path)
                except Exception as error:  # noqa: BLE001
                    log(f"failed to normalize {file_path}: {error}")
        except Exception as error:  # noqa: BLE001
            log(f"watch loop error: {error}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    raise SystemExit(main())
