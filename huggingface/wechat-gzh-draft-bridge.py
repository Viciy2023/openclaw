#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path


def mask_value(value: object, keep: int = 4) -> object:
    if not isinstance(value, str):
        return value
    if len(value) <= keep * 2:
        return "***"
    return f"{value[:keep]}...{value[-keep:]}"


def print_result_summary(result: dict) -> None:
    api_result = result.get("api_result") if isinstance(result, dict) else None
    cover_upload = result.get("cover_upload") if isinstance(result, dict) else None
    summary = {
        "action": result.get("action") if isinstance(result, dict) else None,
        "api_result": {
            "errcode": api_result.get("errcode") if isinstance(api_result, dict) else None,
            "errmsg": api_result.get("errmsg") if isinstance(api_result, dict) else None,
            "media_id": mask_value(api_result.get("media_id")) if isinstance(api_result, dict) else None,
        },
        "thumb_media_id": mask_value(result.get("thumb_media_id")) if isinstance(result, dict) else None,
        "cover_upload": {
            "errcode": cover_upload.get("errcode") if isinstance(cover_upload, dict) else None,
            "errmsg": cover_upload.get("errmsg") if isinstance(cover_upload, dict) else None,
            "media_id": mask_value(cover_upload.get("media_id")) if isinstance(cover_upload, dict) else None,
            "thumb_media_id": mask_value(cover_upload.get("thumb_media_id")) if isinstance(cover_upload, dict) else None,
        },
        "unresolved_sources_count": len(result.get("unresolved_sources", [])) if isinstance(result, dict) else None,
        "uploaded_inline_media_count": len(result.get("uploaded_inline_media", [])) if isinstance(result, dict) else None,
    }
    print("推送结果摘要：")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def main() -> int:
    runtime_dir = Path(os.environ.get("OPENCLAW_HF_WECHAT_GZH_RUNTIME_DIR", "/root/.openclaw/workspace/wechat-allauto-gzh"))
    sys.path.insert(0, str(runtime_dir / "src" / "skills"))

    from wechat_formatter_skill import execute_wechat_draft_add  # type: ignore

    payload = json.load(sys.stdin)
    result = execute_wechat_draft_add(
        app_id=payload["app_id"],
        app_secret=payload["app_secret"],
        title=payload["title"],
        markdown_content=payload["markdown_content"],
        media_list=payload.get("media_list"),
        cover_image_url=payload.get("cover_image_url"),
        thumb_media_id=payload.get("thumb_media_id"),
        digest=payload.get("digest", ""),
        author=payload.get("author", ""),
        content_source_url=payload.get("content_source_url", ""),
        need_open_comment=payload.get("need_open_comment", 0),
        only_fans_can_comment=payload.get("only_fans_can_comment", 0),
        theme_name=payload.get("theme_name", "default"),
        themes_dir=payload.get("themes_dir", "./themes"),
        allow_unmapped_images=payload.get("allow_unmapped_images", False),
    )
    print_result_summary(result)
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
