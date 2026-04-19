#!/usr/bin/env python3

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

from PIL import Image, ImageOps


WATCH_DIR = Path(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_WATCH_DIR", "/root/.openclaw/media/tool-image-generation"))
MAX_EDGE = int(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_MAX_EDGE", "2048"))
TARGET_MAX_BYTES = int(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_TARGET_MAX_BYTES", str(1572864)))
MIN_SCALE_RATIO = float(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_MIN_SCALE_RATIO", "0.7"))
SCALE_STEP = float(os.environ.get("OPENCLAW_HF_WEIXIN_IMAGE_SCALE_STEP", "0.92"))
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
    output_format = "PNG"
    tmp_suffix = ".weixin-tmp.png"
    tmp_path = file_path.with_suffix(tmp_suffix)
    with Image.open(file_path) as image:
        image = ImageOps.exif_transpose(image)
        original_size = image.size
        if max(image.size) > MAX_EDGE:
            image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        png_image = image
        if png_image.mode not in {"RGB", "RGBA"}:
            png_image = png_image.convert("RGBA" if "A" in png_image.getbands() else "RGB")

        current = png_image
        current_ratio = 1.0
        while True:
            current.save(tmp_path, format="PNG", optimize=True, compress_level=9)
            current_bytes = tmp_path.stat().st_size
            if current_bytes <= TARGET_MAX_BYTES or current_ratio <= MIN_SCALE_RATIO:
                break

            next_width = max(1, int(current.width * SCALE_STEP))
            next_height = max(1, int(current.height * SCALE_STEP))
            current = current.resize((next_width, next_height), Image.Resampling.LANCZOS)
            current_ratio *= SCALE_STEP

    tmp_path.replace(file_path)
    marker_path(file_path).write_text(
        f"normalized_at={int(time.time())}\nmax_edge={MAX_EDGE}\ntarget_max_bytes={TARGET_MAX_BYTES}\noriginal_size={original_size[0]}x{original_size[1]}\noutput_format={output_format}\n",
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
