#!/usr/bin/env python3
"""1차 출처 자동 분류기 — S/A/B/C 4계층 (QUALITY §1).

URL 도메인 기반 룰 + DOI 검출. 30초 내 신뢰 라벨 결정.
sources_directory.json 130+ 해외·국내 1차 출처 반영.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

# ─── S급 — 1차 출처 원전 ──────────────────────────────────────────
S_DOMAINS = [
    # 성경·신학·교부
    "bibelwissenschaft.de", "stepbible.org", "biblehub.com", "blueletterbible.org",
    "sefaria.org", "ccel.org", "earlychurchtexts.com", "patristica.net",
    "newadvent.org", "openscriptures.org", "hb.openscriptures.org", "sblgnt.com",
    # 헬라·라틴 고전
    "perseus.tufts.edu", "loebclassics.com", "stephanus.tlg.uci.edu",
    "logeion.uchicago.edu", "latin.packhum.org", "inscriptions.packhum.org",
    "wikisource.org",  # 1차 텍스트 서브셋
    # 동양 고전·한국사
    "db.itkc.or.kr", "ctext.org", "nl.go.kr", "encykorea.aks.ac.kr",
    "sillok.history.go.kr", "sjw.history.go.kr", "db.history.go.kr",
    "stdict.korean.go.kr",
    # 철학 백과 (캐논)
    "plato.stanford.edu", "iep.utm.edu", "iranicaonline.org",
    # 다 빈치·예술
    "leonardodigitale.com", "rct.uk",
    # 5거인 본인 저작·원전 디지털
    "archive.org", "gutenberg.org", "hathitrust.org",
    # 세계 종교 1차
    "sacred-texts.com",
    # 대학 도서관 (1차 자료 보유)
    "library.harvard.edu", "library.yale.edu", "library.princeton.edu",
    "bodleian.ox.ac.uk", "lib.cam.ac.uk", "library.stanford.edu",
    "lib.uchicago.edu", "library.columbia.edu", "lib.berkeley.edu",
    "ub.uni-heidelberg.de", "gallica.bnf.fr", "bl.uk",
    "huji.ac.il", "english.tau.ac.il",
    "efa.gr", "ascsa.edu.gr",
    "uni-tuebingen.de", "ens.psl.eu",
    "lib.u-tokyo.ac.jp", "lib.pku.edu.cn",
    "universiteitleiden.nl", "digi.vatlib.it",
    # 박물관·문화 1차
    "wellcomecollection.org", "si.edu", "getty.edu", "metmuseum.org",
    "europeana.eu", "dp.la", "imslp.org", "eudocs.lib.byu.edu",
    # 한국 1차
    "kmooc.kr",
]

# ─── A급 — 학술 2차 자료 (PEER REVIEWED) ───────────────────────────
A_DOMAINS = [
    "arxiv.org", "semanticscholar.org", "doi.org", "crossref.org",
    "jstor.org", "muse.jhu.edu", "scholar.google.com", "kci.go.kr",
    "scielo.org", "pubmed.ncbi.nlm.nih.gov",
    "cambridge.org", "oup.com", "academic.oup.com",
    "springer.com", "link.springer.com", "wiley.com", "onlinelibrary.wiley.com",
    "sciencedirect.com", "tandfonline.com", "nature.com", "science.org",
    "philpapers.org", "doaj.org", "oaister.worldcat.org",
    "base-search.net", "core.ac.uk", "repec.org", "ssrn.com",
    "dbpia.co.kr", "riss.kr",
    "rep.routledge.com", "academic.eb.com", "oxfordre.com",
    "mathworld.wolfram.com", "planetmath.org",
    # 오픈 코스웨어 (학술 강의)
    "ocw.mit.edu", "oyc.yale.edu", "online-learning.harvard.edu",
    "online.stanford.edu", "coursera.org", "edx.org", "open.edu",
    "press.jhu.edu",
    # 기타 학술
    "persee.fr", "lib.nus.edu.sg", "libportal.nus.edu.sg",
    "jewishvirtuallibrary.org",
    "etymonline.com",
    "cslewisinstitute.org",
]

# ─── B급 — 정책·통계 1차 ──────────────────────────────────────────
B_DOMAINS = [
    # 한국 정책·통계
    "moe.go.kr", "kedi.re.kr", "kice.re.kr", "krivet.re.kr",
    "kostat.go.kr", "kosis.kr", "data.go.kr",
    # 국제 기구
    "oecd.org", "data.oecd.org", "stats.oecd.org", "oecd-ilibrary.org",
    "worldbank.org", "data.worldbank.org",
    "un.org", "data.un.org", "unesco.org", "uis.unesco.org",
    "who.int", "ilo.org", "imf.org", "ec.europa.eu",
    # 싱크탱크 (정책 1차)
    "pewresearch.org", "brookings.edu", "rand.org", "weforum.org",
    # 한국어 보조 사전 (정책급 신뢰)
    "ko.dict.naver.com",
]

# ─── C급 — 사례용 보조 (PRESS) ────────────────────────────────────
PRESS_DOMAINS = [
    "nytimes.com", "bbc.com", "bbc.co.uk", "guardian.com", "theguardian.com",
    "theatlantic.com", "newyorker.com",
    "lemonde.fr", "faz.net", "asahi.com",
    "yna.co.kr", "hani.co.kr", "chosun.com", "joongang.co.kr", "donga.com",
    "kbs.co.kr", "sbs.co.kr", "mbc.co.kr",
]

# ─── C-급 — 보조 신호 (INFORMAL) ──────────────────────────────────
INFORMAL_DOMAINS = [
    "medium.com", "brunch.co.kr", "tistory.com", "naver.com", "blog.naver.com",
    "wordpress.com", "blogspot.com", "substack.com",
]

# 인용 금지 (1차 출처 추적 도구로만)
WIKI_DOMAINS = ["wikipedia.org", "namu.wiki"]


def classify_url(url: str) -> dict:
    if not url:
        return {"tier": "?", "label": "", "citable": False, "note": "URL empty"}

    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return {"tier": "?", "label": "", "citable": False, "note": "invalid URL"}

    if host.startswith("www."):
        host = host[4:]

    def has(domains):
        return any(host == d or host.endswith("." + d) for d in domains)

    if has(WIKI_DOMAINS):
        return {"tier": "C-", "label": "INFORMAL", "citable": False,
                "note": "위키 직접 인용 금지 — 1차 출처 추적 도구로만 사용"}
    if has(S_DOMAINS):
        return {"tier": "S", "label": "PEER", "citable": True, "note": "1차 출처 원전·대학 도서관·박물관"}
    if has(A_DOMAINS):
        return {"tier": "A", "label": "PEER", "citable": True, "note": "학술 2차 자료 (동료심사)"}
    if has(B_DOMAINS):
        return {"tier": "B", "label": "POLICY", "citable": True, "note": "정책·통계 1차"}
    if has(PRESS_DOMAINS):
        return {"tier": "C", "label": "PRESS", "citable": True,
                "note": "사례용 보조 (1건만, S~B와 교차 확인 의무)"}
    if has(INFORMAL_DOMAINS):
        return {"tier": "C-", "label": "INFORMAL", "citable": False,
                "note": "보조 신호만 (단독 인용 금지)"}

    if re.search(r"10\.\d{4,9}/", url):
        return {"tier": "A", "label": "PEER", "citable": True, "note": "DOI 검출"}

    return {"tier": "?", "label": "", "citable": False,
            "note": "미분류 도메인 — 사용자 확정 필요"}


def main():
    import sys
    if len(sys.argv) < 2:
        # 자가 테스트 — 새로 추가된 도메인 검증
        tests = [
            "https://library.harvard.edu/special",
            "https://digi.vatlib.it/view/MSS_Vat.gr.1209",
            "https://gallica.bnf.fr/ark:/12148/bpt6k123",
            "https://www.sefaria.org/Genesis.1",
            "https://stephanus.tlg.uci.edu/",
            "https://oyc.yale.edu/philosophy/phil-181",
            "https://muse.jhu.edu/article/12345",
            "https://www.oecd-ilibrary.org/education",
            "https://www.weforum.org/reports/future-of-jobs",
            "https://www.theatlantic.com/ideas/x",
            "https://en.wikipedia.org/wiki/Erasmus",
        ]
        for u in tests:
            r = classify_url(u)
            print(f"{r['tier']:3} {r['label']:9} citable={r['citable']} | {u}")
            print(f"             → {r['note']}")
        return

    for u in sys.argv[1:]:
        r = classify_url(u)
        print(f"{r['tier']:3} {r['label']:9} citable={r['citable']} | {u}")
        print(f"             → {r['note']}")


if __name__ == "__main__":
    main()
