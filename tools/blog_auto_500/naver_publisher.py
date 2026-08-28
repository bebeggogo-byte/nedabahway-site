"""Naver Blog auto-publisher (Playwright) — posts generated HTML to Naver.

Mirrors the NotebookLM Playwright approach already used in this stack:
a persistent browser profile keeps the Naver login session, so login is a
one-time manual step (avoids storing the password and survives CAPTCHA).

Naver discontinued its blog write API (2020); browser automation is the only
path. SmartEditor ONE has no raw-HTML mode, so we inject formatted HTML into
the contenteditable via execCommand('insertHTML') — this preserves headings,
blockquotes, bold, and links.

IMPORTANT — SmartEditor DOM changes often. All fragile selectors live in the
SELECTORS block below. On first run use HEADLESS=false and --dry-run to watch
the browser and adjust selectors as needed.

Publishing uses NO LLM calls — it is pure browser automation (zero Max cost).

Usage:
    # one-time: open a visible browser, log in to Naver manually, session persists
    python3 -m agent.blog_auto.naver_publisher --login

    # dry-run: fill title + body in the editor but DO NOT click final publish
    HEADLESS=false python3 -m agent.blog_auto.naver_publisher --post <post_dir> --dry-run

    # real publish of one post folder (generated/<cat>/<slug>/)
    python3 -m agent.blog_auto.naver_publisher --post <post_dir>

    # publish every not-yet-published post in the trays
    python3 -m agent.blog_auto.naver_publisher --all

Env:
    NAVER_ID            네이버 아이디 (default: iseeu3456)
    HEADLESS            "false" to show the browser (default: true)
    NAVER_PROFILE_DIR   persistent profile dir (default: blog_auto/playwright-naver)
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
try:
    from categorize import categorize          # when run standalone
except Exception:  # when imported as package module
    from .categorize import categorize         # type: ignore

NAVER_ID = os.environ.get("NAVER_ID", "iseeu3456")
HEADLESS = os.environ.get("HEADLESS", "true").lower() != "false"
PROFILE_DIR = Path(os.environ.get("NAVER_PROFILE_DIR", str(HERE / "playwright-naver")))
# Tray that daily3 fills (naver_ready). Override with NAVER_TRAY or --root for the
# repo-banked anchor posts (tools/blog_auto_500/generated).
TRAY = Path(os.environ.get("NAVER_TRAY", str(HERE / "naver_ready")))
PUBLISHED_LOG = HERE / "state" / "naver_published.jsonl"
WRITE_URL = f"https://blog.naver.com/{NAVER_ID}?Redirect=Write&"

# ── Fragile SmartEditor selectors — VERIFY on first run (HEADLESS=false) ──────
SELECTORS = {
    "editor_iframe": "iframe#mainFrame",                # blog write loads in this frame
    "title": ".se-section-documentTitle .se-text-paragraph",  # title contenteditable
    "body": ".se-section-text .se-text-paragraph",            # first body paragraph
    "publish_open": "button.publish_btn__m9KHH, button[data-click-area='tpb.publish']",
    "category_button": "button.selectbox_button__jb1Dt, .option_category",
    "tag_input": "input#tag-input, .tag_input__rxwOL input",
    "publish_confirm": "button.confirm_btn__WEaBq, button[data-click-area='tpb*i.publish']",
}


def _log(msg: str):
    line = f"[{datetime.now().isoformat(timespec='seconds')}] [naver] {msg}"
    print(line, flush=True)
    try:
        (HERE / "state").mkdir(parents=True, exist_ok=True)
        with (HERE / "state" / "naver_publisher.log").open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _already_published(slug: str) -> bool:
    if not PUBLISHED_LOG.exists():
        return False
    for ln in PUBLISHED_LOG.read_text(encoding="utf-8").splitlines():
        try:
            if json.loads(ln).get("slug") == slug:
                return True
        except Exception:
            continue
    return False


def _mark_published(slug: str, url: str | None):
    PUBLISHED_LOG.parent.mkdir(parents=True, exist_ok=True)
    with PUBLISHED_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"slug": slug, "url": url,
                            "at": datetime.now().isoformat(timespec="seconds")},
                           ensure_ascii=False) + "\n")


def _open_context(p):
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    ctx = p.chromium.launch_persistent_context(
        str(PROFILE_DIR), headless=HEADLESS,
        viewport={"width": 1280, "height": 900},
        args=["--disable-blink-features=AutomationControlled"],
    )
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    return ctx, page


def cmd_login() -> int:
    """One-time manual login; session persists in the profile dir."""
    from playwright.sync_api import sync_playwright
    os.environ["HEADLESS"] = "false"  # force visible for manual login
    with sync_playwright() as p:
        ctx, page = _open_context(p)
        page.goto("https://nid.naver.com/nidlogin.login")
        _log("브라우저에서 네이버에 로그인하세요. 로그인 완료 후 이 창에서 Enter.")
        try:
            input("로그인 완료 후 Enter를 누르세요... ")
        except EOFError:
            time.sleep(60)
        ctx.close()
    _log("로그인 세션 저장 완료.")
    return 0


def _seed_for(post_dir: Path) -> dict:
    sj = post_dir / "seed.json"
    return json.loads(sj.read_text(encoding="utf-8"))


def publish_post(post_dir: Path, *, dry_run: bool = False) -> dict:
    """Publish one generated post folder to Naver. Best-effort; logs + screenshot on failure."""
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

    seed = _seed_for(post_dir)
    slug = seed.get("slug", post_dir.name)
    if _already_published(slug) and not dry_run:
        _log(f"이미 발행됨 skip: {slug}")
        return {"ok": True, "skipped": True, "slug": slug}

    cat = categorize(seed)
    title = seed.get("title", slug)
    body_html = seed.get("body_html", "")
    tags = [t for t in ([seed.get("keyword")] + seed.get("coord", [])) if t][:5]

    with sync_playwright() as p:
        ctx, page = _open_context(p)
        try:
            page.goto(WRITE_URL, wait_until="domcontentloaded")
            time.sleep(3)
            if "nidlogin" in page.url or "/login" in page.url:
                _log("로그인 세션 없음 → `--login` 먼저 실행 필요.")
                ctx.close()
                return {"ok": False, "reason": "not_logged_in", "slug": slug}

            frame = page.frame_locator(SELECTORS["editor_iframe"])

            # close any "이어쓰기" / draft popup if present (best-effort)
            for label in ("취소", "닫기"):
                try:
                    page.get_by_role("button", name=label).click(timeout=1500)
                except Exception:
                    pass

            # title
            frame.locator(SELECTORS["title"]).first.click(timeout=15000)
            page.keyboard.type(title, delay=10)

            # body — focus editor, inject formatted HTML
            frame.locator(SELECTORS["body"]).first.click(timeout=15000)
            page.evaluate(
                """([html]) => {
                    const sel = window.getSelection();
                    document.execCommand && document.execCommand('insertHTML', false, html);
                }""",
                [body_html],
            )
            _log(f"본문 삽입: {slug} (제목/본문/태그 준비)")

            if dry_run:
                _log("[dry-run] 발행 클릭 생략 — 브라우저에서 확인하세요.")
                if not HEADLESS:
                    time.sleep(20)
                ctx.close()
                return {"ok": True, "dry_run": True, "slug": slug,
                        "category": cat["naver_category"], "tags": tags}

            # publish flow (selectors fragile — verify on first run)
            page.locator(SELECTORS["publish_open"]).first.click(timeout=15000)
            time.sleep(1.5)
            # category: choose by visible text
            try:
                page.get_by_text(cat["naver_category"], exact=False).first.click(timeout=4000)
            except Exception:
                _log(f"카테고리 자동선택 실패(수동 확인 필요): {cat['naver_category']}")
            # tags
            try:
                ti = page.locator(SELECTORS["tag_input"]).first
                for tg in tags:
                    ti.fill(tg)
                    page.keyboard.press("Enter")
            except Exception:
                _log("태그 입력 실패(수동 확인 필요)")
            # confirm publish
            page.locator(SELECTORS["publish_confirm"]).first.click(timeout=15000)
            time.sleep(4)
            url = page.url
            _mark_published(slug, url)
            _log(f"발행 완료: {slug} → {url}")
            ctx.close()
            return {"ok": True, "slug": slug, "url": url}

        except PWTimeout as e:
            shot = HERE / "state" / f"fail_{slug}.png"
            try:
                page.screenshot(path=str(shot))
            except Exception:
                pass
            _log(f"타임아웃(셀렉터 확인 필요): {slug} — {str(e)[:160]} · 스크린샷 {shot}")
            ctx.close()
            return {"ok": False, "reason": "selector_timeout", "slug": slug}
        except Exception as e:
            _log(f"예외: {slug} — {str(e)[:200]}")
            try:
                ctx.close()
            except Exception:
                pass
            return {"ok": False, "reason": "error", "slug": slug, "err": str(e)[:200]}


def cmd_all(*, dry_run: bool = False) -> int:
    posts = sorted([d for d in TRAY.glob("*/*") if (d / "seed.json").exists()])
    todo = [d for d in posts if not _already_published(_seed_for(d).get("slug", d.name))]
    _log(f"발행 대상 {len(todo)}편 (전체 {len(posts)})")
    ok = 0
    for d in todo:
        res = publish_post(d, dry_run=dry_run)
        if res.get("ok") and not res.get("skipped"):
            ok += 1
        if dry_run:
            break  # one is enough to verify
        time.sleep(5)  # gentle pacing between posts
    _log(f"완료: {ok}편 발행")
    return 0


def main(argv: list[str]) -> int:
    if "--login" in argv:
        return cmd_login()
    dry = "--dry-run" in argv
    if "--root" in argv:
        global TRAY
        TRAY = Path(argv[argv.index("--root") + 1])
    if "--all" in argv:
        return cmd_all(dry_run=dry)
    if "--post" in argv:
        d = Path(argv[argv.index("--post") + 1])
        res = publish_post(d, dry_run=dry)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return 0 if res.get("ok") else 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
