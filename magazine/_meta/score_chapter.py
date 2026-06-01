#!/usr/bin/env python3
"""SBM 장 품질 채점 — 100점 만점. 100점 미만이면 비통과(재작업).
자동 검증 가능한 구조·메타·시뮬레이션·형식·검증 항목만 채점한다.
(본문 사실성·원어 정확성은 작성 에이전트 책임 + 사람 검토 영역)
사용: python3 magazine/_meta/score_chapter.py magazine/LEV/1/index.html [...]
종료코드: 모든 장 100점이면 0, 아니면 1.
"""
import sys, re, subprocess, os
from bs4 import BeautifulSoup

ACTIVE = ["P01","P02","P04","P05","P07","P11"]
PLACEHOLDER_ESSENCE = "본문이 자기 시간 안에서 풀리는 결."

def score(path):
    s = open(path, encoding="utf-8").read()
    soup = BeautifulSoup(s, "html.parser")
    items = []  # (label, points, ok)
    def chk(label, pts, ok): items.append((label, pts, bool(ok)))

    # 구조 40
    chk("details#s1", 8, soup.select_one("#s1"))
    chk("details#s2", 8, soup.select_one("#s2"))
    chk("details#s8", 8, soup.select_one("#s8"))
    syn = soup.select_one("#synthesis")
    chk("section#synthesis", 8, syn)
    # 종합 정리 본문 충실도(>=400자). table은 권장이나 필수 아님(골든 GEN/1 미보유).
    chk("synthesis 본문 충실(>=400자)", 8, syn and len(syn.get_text(strip=True)) >= 400)

    # 메타 20
    title = soup.select_one("title")
    chk("title 고유", 4, title and "Observatory" in title.get_text() and "—" in title.get_text())
    chk("canonical", 4, soup.select_one('link[rel="canonical"]'))
    ess = soup.select_one(".obs-mast .essence")
    chk("essence 고유", 4, ess and ess.get_text(strip=True) and not ess.get_text(strip=True).endswith(PLACEHOLDER_ESSENCE))
    chk("sim_id 고유", 4, re.search(r'sim_id:\s*[A-Z0-9]{3}-\d{3}', s))
    chk("정경·원어 배지", 4, re.search(r'[A-Z0-9]{3}-\d{3}\s*·\s*\S+\s*·\s*(히브리어|헬라어|아람어)', s))

    # 시뮬레이션 20
    chk("진행자 성령일_선교사", 4, "성령일" in s)
    present = sum(1 for p in ACTIVE if re.search(r'<strong>'+p+r'\b', s))
    chk(f"6인 발화({present}/6)", 16, present == 6)

    # 면책·원어 10
    chk("면책 blockquote", 5, "시뮬레이션용 가상 대화" in s)
    chk("원어 음역", 5, re.search(r'(hebrew_terms|greek_terms):\s*\[[^\]]*[a-zA-Z]', s))

    # 드리프트·검증 10  (drift_flag false 2 + htmlhint 8)
    chk("drift_flag false", 2, re.search(r'drift_flag:\s*false', s))
    hh = subprocess.run(["npx","htmlhint",path], capture_output=True, text=True)
    chk("htmlhint 0오류", 8, "no errors" in (hh.stdout+hh.stderr))

    total = sum(p for _,p,ok in items if ok)
    return total, items

def main():
    allpass = True
    for path in sys.argv[1:]:
        if not os.path.exists(path):
            print(f"✗ {path}: 파일 없음"); allpass=False; continue
        total, items = score(path)
        status = "✅ PASS" if total==100 else "❌ FAIL"
        if total!=100: allpass=False
        ch = re.search(r'magazine/(\w+)/(\d+)/', path)
        tag = f"{ch.group(1)} {ch.group(2)}장" if ch else path
        print(f"{status} {tag}: {total}/100")
        if total!=100:
            for label,pts,ok in items:
                if not ok: print(f"    -{pts} {label}")
    sys.exit(0 if allpass else 1)

if __name__=="__main__": main()
