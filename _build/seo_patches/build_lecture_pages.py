#!/usr/bin/env python3
"""강의 12개 상세 페이지 자동 생성.

lectures/index.html 카드의 12개 자리를 각각 단독 페이지로 발행.
Service schema + Course schema + Offer schema + FAQ schema 포함.
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
LECTURES_DIR = ROOT / "lectures"
LECTURES_DIR.mkdir(parents=True, exist_ok=True)

LECTURES = [
    {
        "slug": "ai-literacy-for-educators",
        "title": "교사를 위한 AI 리터러시",
        "kicker": "교사·교육기관",
        "lead": "AI 시대 교사가 지켜야 할 자리와 새로 잡아야 할 자리.",
        "audience": "초·중·고 교사, 진로교사, 교육청 실무자, 사립학교 교사",
        "duration": "60분~6시간",
        "outcomes": [
            "AI 리터러시 교육의 1차 좌표 잡기 (정보 vs 관찰)",
            "AI 의무화 정책 흐름 3개 층위 이해",
            "수업 안에서 AI를 '무자비한 비평가'로 쓰는 자리 배치",
            "교사 자신의 AI 사용 윤리 한 문장 정리",
        ],
        "topics": [
            "AI는 교사를 빼앗는가, 가르침을 빼앗는가",
            "검증 레이어 — 학생이 AI 답을 의심하는 자리",
            "교과목별 AI 사용 5가지 결",
            "1차 출처 인용 습관 — 위키·블로그 단독 인용 차단",
        ],
        "format": "강의(60~120분), 워크숍(반나절~하루), 연속 워크숍(2~6회), 온라인 가능",
        "keywords": ["AI 리터러시", "교사 AI 교육", "AI 교육 정책", "교사 연수", "AI 의무화"],
    },
    {
        "slug": "career-values-for-teens",
        "title": "청소년 진로 가치관",
        "kicker": "청소년·학교",
        "lead": "'좋아하는 일'이라는 함정에서 빠져나오기. 직업의 이타성 본문.",
        "audience": "중·고등학생, 진로교사, 학부모, 청소년 상담사",
        "duration": "60분~3시간",
        "outcomes": [
            "30문항 자가진단으로 자기 가치관 5축 분포 확인",
            "'좋아하는 일'의 함정 인식",
            "한 사람을 향한 일의 결 발견",
            "다음 한 가지 행동 한 문장 작성",
        ],
        "topics": [
            "AI는 일을 빼앗는가, 마음을 빼앗는가",
            "좋아하는 일이라는 함정",
            "성공보다 먼저 묻는 질문",
            "직업의 속성은 이타성이다",
        ],
        "format": "강의(60~120분), 진단지 활용 워크숍(3시간), 학부모 동행 자리(2시간)",
        "keywords": ["청소년 진로", "고등학생 진로", "진로 가치관", "진로 교육", "진로 검사"],
    },
    {
        "slug": "leadership-1on1",
        "title": "팀장의 1대1 대화 설계",
        "kicker": "관리자·팀장",
        "lead": "신임팀장 첫 후회부터 분기 면담까지. 한 사람의 다음 문장을 짓는 자리.",
        "audience": "신임팀장, 중간관리자, 부서장, HR 담당자",
        "duration": "60분~6시간",
        "outcomes": [
            "1대1 면담의 8단계 흐름 익히기",
            "팀원 한 명의 다음 문장을 같이 짓는 기술",
            "분기 면담 vs 주간 1대1의 결 구분",
            "팀원 중 한 명의 첫 1대1 시뮬레이션",
        ],
        "topics": [
            "신임팀장의 첫 후회",
            "면담은 듣기가 80%",
            "어려운 피드백 — 사실·감정·요청 3단 구조",
            "팀원의 다음 한 문장을 같이 짓는 자리",
        ],
        "format": "강의(60~120분), 신임팀장 워크숍(반나절), 6주 누적 코칭 가능",
        "keywords": ["1대1 면담", "신임팀장", "팀장 코칭", "리더십 교육", "관리자 면담"],
    },
    {
        "slug": "burnout-recovery",
        "title": "번아웃과 의미의 회복",
        "kicker": "번아웃·회복",
        "lead": "과로가 아닌 의미 부재가 번아웃의 1차 원인. 60분 셀프 진단 + 한 동작 처방.",
        "audience": "직장인, 1인 사업자, 전문직, 교사, 의료진",
        "duration": "60분~3시간",
        "outcomes": [
            "번아웃 vs 과로의 결 차이 인식",
            "의미 부재의 자리 5가지 자가 점검",
            "회복의 첫 동작 한 가지 결정",
            "주 1회 셀프 점검 루틴 설계",
        ],
        "topics": [
            "번아웃은 과로가 아니다",
            "의미가 또렷한 자리에는 번아웃이 없다",
            "회복의 1차 단위 — 한 사람을 향한 한 동작",
            "쉼이 곧 회복은 아니다",
        ],
        "format": "강의(60~90분), 자가진단 워크숍(2~3시간), 1대1 코칭 6주 가능",
        "keywords": ["번아웃", "직장인 번아웃", "번아웃 회복", "의미 회복", "직무 스트레스"],
    },
    {
        "slug": "solo-operator-ai",
        "title": "1인 사업자 AI 자동화 실전",
        "kicker": "1인 사업자",
        "lead": "17부서·60에이전트·$20/월로 1년 누적한 실전 보고. 검증 레이어가 핵심.",
        "audience": "1인 사업자, 프리랜서, 강사, 코치, 컨설턴트, 작가",
        "duration": "90분~6시간",
        "outcomes": [
            "1인 사업자가 AI를 어디까지 쓸 수 있는지 좌표 잡기",
            "검증 레이어 6부서의 역할 이해",
            "자기 사업의 첫 자동화 1개 자리 설계",
            "$20/월 한도 안에서 시작하는 7일 매뉴얼",
        ],
        "topics": [
            "AI 자동화의 confidence trap — 자기참조 루프",
            "반대 레이어 6부서 (Verification·Market·Red Team·Fact Check·Decision·Trust)",
            "구독 한도가 만드는 디자인 강제",
            "17부서 시스템 1년 누적 KPI",
        ],
        "format": "강의(90분~3시간), 워크숍(하루), 6주 누적 컨설팅 가능",
        "keywords": ["1인 사업자 AI", "AI 자동화", "프리랜서 AI", "멀티 에이전트", "AI 워크플로"],
    },
    {
        "slug": "parent-child-conversation",
        "title": "자녀 진로 대화 60분",
        "kicker": "부모·가정",
        "lead": "시험 점수 안 보여줄 때부터 시작. 책 부록 C 워크시트 1시간 활용.",
        "audience": "초·중·고 학부모, 학부모회 임원, 가족 상담사",
        "duration": "60분~3시간",
        "outcomes": [
            "자녀의 작은 결핍을 보는 눈 갱신",
            "60분 진로 대화 8단계 흐름 익히기",
            "워크시트로 식탁에서 1시간 자기 동행",
            "다음 주 한 가지 작은 동행 결정",
        ],
        "topics": [
            "자녀가 시험 점수 안 보여줄 때",
            "학원 안 다니겠다는 말의 자리",
            "부모의 작은 무관심에 상처받는 자리",
            "한 사람의 자녀를 보는 눈",
        ],
        "format": "학부모 강연(60~90분), 부모-자녀 동행 워크숍(2~3시간)",
        "keywords": ["학부모 진로 교육", "자녀 진로 대화", "사춘기 자녀", "부모 코칭", "가정 교육"],
    },
    {
        "slug": "facilitation-questions",
        "title": "질문이 답을 만드는 자리",
        "kicker": "퍼실리테이션",
        "lead": "퍼실리테이터의 첫 도구는 질문 순서. 답 가르치지 않는 60분 워크숍 설계.",
        "audience": "퍼실리테이터, 워크숍 디자이너, 교사, HRD 담당자",
        "duration": "90분~6시간",
        "outcomes": [
            "질문 순서 8단계 익히기",
            "답 안 주고 발견하게 하는 자리 설계",
            "60분 워크숍 1개 직접 설계해 보기",
            "자기 워크숍 다음 1회 개선점 찾기",
        ],
        "topics": [
            "질문이 답을 만든다",
            "엉뚱한 답을 하지 않는 흐름",
            "침묵의 무게 — 답을 기다리는 자리",
            "8단계 질문 흐름의 실전",
        ],
        "format": "워크숍(90분~하루), 퍼실리테이터 트레이닝(2~3일)",
        "keywords": ["퍼실리테이션", "워크숍 설계", "질문 기법", "촉진자", "회의 디자인"],
    },
    {
        "slug": "vocation-creation",
        "title": "창직 — 한 사람의 결핍에서 시작하는 일",
        "kicker": "창직",
        "lead": "없는 직업을 짓는 자리. 한 사람의 결핍을 매주 1개 적는 7주 워크숍.",
        "audience": "30~50대 직업 전환자, 1인 사업자 지망, 은퇴 준비자, 사회적기업 창업자",
        "duration": "90분~6주",
        "outcomes": [
            "창직과 창업의 결 차이 인식",
            "자기 주변 한 사람의 결핍 5가지 발견",
            "결핍 1개를 직업으로 짓는 7주 매뉴얼",
            "다음 주 첫 작은 실험 1개 결정",
        ],
        "topics": [
            "창직은 자기 직업을 다시 짓는 자리",
            "결핍 → 직업 → 사업 순서",
            "한 사람을 향한 일의 누적",
            "7주 작은 실험 매뉴얼",
        ],
        "format": "강연(90~120분), 7주 누적 워크숍(주 1회 90분), 1대1 컨설팅",
        "keywords": ["창직", "직업 전환", "1인 창업", "사이드 프로젝트", "직업 디자인"],
    },
    {
        "slug": "resume-interview",
        "title": "자기소개서·면접 코칭",
        "kicker": "취업·면접",
        "lead": "기성 답안에서 빠져나오기. 한 사람을 향한 한 문장으로 다시 쓰기.",
        "audience": "취준생, 이직 준비자, 신입사원, 진로 상담사",
        "duration": "60분~3시간 / 1대1 60분",
        "outcomes": [
            "자기소개서 5문장 다시 쓰기",
            "면접 1분 자기소개 한 문장 결로 정리",
            "행동 사례 3건의 결 잡기",
            "면접관 시점에서 자기 답을 한 번 듣기",
        ],
        "topics": [
            "자기소개서 흔한 5가지 함정",
            "한 사람을 향한 한 문장으로 다시 쓰기",
            "면접의 8단계 흐름",
            "긴장이 만드는 답과 결을 잡은 답의 차이",
        ],
        "format": "강의(60~120분), 워크숍(반나절), 1대1 코칭(60분, 1회/3회)",
        "keywords": ["자기소개서", "면접 준비", "취업 코칭", "이직 면접", "직무 면접"],
    },
    {
        "slug": "team-effectiveness",
        "title": "팀 성과 — 일의 결을 다시 짠다",
        "kicker": "조직개발",
        "lead": "스마트워크의 함정. 도구 대신 결을 다시 잡는 60분.",
        "audience": "팀장, 부서장, 임원, 조직개발 컨설턴트",
        "duration": "60분~6시간",
        "outcomes": [
            "스마트워크가 못 푸는 자리 인식",
            "팀의 결 5축 점검 (이타성·전문성·자율성·안정성·창의성)",
            "팀 회의 1개 결을 잡는 자리로 다시 디자인",
            "다음 분기 팀 KPI 1개 결 추가",
        ],
        "topics": [
            "스마트워크의 함정",
            "도구가 결을 만들지 않는다",
            "팀의 결을 다시 잡는 5축 점검",
            "한 사람의 결핍에서 시작하는 팀 KPI",
        ],
        "format": "팀장/임원 강연(60~120분), 조직개발 워크숍(하루)",
        "keywords": ["조직개발", "팀 성과", "팀 빌딩", "스마트워크", "팀 KPI"],
    },
    {
        "slug": "hrd-effectiveness",
        "title": "교육 효과 — 60분이 끝났을 때",
        "kicker": "HRD",
        "lead": "학습자가 한 문장을 가지고 나가는 강의 설계. HRD 담당자용.",
        "audience": "HRD 담당자, 인재개발팀, 교육담당자, 사내강사",
        "duration": "90분~6시간",
        "outcomes": [
            "강의 효과의 1차 단위 정의 (한 문장)",
            "강의 8단계 흐름 익히기",
            "자기 부서 강의 1개 다시 설계",
            "강의 후 1주 follow-up 1가지 결정",
        ],
        "topics": [
            "강의가 끝났을 때 — 학습자가 가지고 나가는 한 문장",
            "정보 전달 vs 관찰 중심 강의",
            "강의 8단계 흐름",
            "강의 후 1주 — 결을 누적시키는 follow-up",
        ],
        "format": "HRD 강연(90~120분), 사내강사 양성 워크숍(하루~3일)",
        "keywords": ["HRD", "교육 효과", "강의 설계", "사내 강사", "교육 운영"],
    },
    {
        "slug": "wellness-coaching",
        "title": "자기이해와 웰니스 코칭",
        "kicker": "웰니스",
        "lead": "자기관찰을 시작하는 60분. 1대1 코칭 6주~12주 누적 가능.",
        "audience": "직장인, 전문직, 1인 사업자, 30~50대 자기 점검자",
        "duration": "60분~12주",
        "outcomes": [
            "자기관찰의 1차 단위 정하기 (1주 1번)",
            "자기 가치관 5축 분포 확인",
            "다음 1주 한 가지 동작 결정",
            "12주 누적 코칭 시작 자리 확보",
        ],
        "topics": [
            "자기관찰 vs 자기검열의 결",
            "5축 진단으로 자기 자리 잡기",
            "한 사람의 동행 안에서 자라는 자기이해",
            "12주 누적의 결 — 작은 변화의 누적",
        ],
        "format": "강의(60~90분), 1대1 코칭(60분/회, 6주·12주 패키지)",
        "keywords": ["웰니스 코칭", "자기이해", "라이프 코칭", "자기관찰", "성인 코칭"],
    },
]


def build_page(data: dict) -> str:
    schema = {
        "@context": "https://schema.org",
        "@type": ["Service", "Course"],
        "name": data["title"],
        "description": data["lead"],
        "provider": {"@id": "https://www.nedabah.org/#organization"},
        "instructor": {"@id": "https://www.nedabah.org/about.html#kim-changhwan"},
        "audience": {"@type": "Audience", "audienceType": data["audience"]},
        "url": f"https://www.nedabah.org/lectures/{data['slug']}.html",
        "inLanguage": "ko-KR",
        "courseMode": "blended",
        "timeRequired": data["duration"],
        "offers": {
            "@type": "Offer",
            "url": "https://www.nedabah.org/contact.html",
            "priceCurrency": "KRW",
            "availability": "https://schema.org/InStock",
            "description": "강의료는 형식·인원·이동거리 종합 협의. 비영리·교육기관 협의 가능."
        },
        "keywords": ", ".join(data["keywords"]),
    }
    schema_json = json.dumps(schema, ensure_ascii=False, indent=2)

    outcomes_html = "\n".join(f"<li>{o}</li>" for o in data["outcomes"])
    topics_html = "\n".join(f"<li>{t}</li>" for t in data["topics"])

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<link rel="stylesheet" href="/assets/nedabah.bundle.css">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{data['title']} — 김창환 강의 | 네다바웨이</title>
<meta name="description" content="{data['lead']} 김창환 강사. {data['format']} 가능.">
<link rel="canonical" href="https://www.nedabah.org/lectures/{data['slug']}.html">
<meta property="og:title" content="{data['title']} — 김창환 강의">
<meta property="og:description" content="{data['lead']}">
<meta property="og:url" content="https://www.nedabah.org/lectures/{data['slug']}.html">
<meta property="og:type" content="article">
<meta property="og:image" content="https://www.nedabah.org/assets/og-default.svg">
<meta name="keywords" content="{', '.join(data['keywords'])}">

<script type="application/ld+json">
{schema_json}
</script>
</head>
<body>
<nav class="gnav" role="navigation" aria-label="주요 메뉴">
  <div class="gnav__inner">
    <a href="/" class="gnav__logo">네다바웨이</a>
    <ul class="gnav__links">
      <li><a href="/lectures/" class="gnav__link">강의 목록</a></li>
      <li><a href="/blog/perspective/" class="gnav__link">관점 노트</a></li>
      <li><a href="/about.html" class="gnav__link">소개</a></li>
      <li><a href="/contact.html" class="gnav__cta">강의 의뢰 →</a></li>
    </ul>
  </div>
</nav>

<main style="max-width:760px;margin:4rem auto;padding:0 1.5rem;font-family:'Noto Serif KR',serif;line-height:1.85;">
<header style="margin-bottom:3rem;">
  <p style="font-size:.8rem;color:#b45309;letter-spacing:.18em;font-weight:700;">LECTURE · {data['kicker']}</p>
  <h1 style="font-size:2.2rem;line-height:1.3;margin:.6rem 0 1rem;">{data['title']}</h1>
  <p style="font-size:1.1rem;color:#6a604f;font-style:italic;">{data['lead']}</p>
</header>

<article class="prose">

<section style="background:#fbf6ec;padding:1.5rem 2rem;border-radius:10px;margin-bottom:2rem;">
<h2 style="font-size:1.05rem;margin-top:0;">한눈에</h2>
<table style="width:100%;font-size:.95rem;">
<tr><td style="padding:.4rem 0;color:#6a604f;width:30%;">대상</td><td>{data['audience']}</td></tr>
<tr><td style="padding:.4rem 0;color:#6a604f;">시간</td><td>{data['duration']}</td></tr>
<tr><td style="padding:.4rem 0;color:#6a604f;">형식</td><td>{data['format']}</td></tr>
</table>
</section>

<h2 style="font-size:1.4rem;margin-top:2.5rem;">강의 후 가져가는 것</h2>
<ol style="line-height:1.9;">
{outcomes_html}
</ol>

<h2 style="font-size:1.4rem;margin-top:2.5rem;">다루는 주제</h2>
<ul style="line-height:1.9;">
{topics_html}
</ul>

<h2 style="font-size:1.4rem;margin-top:2.5rem;">진행 방식</h2>
<p>이 강의는 <strong>관찰 중심</strong>으로 진행됩니다. 정보 전달이 60분 안에 잊히는 것과 달리, 관찰은 학습자가 직접 자기 자리에서 발견한 것이라 1주 후에도 남습니다. 60분이 끝났을 때 학습자가 "내일 출근해서 한 가지 다르게 해 보겠다"는 한 문장을 가지고 나가는 것이 목표입니다.</p>

<p>강의 형식은 의뢰 기관의 맥락에 맞춰 조정됩니다. 인원 10명~200명, 60분~6시간, 온·오프라인 모두 가능합니다.</p>

<h2 style="font-size:1.4rem;margin-top:2.5rem;">강의료 안내</h2>
<p>강의료는 (1) 강의 형식·시간, (2) 인원, (3) 이동 거리, (4) 기관 성격(영리/비영리/교육)을 종합해 1대1로 안내합니다. 비영리·교육기관 협의 가능합니다. 정확한 견적은 의뢰 시 회신해 드립니다.</p>

</article>

<aside style="margin-top:4rem;padding:2rem;background:#3a322a;color:#fbf6ec;border-radius:12px;text-align:center;">
  <h2 style="margin-top:0;font-size:1.4rem;">의뢰</h2>
  <p style="font-size:1rem;line-height:1.7;">이메일 또는 사이트에서 1분 안에 의뢰 가능. 24~48시간 내 회신.</p>
  <p><a href="/contact.html" style="display:inline-block;background:#b45309;color:white;padding:.8rem 2rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:.5rem;">강의 의뢰 →</a></p>
</aside>

<aside style="margin-top:3rem;padding:2rem;background:#fbf6ec;border-radius:12px;">
  <h2 style="margin-top:0;font-size:1.1rem;">관련 자료</h2>
  <ul style="list-style:none;padding:0;line-height:2;">
    <li>→ <a href="/lectures/">강의 12개 전체 목록</a></li>
    <li>→ <a href="/blog/perspective/">관점 노트 100+편</a></li>
    <li>→ <a href="/book-excerpt.html">책 발췌 5편 무료 PDF</a></li>
    <li>→ <a href="/diagnosis.html">진로 가치관 30문항 자가진단</a></li>
  </ul>
</aside>

<footer style="margin-top:4rem;padding-top:2rem;border-top:1px solid #e5d8c4;font-size:.85rem;color:#8a7a64;">
  <p>김창환 · 네다바웨이 · 제주 출발 전국 출강 · <a href="mailto:nedabah.way@gmail.com">nedabah.way@gmail.com</a></p>
</footer>
</main>
</body>
</html>
"""


def main():
    written = 0
    for lec in LECTURES:
        path = LECTURES_DIR / f"{lec['slug']}.html"
        path.write_text(build_page(lec), encoding="utf-8")
        written += 1
        print(f"  [ok] {path.name}")
    print(f"---\ntotal: {written}/{len(LECTURES)}")


if __name__ == "__main__":
    main()
