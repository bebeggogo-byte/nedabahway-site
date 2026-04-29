#!/usr/bin/env python3
"""1차 출처 자동 분류기 — S/A/B/C 4계층 (QUALITY §1).

URL 도메인 기반 룰 + DOI/ISBN 검출. 30초 내 신뢰 라벨 결정.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

# S급 — 1차 출처 원전 (PEER/ORIGINAL)
S_DOMAINS = [
    # 성경·신학
    "stepbible.org", "biblehub.com", "blueletterbible.org", "sefaria.org",
    "bibelwissenschaft.de",  # BHS·NA28
    # 헬라·라틴 고전
    "perseus.tufts.edu", "gutenberg.org", "loebclassics.com",
    # 동양 고전
    "db.itkc.or.kr", "ctext.org", "nl.go.kr",
    # 철학
    "plato.stanford.edu", "iep.utm.edu",
    # 역사
    "sillok.history.go.kr", "db.history.go.kr",  # 조선왕조실록·국편
    "encykorea.aks.ac.kr",
    # 다 빈치
    "leonardodigitale.com", "rct.uk",  # Royal Collection Trust
    # 5거인 본인 저작 디지털판
    "archive.org", "ccel.org",  # Christian Classics Ethereal Library
]

# A급 — 학술 2차 자료 (PEER REVIEWED)
A_DOMAINS = [
    "arxiv.org", "semanticscholar.org", "doi.org", "crossref.org",
    "jstor.org", "scholar.google.com", "kci.go.kr",
    "scielo.org", "pubmed.ncbi.nlm.nih.gov",
    "cambridge.org", "oup.com", "springer.com", "wiley.com", "sciencedirect.com",
    "tandfonline.com", "nature.com", "science.org",
]

# B급 — 정책·통계 1차 출처 (POLICY/STAT)
B_DOMAINS = [
    "moe.go.kr", "kedi.re.kr", "kice.re.kr", "krivet.re.kr",
    "kostat.go.kr", "kosis.kr", "data.go.kr",
    "oecd.org", "data.oecd.org", "stats.oecd.org",
    "worldbank.org", "data.worldbank.org",
    "un.org", "unesco.org", "who.int", "ilo.org",
]

# C급 — 사례용 보조 (PRESS/INFORMAL)
PRESS_DOMAINS = [
    "nytimes.com", "bbc.com", "bbc.co.uk", "guardian.com", "theguardian.com",
    "yna.co.kr", "hani.co.kr", "chosun.com", "joongang.co.kr", "donga.com",
    "kbs.co.kr", "sbs.co.kr", "mbc.co.kr",
]

INFORMAL_DOMAINS = [
    "medium.com", "brunch.co.kr", "tistory.com", "naver.com", "blog.naver.com",
    "wordpress.com", "blogspot.com", "substack.com",
]

# 인용 금지 (위키는 1차 출처 추적 도구로만 사용)
WIKI_DOMAINS = ["wikipedia.org", "namu.wiki"]


def classify_url(url: str) -> dict:
    """URL → 신뢰 라벨 + 등급."""
    if not url:
        return {"tier": "?", "label": "", "citable": False, "note": "URL empty"}

    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return {"tier": "?", "label": "", "citable": False, "note": "invalid URL"}

    # 호스트 끝 매칭
    def has(domains):
        return any(host == d or host.endswith("." + d) for d in domains)

    if has(WIKI_DOMAINS):
        return {"tier": "C-", "label": "INFORMAL", "citable": False,
                "note": "위키 직접 인용 금지 — 1차 출처 추적 도구로만 사용"}
    if has(S_DOMAINS):
        return {"tier": "S", "label": "PEER", "citable": True, "note": "1차 출처 원전"}
    if has(A_DOMAINS):
        return {"tier": "A", "label": "PEER", "citable": True, "note": "학술 2차 자료"}
    if has(B_DOMAINS):
        return {"tier": "B", "label": "POLICY", "citable": True, "note": "정책·통계 1차"}
    if has(PRESS_DOMAINS):
        return {"tier": "C", "label": "PRESS", "citable": True,
                "note": "사례용 보조 (1건만, S~B와 교차 확인 의무)"}
    if has(INFORMAL_DOMAINS):
        return {"tier": "C-", "label": "INFORMAL", "citable": False,
                "note": "보조 신호만 (단독 인용 금지)"}

    # DOI 검출
    if re.search(r"10\.\d{4,9}/", url):
        return {"tier": "A", "label": "PEER", "citable": True, "note": "DOI 검출"}

    # 기본값: 미분류
    return {"tier": "?", "label": "", "citable": False,
            "note": "미분류 도메인 — 사용자 확정 필요"}


def main():
    """CLI: source_classifier.py URL [URL ...]"""
    import sys
    if len(sys.argv) < 2:
        # 자가 테스트
        tests = [
            "https://arxiv.org/abs/2024.12345",
            "https://www.moe.go.kr/board/abc",
            "https://en.wikipedia.org/wiki/Erasmus",
            "https://plato.stanford.edu/entries/leibniz/",
            "https://www.medium.com/@x/y",
            "https://doi.org/10.1234/abcd",
        ]
        for u in tests:
            r = classify_url(u)
            print(f"{r['tier']:3} {r['label']:9} citable={r['citable']} | {u}")
            print(f"             {r['note']}")
        return

    for u in sys.argv[1:]:
        r = classify_url(u)
        print(f"{r['tier']:3} {r['label']:9} citable={r['citable']} | {u}")
        print(f"             {r['note']}")


if __name__ == "__main__":
    main()
