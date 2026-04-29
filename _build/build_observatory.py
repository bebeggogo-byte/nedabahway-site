#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Observatory builder — SBM 산출물을 nedabah.org 매거진 페이지로 자동 변환.

입력:
  - ~/Documents/Obsidian Vault/Nedabah-Brain/20_AREAS/SBM시뮬레이션/산출물/{권}/{NNN}장_*/
    └── raw_transcript.md / observed_facts.md / open_questions.md
출력:
  - ~/Desktop/nedabahway-site/magazine/{CODE}/index.html       (권 표지)
  - ~/Desktop/nedabahway-site/magazine/{CODE}/{ch}/index.html  (장 관찰)

규율:
  - SBM 산출물이 없는 장은 건너뛰지 않고 "예정" 잠금 카드로 렌더 (권 표지 차례에서 보이게)
  - 9단계 골격 100% 준수, 가르침 0건 유지
  - 후원 배너를 모든 장 페이지 하단에 자동 삽입
"""
from __future__ import annotations

import re
import sys
from datetime import datetime
from pathlib import Path

VAULT = Path.home() / "Documents" / "Obsidian Vault" / "Nedabah-Brain"
SBM = VAULT / "20_AREAS" / "SBM시뮬레이션" / "산출물"
SITE = Path.home() / "Desktop" / "nedabahway-site"
OUT = SITE / "magazine"

BOOKS = [
    # (code, kr, en, sbm_dir, block, language, total)
    ("GEN", "창세기", "Genesis", "01_창세기", "오경", "히브리어", 50),
    ("EXO", "출애굽기", "Exodus", "02_출애굽기", "오경", "히브리어", 40),
    ("LEV", "레위기", "Leviticus", "03_레위기", "오경", "히브리어", 27),
    ("NUM", "민수기", "Numbers", "04_민수기", "오경", "히브리어", 36),
    ("DEU", "신명기", "Deuteronomy", "05_신명기", "오경", "히브리어", 34),
    ("PSA", "시편", "Psalms", "19_시편", "시가서", "히브리어", 150),
    ("JHN", "요한복음", "John", "43_요한복음", "복음서", "헬라어", 21),
]

ESSENCE = {
    ("GEN", 1): "빛의 자리. 같은 형식이 일곱 번 반복된다.",
    ("GEN", 2): "사람의 자리. 한 장이 한 사람을 가까이 본다.",
    ("GEN", 3): "묻는 자리. 처음의 질문이 본문을 가른다.",
    ("GEN", 4): "두 형제의 자리. 같은 행동이 다른 무게를 받는다.",
    ("GEN", 5): "족보의 자리. 같은 형식이 한 사람에서 멈춘다.",
    ("GEN", 6): "보는 자리. 누가 무엇을 보는지가 본문을 가른다.",
    ("GEN", 7): "들어가는 자리. 같은 동사가 일곱 번 놓인다.",
    ("GEN", 8): "물이 빠지는 자리. 시간이 두 단위로 적힌다.",
    ("GEN", 9): "언약의 자리. 같은 명령이 두 번 놓인다.",
    ("PSA", 1): "두 길의 자리. 대조 두 줄이 한 편을 받친다.",
    ("PSA", 2): "두 자리. 땅의 왕들과 하늘의 보좌가 같이 놓인다.",
    ("JHN", 1): "태초의 자리. 같은 말이 다른 자리에서 다시 열린다.",
    ("JHN", 2): "첫 표적. 본문은 맛이 아니라 물러나는 것을 먼저 보여 준다.",
    ("JHN", 3): "다시 태어남. '다시'라는 부사가 두 번 놓인다.",
}


def chap_dir(book_sbm_dir: str, ch: int) -> Path | None:
    base = SBM / book_sbm_dir
    if not base.exists():
        return None
    prefix = f"{ch:03d}장_"
    for p in base.iterdir():
        if p.is_dir() and p.name.startswith(prefix):
            return p
    return None


def read_md(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return ""


def md_to_html(md: str) -> str:
    """간이 마크다운 변환: 헤더·리스트·인용·단락 정도만."""
    out = []
    in_list = False
    in_quote = False
    for line in md.splitlines():
        s = line.rstrip()
        if not s:
            if in_list:
                out.append("</ul>")
                in_list = False
            if in_quote:
                out.append("</blockquote>")
                in_quote = False
            out.append("")
            continue
        if s.startswith("### "):
            if in_list:
                out.append("</ul>")
                in_list = False
            out.append(f"<h3>{s[4:]}</h3>")
        elif s.startswith("## "):
            if in_list:
                out.append("</ul>")
                in_list = False
            out.append(f"<h2>{s[3:]}</h2>")
        elif s.startswith("# "):
            if in_list:
                out.append("</ul>")
                in_list = False
            out.append(f"<h2>{s[2:]}</h2>")
        elif s.startswith("- ") or s.startswith("* "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            item = s[2:]
            item = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", item)
            out.append(f"<li>{item}</li>")
        elif s.startswith("> "):
            if not in_quote:
                out.append("<blockquote>")
                in_quote = True
            out.append(f"<p>{s[2:]}</p>")
        else:
            if in_list:
                out.append("</ul>")
                in_list = False
            if in_quote:
                out.append("</blockquote>")
                in_quote = False
            line_out = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
            line_out = re.sub(r"\*(.+?)\*", r"<em>\1</em>", line_out)
            out.append(f"<p>{line_out}</p>")
    if in_list:
        out.append("</ul>")
    if in_quote:
        out.append("</blockquote>")
    return "\n".join(out)


SUPPORT_BLOCK = """\
<aside style="margin:64px auto 0;max-width:64ch;padding:24px 28px;background:linear-gradient(180deg,#FFF 0%,#FAF6EE 100%);border:1px solid #7A5C3E;border-radius:14px;">
  <div style="color:#C2410C;font-weight:600;letter-spacing:0.06em;font-size:0.82rem;">후원으로 받치기</div>
  <h3 style="font-family:var(--ff-serif);font-size:1.2rem;font-weight:700;margin:8px 0 6px;text-wrap:balance;">이 한 장이 한 자리를 만듭니다.</h3>
  <p style="line-height:1.7;color:#1A1A1A;text-wrap:pretty;">한 장을 9단계로 푸는 데 평균 3시간이 듭니다. 광고도 결제 벽도 없이 이 자리를 열어 두기 위해, 한 번의 후원이 큰 힘이 됩니다.</p>
  <div style="margin-top:14px;padding:12px 16px;background:#FFF;border:1px dashed #7A5C3E;border-radius:8px;font-size:0.92rem;line-height:1.6;">
    <span style="color:#6B6B6B;font-size:0.78rem;letter-spacing:0.06em;">후원 계좌</span><br>
    <strong style="font-family:var(--ff-serif);">하나은행 927-910009-77504 · 네다바웨이</strong>
  </div>
  <a href="/magazine.html#support" style="display:inline-flex;align-items:center;gap:8px;margin-top:12px;background:#1A1A1A;color:#FAFAF7;padding:10px 18px;border-radius:999px;font-weight:700;font-size:0.9rem;">후원 자리 자세히 →</a>
</aside>
"""


def render_chapter(code: str, kr: str, en: str, ch: int, book_sbm_dir: str, total: int, language: str, block: str) -> str:
    """장 관찰 HTML 생성."""
    cdir = chap_dir(book_sbm_dir, ch)
    has_data = cdir is not None
    raw = read_md(cdir / "raw_transcript.md") if has_data else ""
    facts = read_md(cdir / "observed_facts.md") if has_data else ""
    questions = read_md(cdir / "open_questions.md") if has_data else ""
    synthesis = read_md(cdir / "synthesis.md") if has_data else ""
    essence = ESSENCE.get((code, ch), f"{kr} {ch}장 — 본문이 자기 시간 안에서 풀리는 자리.")

    next_ch = ch + 1 if ch < total else None
    prev_ch = ch - 1 if ch > 1 else None

    next_link = (
        f'<a href="/magazine/{code}/{next_ch}/"><div class="nav-kicker">→ 다음 장</div>'
        f'<div class="nav-title">{kr} {next_ch}장</div>'
        f'<div class="nav-preview">이어서 같은 골격으로 관찰합니다.</div></a>'
        if next_ch
        else ""
    )

    body_sections = ""
    if has_data:
        # 시뮬레이션 보기는 <details>로 접어둠. 종합 정리는 항상 펼침.
        body_sections += f"""
        <details class="stage stage--collapsed" id="s1">
          <summary>
            <span class="stage__num">단계 1</span>
            <span class="stage__title-inline">무대 장치, 배경, 소품, 소재 찾기</span>
            <span class="stage__toggle">시뮬레이션 보기 →</span>
          </summary>
          <div class="stage__inner">
            <p class="stage__intro"><strong>본문을 연극 무대처럼 상상한다.</strong> 어떤 공간인가 (지리·시대·실내/실외) · 어떤 물건이 등장하는가 (소품) · 어떤 배경 요소가 깔려 있는가 (문화·제도·계절·시간대) · 어떤 소재·재료가 쓰이는가. 이 단계에서 원어·역사·ANE·유대 문헌 배경은 무대 설정 자료로 주입한다 (해석 아닌 배경).</p>
            <div class="md-body">{md_to_html(raw[:8000])}</div>
          </div>
        </details>

        <details class="stage stage--collapsed" id="s2">
          <summary>
            <span class="stage__num">단계 2~7</span>
            <span class="stage__title-inline">첫 느낌 · 시작과 끝 · 등장인물 · 장면 컷 · 의문 · 동영상</span>
            <span class="stage__toggle">시뮬레이션 보기 →</span>
          </summary>
          <div class="stage__inner">
            <p class="stage__intro"><strong>2단계 — 첫 느낌, 분위기 기록하기.</strong> 분석 전에 먼저 첫 감을 잡는다. 진행자가 먼저 묻는 질문 — "이 본문을 처음 읽으셨을 때 어떤 느낌이셨는지요?" 이 단계를 생략하면 관찰이 바로 분석으로 미끄러진다. 반드시 먼저 수행. <strong>3단계 — 본문이 어떻게 시작하여 어떻게 끝나는지 기록하기.</strong> 첫 절·마지막 절, 시작과 끝의 관계 (수미상관·반전·대비·연속), 장이 문단 중간에서 시작/끝나는가, 완결된 단위인가. <strong>4단계 — 등장인물 또는 사물을 나열하고 처한 상황과 사상 파악하기.</strong> 인물 목록 (누가 말하고, 누가 듣는가, 누가 침묵하는가) · 각 인물의 처한 상황 (위치·상태·관계) · 본문이 보여주는 인물의 사상 (생각·태도·입장). <strong>5단계 — 장면·사건을 나누어 몇 컷의 사진 얻기.</strong> 장을 몇 개의 "컷"으로 분절한다. 이 컷들이 이후 7단계에서 동영상 흐름의 재료가 된다. <strong>6단계 — 의문점, 발견, 깨달음, 정보, 탐구 내용 등을 기록해두기.</strong> 의문점 · 발견 · 깨달음 · 정보 (원어·배경·교차 참조) · 탐구 내용. <strong>7단계 — 상황의 흐름, 논지를 연결, 또는 앞의 사진을 연결하여 *동영상* 얻기.</strong> 이 단계가 관찰의 핵심 목적이다. 5단계의 컷들을 이어서 흐르는 장면으로 만든다. 내러티브라면 사건의 진행, 서신이라면 논지의 흐름, 시편이라면 감정의 흐름. 결과물 — "이 장을 내 머릿속에서 동영상으로 재생할 수 있는가?"</p>
            <div class="md-body">{md_to_html(facts[:12000])}</div>
          </div>
        </details>

        <details class="stage stage--collapsed" id="s8">
          <summary>
            <span class="stage__num">단계 8~9</span>
            <span class="stage__title-inline">초벌 제목·부제 · 동영상 안 걷기·기도</span>
            <span class="stage__toggle">시뮬레이션 보기 →</span>
          </summary>
          <div class="stage__inner">
            <p class="stage__intro"><strong>8단계 — 초벌 제목과 부제 정하기.</strong> 제목 — 이 장의 핵심을 한 줄로. 부제 — 보조하는 한 줄. "초벌"이므로 묵상 단계에서 수정될 수 있음 (16번 단계). <strong>9단계 — 동영상 안을 걸으며 관찰 과정을 통해 알게된 것들을 주께 말씀드리고 내면의 감동과 음성에 귀 기울이기.</strong> 관찰의 마무리는 기도다. 7단계에서 얻은 동영상 안에 상상으로 들어가 걷는다. 관찰 과정에서 알게 된 것을 주께 아뢴다. 내면에 떠오르는 감동·음성·떠오름에 귀 기울인다. 답을 구하지 않고 머문다.</p>
            <div class="md-body">{md_to_html(questions[:8000])}</div>
          </div>
        </details>

        <section class="stage stage--synthesis" id="synthesis">
          <span class="stage__num" style="background:var(--c-copper);color:var(--c-bg);border-color:var(--c-copper);">종합 정리</span>
          <h2 class="stage__title">이 한 장이 한 사람을 데려가는 자리.</h2>
          <p class="stage__intro">9단계 관찰을 한 자리에 모읍니다. 외부 자료 없이도 이 장이 자기 결로 한 사람에게 닿도록 통합한 자리입니다.</p>
          <div class="md-body synthesis-body">
            {md_to_html(synthesis[:6000]) if synthesis else (
              '<p style="color:#9A9A9A;font-style:italic;padding:20px 0;">'
              '종합 정리는 이 장의 9단계가 모두 닫힌 뒤 작성됩니다. 다른 자료가 거의 불필요할 정도로 이 장 하나가 자족적이도록 통합하는 자리입니다.'
              '<br><br>이 작업에는 원어 사전·교차참조·역사 자료 등 정보 취합 시간이 더 필요합니다. 후원으로 그 시간을 같이 받쳐 주실 수 있습니다.</p>'
              '<a href="/magazine.html#support" style="display:inline-flex;align-items:center;gap:8px;background:#1A1A1A;color:#FAFAF7;padding:10px 18px;border-radius:999px;font-weight:600;font-size:0.88rem;text-decoration:none;">종합 정리를 후원으로 앞당기기 →</a>'
            )}
          </div>
        </section>
        """
    else:
        body_sections = f"""
        <section class="stage" style="padding:60px 0;text-align:center;color:#9A9A9A;">
          <p style="font-size:1.05rem;">{kr} {ch}장은 다음 발행 차례에 들어 있습니다.</p>
          <p style="margin-top:8px;font-size:0.92rem;">한 장을 9단계로 푸는 자리에 후원으로 함께 닿아 주시면, 이 페이지가 더 빨리 열립니다.</p>
          <a href="/magazine.html#support" style="display:inline-block;margin-top:14px;background:#1A1A1A;color:#FAFAF7;padding:10px 20px;border-radius:999px;font-weight:600;font-size:0.9rem;">후원으로 받치기 →</a>
        </section>
        """

    nav_row = f"""
    <div class="next-row">
      <a href="/magazine/{code}/">
        <div class="nav-kicker">↑ 권 차례</div>
        <div class="nav-title">{kr} {total}장 차례로</div>
        <div class="nav-preview">다른 장을 골라 들어가실 수 있습니다.</div>
      </a>
      {next_link}
    </div>
    """

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<title>{kr} {ch}장 — Observatory | 네다바웨이</title>
<meta name="description" content="{kr} {ch}장을 9단계로 같이 관찰합니다. {essence}">
<link rel="canonical" href="https://www.nedabah.org/magazine/{code}/{ch}/">
<link rel="stylesheet" href="/assets/v3.css">
<link rel="stylesheet" href="/assets/typography-v4.css">
<style>
  .obs-shell {{ max-width: 1180px; margin: 0 auto; padding: 64px 28px 96px; display: grid; grid-template-columns: 220px 1fr; gap: 48px; }}
  @media (max-width: 880px) {{ .obs-shell {{ grid-template-columns: 1fr; gap: 24px; }} }}
  .toc-side {{ position: sticky; top: 84px; align-self: start; border-left: 1px solid var(--c-line); padding-left: 18px; font-size: 0.86rem; }}
  @media (max-width: 880px) {{ .toc-side {{ position: static; border-left: 0; border-bottom: 1px solid var(--c-line); padding: 0 0 16px; }} }}
  .toc-side__head {{ font-size: 0.76rem; color: var(--c-mute); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }}
  .toc-side ol {{ list-style: none; padding: 0; }}
  .toc-side .toc-9steps {{ counter-reset: step; }}
  .toc-side .toc-9steps li {{ counter-increment: step; padding: 6px 0; color: var(--c-mute); text-wrap: pretty; line-height: 1.5; font-size: 0.86rem; }}
  .toc-side .toc-9steps li::before {{ content: counter(step) "."; margin-right: 8px; color: var(--c-copper); font-weight: 700; min-width: 18px; display: inline-block; }}
  .toc-side .toc-synthesis {{ counter-reset: step 9; margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--c-line2); }}
  .toc-side .toc-synthesis li {{ counter-increment: step; padding: 6px 0; line-height: 1.5; font-size: 0.9rem; }}
  .toc-side .toc-synthesis li::before {{ content: counter(step) "."; margin-right: 8px; color: var(--c-copper); font-weight: 700; min-width: 18px; display: inline-block; }}
  .toc-side a {{ display: inline; color: inherit; transition: color .15s; }}
  .toc-side a:hover {{ color: var(--c-copper); }}
  .toc-side a.is-active {{ color: var(--c-copper); font-weight: 600; }}
  .obs-mast {{ border-bottom: 1px solid var(--c-line); padding-bottom: 28px; margin-bottom: 36px; }}
  .obs-mast .crumb {{ font-size: 0.82rem; color: var(--c-mute); }}
  .obs-mast .crumb a {{ border-bottom: 1px solid currentColor; padding-bottom:1px; }}
  .obs-mast h1 {{ font-family: var(--ff-serif); font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; margin: 12px 0 6px; text-wrap: balance; }}
  .obs-mast .essence {{ margin-top: 14px; font-size: 1.04rem; color: var(--c-ink); text-wrap: pretty; max-width: 56ch; line-height: 1.7; }}
  .stage {{ margin: 44px 0; padding-top: 28px; border-top: 1px solid var(--c-line); }}
  .stage:first-of-type {{ border-top: 0; padding-top: 0; }}
  .stage__num {{ display: inline-block; font-family: var(--ff-serif); font-size: 0.9rem; font-weight: 700; color: var(--c-copper); border: 1px solid var(--c-copper); padding: 2px 10px; border-radius: 999px; }}
  .stage__title {{ font-family: var(--ff-serif); font-size: 1.5rem; font-weight: 700; margin: 12px 0 16px; text-wrap: balance; }}
  .md-body p {{ line-height: 1.85; max-width: 64ch; text-wrap: pretty; margin-top: 10px; }}
  .md-body ul {{ list-style: none; padding: 0; margin: 12px 0; }}
  .md-body li {{ padding: 8px 14px; background: rgba(194,65,12,0.04); border-left: 2px solid var(--c-copper); margin-bottom: 6px; line-height: 1.7; text-wrap: pretty; }}
  .md-body blockquote {{ font-family: var(--ff-serif); font-size: 1.06rem; line-height: 1.95; border-left: 3px solid var(--c-ink); padding: 14px 22px; margin: 12px 0; background: var(--c-surface); }}
  .next-row {{ margin-top: 56px; padding-top: 28px; border-top: 1px solid var(--c-line); display: flex; justify-content: space-between; gap: 18px; flex-wrap: wrap; }}
  .next-row a {{ border: 1px solid var(--c-line); background: var(--c-surface); padding: 18px 22px; border-radius: 10px; flex: 1 1 280px; text-decoration: none; color: inherit; transition: border-color .2s, transform .2s; }}
  .next-row a:hover {{ border-color: var(--c-copper); transform: translateY(-2px); }}
  .next-row .nav-kicker {{ font-size: 0.76rem; color: var(--c-mute); letter-spacing: 0.06em; }}
  .next-row .nav-title {{ font-family: var(--ff-serif); font-size: 1.15rem; font-weight: 700; margin-top: 6px; text-wrap: balance; }}
  .next-row .nav-preview {{ font-size: 0.88rem; color: var(--c-mute); margin-top: 6px; line-height: 1.6; text-wrap: pretty; }}
  .stage--synthesis {{ background: linear-gradient(180deg, transparent 0%, #FAF6EE 30%); padding: 36px 28px 32px; border-radius: 12px; border-top: 2px solid var(--c-copper); margin-top: 56px; }}
  .stage--synthesis .stage__title {{ color: var(--c-ink); }}
  .synthesis-body p {{ line-height: 1.85; }}
  .synthesis-body table {{ border-collapse: collapse; margin: 14px 0; font-size: 0.92rem; width: 100%; }}
  .synthesis-body th, .synthesis-body td {{ border-bottom: 1px solid var(--c-line); padding: 8px 10px; text-align: left; vertical-align: top; }}
  .synthesis-body th {{ background: rgba(194,65,12,0.06); font-weight: 700; }}

  /* 시뮬레이션 보기 — details 토글 */
  details.stage {{ border: 1px solid var(--c-line); border-radius: 10px; padding: 0; margin: 16px 0; background: var(--c-surface); }}
  details.stage[open] {{ border-color: var(--c-copper); box-shadow: 0 4px 14px rgba(26,26,26,0.04); }}
  details.stage > summary {{
    list-style: none; cursor: pointer; padding: 18px 22px;
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    transition: background .15s;
    user-select: none;
  }}
  details.stage > summary::-webkit-details-marker {{ display: none; }}
  details.stage > summary:hover {{ background: rgba(194,65,12,0.03); }}
  details.stage[open] > summary {{ border-bottom: 1px solid var(--c-line); }}
  .stage__title-inline {{
    flex: 1 1 auto; font-family: var(--ff-serif); font-size: 1.15rem;
    font-weight: 700; color: var(--c-ink); text-wrap: balance;
  }}
  .stage__toggle {{
    font-size: 0.82rem; color: var(--c-copper); font-weight: 600;
    letter-spacing: 0.04em; flex-shrink: 0;
  }}
  details.stage[open] .stage__toggle::after {{ content: ""; }}
  details.stage[open] .stage__toggle {{ color: var(--c-mute); }}
  details.stage[open] .stage__toggle::before {{ content: "접기 ↑"; }}
  details.stage[open] .stage__toggle > * {{ display: none; }}
  details.stage > summary > .stage__toggle {{ position: relative; }}
  details.stage[open] > summary > .stage__toggle {{ font-size: 0; }}
  details.stage[open] > summary > .stage__toggle::before {{ font-size: 0.82rem; }}
  .stage__inner {{ padding: 22px 26px 28px; }}
  .stage__intro {{ color: var(--c-mute); font-size: 0.95rem; line-height: 1.7; margin-bottom: 14px; text-wrap: pretty; }}
  details.stage:first-of-type {{ margin-top: 0; }}
</style>
</head>
<body>

<nav class="nav">
  <div class="nav__inner">
    <a href="/" class="nav__logo">네다바웨이</a>
    <button class="nav__toggle" onclick="document.querySelector('.nav__links').classList.toggle('is-open')">≡</button>
    <div class="nav__links">
      <a href="/blog/perspective/" class="nav__link">관점 노트</a>
      <a href="/about.html" class="nav__link">소개</a>
      <a href="/programs.html" class="nav__link">강의</a>
      <a href="/ai.html" class="nav__link">AI 작업실</a>
      <a href="/magazine.html" class="nav__link nav__link--active">관찰 Atlas</a>
      <a href="/contact.html" class="nav__cta">강의 의뢰 →</a>
    </div>
  </div>
</nav>

<div class="obs-shell">
  <aside class="toc-side">
    <div class="toc-side__head">9단계 차례</div>
    <ol class="toc-9steps">
      <li><a href="#s1" data-target="s1">무대·배경·소품·소재</a></li>
      <li><a href="#s2" data-target="s2">첫 느낌·분위기</a></li>
      <li><a href="#s2" data-target="s2">시작과 끝</a></li>
      <li><a href="#s2" data-target="s2">등장인물·사상</a></li>
      <li><a href="#s2" data-target="s2">장면 컷 분절</a></li>
      <li><a href="#s2" data-target="s2">의문·발견·깨달음</a></li>
      <li><a href="#s2" data-target="s2">동영상 흐름</a></li>
      <li><a href="#s8" data-target="s8">초벌 제목·부제</a></li>
      <li><a href="#s8" data-target="s8">동영상 걷기·기도</a></li>
    </ol>
    <ol class="toc-synthesis" start="10">
      <li><a href="#synthesis" data-target="synthesis" style="color:var(--c-copper);font-weight:700;">종합 정리</a></li>
    </ol>
  </aside>
  <main class="obs-main" style="min-width:0;">
    <header class="obs-mast">
      <div class="crumb"><a href="/magazine.html">Observatory</a> · <a href="/magazine/{code}/">{kr}</a> · {ch}장</div>
      <h1>{kr} {ch}장</h1>
      <div style="font-size:0.86rem;color:var(--c-mute);letter-spacing:0.04em;">{code}-{ch:03d} · {block} · {language}</div>
      <p class="essence">{essence}</p>
    </header>
    {body_sections}
    {nav_row}
    {SUPPORT_BLOCK}
  </main>
</div>

<script>
  // 1) Resume 쿠키
  try {{
    localStorage.setItem('observatory:last', JSON.stringify({{
      href: '/magazine/{code}/{ch}/',
      title: '{kr} {ch}장',
      excerpt: '{essence}'
    }}));
  }} catch(e) {{}}

  // 2) 사이드바 클릭 → 해당 details 자동 펼침 + 부드러운 스크롤
  (function() {{
    var navLinks = document.querySelectorAll('.toc-side a[data-target]');
    function openAndScroll(targetId) {{
      var el = document.getElementById(targetId);
      if (!el) return;
      if (el.tagName === 'DETAILS') el.open = true;
      // active 표시
      navLinks.forEach(function(a) {{ a.classList.remove('is-active'); }});
      var activeLinks = document.querySelectorAll('.toc-side a[data-target="' + targetId + '"]');
      activeLinks.forEach(function(a) {{ a.classList.add('is-active'); }});
      // 스크롤 보정 (sticky nav 약 70px 감안)
      setTimeout(function() {{
        var rect = el.getBoundingClientRect();
        window.scrollTo({{ top: window.scrollY + rect.top - 80, behavior: 'smooth' }});
      }}, 30);
    }}
    navLinks.forEach(function(a) {{
      a.addEventListener('click', function(e) {{
        e.preventDefault();
        var t = this.getAttribute('data-target');
        history.replaceState(null, '', '#' + t);
        openAndScroll(t);
      }});
    }});
    // 페이지 진입 시 해시가 있으면 동일 처리
    if (location.hash) {{
      var initial = location.hash.replace('#', '');
      if (document.getElementById(initial)) {{
        setTimeout(function() {{ openAndScroll(initial); }}, 60);
      }}
    }}
    // 스크롤 위치에 따른 active 갱신 (간이)
    var stages = ['s1', 's2', 's8', 'synthesis']
      .map(function(id) {{ var n = document.getElementById(id); return n ? {{id: id, el: n}} : null; }})
      .filter(Boolean);
    function updateActive() {{
      var y = window.scrollY + 120;
      var current = null;
      for (var i = 0; i < stages.length; i++) {{
        if (stages[i].el.offsetTop <= y) current = stages[i].id;
      }}
      if (current) {{
        navLinks.forEach(function(a) {{
          a.classList.toggle('is-active', a.getAttribute('data-target') === current);
        }});
      }}
    }}
    window.addEventListener('scroll', updateActive, {{ passive: true }});
    updateActive();
  }})();
</script>

<footer class="foot">
  <div class="foot__inner">
    <div><div class="foot__brand">네다바웨이 Nedabahway</div><p>강사 김창환 · 제주<br>한 사람의 일을 다시 디자인합니다.</p></div>
    <div class="foot__col"><h4>Observatory</h4><a href="/magazine.html">관찰 Atlas 홈</a><a href="/magazine/{code}/">{kr} 권 차례</a><a href="/magazine.html#support">후원으로 받치기</a></div>
    <div class="foot__col"><h4>둘러보기</h4><a href="/blog/perspective/">관점 노트</a><a href="/about.html">소개</a><a href="/programs.html">강의</a></div>
    <div class="foot__col"><h4>연락</h4><a href="/contact.html">강의 의뢰</a><a href="mailto:nedabah.way@gmail.com">nedabah.way@gmail.com</a></div>
  </div>
  <div class="foot__copy"><span>© 2026 Nedabahway · 김창환</span><span>nedabah.org</span></div>
</footer>

</body>
</html>
"""


def render_book_index(code: str, kr: str, en: str, book_sbm_dir: str, total: int, language: str, block: str) -> str:
    """권 표지 HTML 생성."""
    completed = []
    for ch in range(1, total + 1):
        if chap_dir(book_sbm_dir, ch):
            completed.append(ch)
    done_n = len(completed)

    cards = []
    for ch in range(1, total + 1):
        is_done = ch in completed
        ess = ESSENCE.get((code, ch), f"{kr} {ch}장")
        if is_done:
            cards.append(
                f'<a class="toc-card toc-card--done" href="/magazine/{code}/{ch}/">'
                f'<div class="toc-card__num">{ch}장</div>'
                f'<div class="toc-card__essence">{ess}</div>'
                f'<div class="toc-card__status">관찰 완료 →</div></a>'
            )
        else:
            cards.append(
                f'<a class="toc-card toc-card--pending" href="/magazine/{code}/{ch}/">'
                f'<div class="toc-card__num">{ch}장</div>'
                f'<div class="toc-card__essence" style="color:#9A9A9A">발행 예정</div>'
                f'<div class="toc-card__status" style="color:#C2410C">후원으로 앞당기기</div></a>'
            )

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<title>{kr} — Observatory | 네다바웨이</title>
<meta name="description" content="{kr} {total}장을 9단계로 같이 관찰합니다. 진행 {done_n} / {total}.">
<link rel="canonical" href="https://www.nedabah.org/magazine/{code}/">
<link rel="stylesheet" href="/assets/v3.css">
<link rel="stylesheet" href="/assets/typography-v4.css">
<style>
  .book-mast {{ max-width: 1180px; margin: 0 auto; padding: 96px 28px 56px; border-bottom: 1px solid var(--c-line); }}
  .book-mast .crumb {{ font-size: 0.82rem; color: var(--c-mute); }}
  .book-mast .crumb a {{ border-bottom: 1px solid currentColor; padding-bottom:1px; }}
  .book-mast h1 {{ font-family: var(--ff-serif); font-size: clamp(2.4rem, 6vw, 4rem); font-weight: 800; margin: 18px 0 8px; text-wrap: balance; }}
  .book-mast .en {{ font-size: 1rem; color: var(--c-mute); letter-spacing: 0.06em; }}
  .book-mast .meta-row {{ margin-top: 22px; display: flex; gap: 18px; flex-wrap: wrap; color: var(--c-mute); font-size: 0.92rem; }}
  .book-mast .meta-row span {{ padding: 4px 10px; background: #F4F2EC; border-radius: 4px; }}
  .toc {{ max-width: 1180px; margin: 64px auto 0; padding: 0 28px 96px; }}
  .toc h2 {{ font-family: var(--ff-serif); font-size: 1.6rem; font-weight: 700; margin-bottom: 22px; border-bottom: 1px solid var(--c-line); padding-bottom: 14px; text-wrap: balance; }}
  .toc-grid {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }}
  @media (max-width: 880px) {{ .toc-grid {{ grid-template-columns: repeat(3, 1fr); }} }}
  @media (max-width: 480px) {{ .toc-grid {{ grid-template-columns: repeat(2, 1fr); }} }}
  .toc-card {{ border: 1px solid var(--c-line); background: var(--c-surface); padding: 14px 14px 12px; border-radius: 8px; text-decoration: none; color: inherit; transition: border-color .15s, transform .15s; display: flex; flex-direction: column; min-height: 88px; }}
  .toc-card:hover {{ border-color: var(--c-copper); transform: translateY(-1px); }}
  .toc-card--done {{ background: #FAF7F2; }}
  .toc-card__num {{ font-family: var(--ff-serif); font-size: 1.05rem; font-weight: 700; }}
  .toc-card__essence {{ font-size: 0.8rem; color: var(--c-mute); margin-top: 4px; line-height: 1.5; text-wrap: pretty; }}
  .toc-card__status {{ margin-top: auto; font-size: 0.7rem; color: var(--c-copper); font-weight: 700; letter-spacing: 0.06em; }}
</style>
</head>
<body>

<nav class="nav">
  <div class="nav__inner">
    <a href="/" class="nav__logo">네다바웨이</a>
    <button class="nav__toggle" onclick="document.querySelector('.nav__links').classList.toggle('is-open')">≡</button>
    <div class="nav__links">
      <a href="/blog/perspective/" class="nav__link">관점 노트</a>
      <a href="/about.html" class="nav__link">소개</a>
      <a href="/programs.html" class="nav__link">강의</a>
      <a href="/ai.html" class="nav__link">AI 작업실</a>
      <a href="/magazine.html" class="nav__link nav__link--active">관찰 Atlas</a>
      <a href="/contact.html" class="nav__cta">강의 의뢰 →</a>
    </div>
  </div>
</nav>

<header class="book-mast">
  <div class="crumb"><a href="/magazine.html">Observatory</a> · {block} · {kr}</div>
  <h1>{kr}</h1>
  <div class="en">{en} · {code}</div>
  <div class="meta-row">
    <span>{block}</span>
    <span>{language}</span>
    <span>{total}장 · 진행 {done_n} / {total}</span>
  </div>
</header>

<main>
  <section class="toc">
    <h2>차례 — {total}장</h2>
    <div class="toc-grid">
      {''.join(cards)}
    </div>
  </section>
  {SUPPORT_BLOCK}
</main>

<footer class="foot">
  <div class="foot__inner">
    <div><div class="foot__brand">네다바웨이 Nedabahway</div><p>강사 김창환 · 제주<br>한 사람의 일을 다시 디자인합니다.</p></div>
    <div class="foot__col"><h4>Observatory</h4><a href="/magazine.html">관찰 Atlas 홈</a><a href="/magazine.html#support">후원으로 받치기</a></div>
    <div class="foot__col"><h4>둘러보기</h4><a href="/blog/perspective/">관점 노트</a><a href="/about.html">소개</a><a href="/programs.html">강의</a></div>
    <div class="foot__col"><h4>연락</h4><a href="/contact.html">강의 의뢰</a><a href="mailto:nedabah.way@gmail.com">nedabah.way@gmail.com</a></div>
  </div>
  <div class="foot__copy"><span>© 2026 Nedabahway · 김창환</span><span>nedabah.org</span></div>
</footer>

</body>
</html>
"""


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    built_books = 0
    built_chapters = 0
    skipped_existing = 0

    for code, kr, en, sbm_dir, block, lang, total in BOOKS:
        if only and only != code:
            continue
        # 1) 권 표지
        book_out = OUT / code / "index.html"
        book_out.parent.mkdir(parents=True, exist_ok=True)
        book_out.write_text(render_book_index(code, kr, en, sbm_dir, total, lang, block), encoding="utf-8")
        built_books += 1

        # 2) 진행된 장 + 진행되지 않은 장(예정 카드) 모두 생성 (예정 페이지는 후원 유도)
        for ch in range(1, total + 1):
            ch_out = OUT / code / str(ch) / "index.html"
            has = chap_dir(sbm_dir, ch) is not None
            # 사용자 직접 지시 2026-04-29: "창세기 1장부터 제대로 정리하면서 진행해라"
            # → GEN/1 skip 가드 제거. 모든 장이 LOCKED 9단계 빌더 표준으로 통일 렌더.
            ch_out.parent.mkdir(parents=True, exist_ok=True)
            ch_out.write_text(render_chapter(code, kr, en, ch, sbm_dir, total, lang, block), encoding="utf-8")
            if has:
                built_chapters += 1

    print(f"[observatory_build] books={built_books} chapters_with_data={built_chapters} skipped={skipped_existing}")


if __name__ == "__main__":
    main()
