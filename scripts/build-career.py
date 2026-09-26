#!/usr/bin/env python3
"""Career (이력) section for the About page bottom + a compact strip at the Home page bottom.

Data lives in this file (CAREER / EDU / CERT / ACTS). Re-run after editing:
    python3 scripts/build-career.py
It replaces everything between the CV markers in about.html and index.html.
"""
import html, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
def esc(s): return html.escape(s, quote=False)

CAREER = [
 ('2025.03 ~ 현재', '네다바웨이', '대표이사 · 비영리단체 운영', 'now'),
 ('2022.01 ~ 현재', '글로벌꿈아카데미', '교육이사 · 강사', 'now'),
 ('2022.09 ~ 2024.12', '조선대학교 뇌및인공지능연구실', '국가연구원 · 염홍기 교수팀, Brain Computer Interface', ''),
 ('2021.01 ~ 2021.09', '아시아코치센터', '온라인 코칭 플랫폼 런칭 총괄', ''),
 ('2019.04 ~ 2020.01', '제주더큰내일센터', '총괄기획(참여자 관리 지침) · 대외협력(기업 프로젝트 설계)', ''),
 ('2017.03 ~ 2018.01', '군산대학교 대학일자리센터', '취·창업 컨설턴트 · 2017년 지역거점대학 취업률 1위', ''),
]
EDU = [('조선대학교', '경영학 학사', '2007.03 ~ 2014.08')]
CERT = [
 ('액션러닝 퍼실리테이터 2급', '2019.07 ~ 현재'),
 ('국제인증코치 ACC · 국제코치연맹(ICF)', '2014.07 ~ 2020.12'),
 ('제주공익활동촉진위원회 위원', '임기 4년 · 2024 ~ 2028'),
]
ACTS = [
 ('직급별 교육', '제주도 내 공공기관·중소기업 신입사원, 중간관리자 역량강화 교육 다수 진행.', []),
 ('취·창업 코칭', '자기소개서·면접 트레이닝과 1:1 코칭(JPDC 외 다수 합격). 제주 지역 중·고등 진로캠프 전문강사. 제주더큰내일센터 참여자 관리 지침과 기업 연계 프로젝트 설계. 2017년 지역거점대학 취업률 1위(군산대학교).', []),
 ('컨설팅 프로젝트', '현대자동차·두산·롯데그룹 신입사원 핵심가치 내재화 교육 운영(2013~2014). 기독교 영성 강화 워크숍, 여름수련회 진로특강 다수.', []),
 ('생성형 AI 워크숍', '생성형 AI 직무역량강화 워크숍 다수 진행. 국토교통부 인재개발원, 회계법인 탐라, 제주4.3평화재단, 제주대학교 RISE센터 런케이션 외.', []),
 ('제주 지역 프로젝트', '', [
   '제주한라대학교 간호학과 취업 특강',
   '제주청년센터 취업 대비 자기소개서 컨설팅 다수',
   '제주고등학교 특수학급 취업 준비·이동교육 설계와 강의',
   '제주도 내 미자립청년 취·창업 진로·취업 프로그램 설계와 1:1 코칭',
   '제주광역자활센터 도내 자활센터별 팀장급 역량강화 교육',
   '제주수눌음지역자활센터·제주이어도지역자활센터 취·창업 특강과 게이트웨이 교육',
   '서귀포시 학교밖청소년지원센터 지원사업 설계, 대안학교 수업 설계와 강의',
   '제주특별자치도 탐라교육원 전도 학생회장단 리더십캠프 설계와 강의(2024~2026)',
   '제주한라병원 프리셉터 간호사 역량강화 교육 설계와 강의',
   '제주국제자유도시개발센터 성과관리 디자인씽킹 워크숍 설계와 강의',
   '제주평생교육장학진흥원 도민대학 시민참여 성과관리 워크숍 FT',
   '15분도시제주 도민참여단, 제주도 권역별 주민자치위원회 FT',
 ]),
]

def about_section():
    tl = ''.join(f'''      <li class="cv-tl__i{' cv-tl__i--now' if now else ''}">
        <span class="cv-tl__when">{esc(when)}</span>
        <span class="cv-tl__body"><b class="cv-tl__org">{esc(org)}</b><span class="cv-tl__role">{esc(role)}</span></span>
      </li>
''' for when, org, role, now in CAREER)
    edu = ''.join(f'<li><b>{esc(s)}</b><span>{esc(m)}</span><small>{esc(p)}</small></li>' for s, m, p in EDU)
    cert = ''.join(f'<li><b>{esc(n)}</b><small>{esc(p)}</small></li>' for n, p in CERT)
    acts = ''
    for i, (t, d, items) in enumerate(ACTS):
        body = f'<p>{esc(d)}</p>' if d else ''
        if items: body += '<ul class="cv-act__list">' + ''.join(f'<li>{esc(x)}</li>' for x in items) + '</ul>'
        acts += f'      <details{" open" if i == 0 else ""}><summary><span class="cv-act__n">0{i+1}</span>{esc(t)}{(" · " + str(len(items)) + "건") if items else ""}</summary>{body}</details>\n'
    return f'''<!-- CV:START -->
<section class="sec sec--alt" id="career" aria-labelledby="cvTitle">
  <div class="wrap">
    <div class="sec-head reveal">
      <p class="sec-kicker">Career</p>
      <h2 class="sec-title" id="cvTitle">이력<span class="dot">.</span></h2>
      <p class="sec-lead">대학 일자리센터의 취·창업 컨설턴트에서 출발해, 청년센터 총괄기획, 코칭 플랫폼 런칭, 뇌·인공지능 연구실을 거쳐 지금은 네다바웨이를 운영합니다. 현장과 연구를 오간 이력이 진단·코칭·강의를 한 줄로 잇는 이유입니다.</p>
    </div>

    <div class="cv-grid">
      <div class="cv-col">
        <h3 class="cv-h">주요 경력</h3>
        <ol class="cv-tl reveal">
{tl}        </ol>
      </div>
      <div class="cv-col">
        <h3 class="cv-h">학력</h3>
        <ul class="cv-list reveal">{edu}</ul>
        <h3 class="cv-h" style="margin-top:26px;">자격 · 위촉</h3>
        <ul class="cv-list reveal">{cert}</ul>
        <div class="cv-stat reveal">
          <div><b>12년</b><span>강의 경력</span></div>
          <div><b>1,200회+</b><span>교육현장</span></div>
          <div><b>6개 기관</b><span>학교·센터·연구실</span></div>
        </div>
      </div>
    </div>

    <h3 class="cv-h" style="margin-top:44px;">활동사항</h3>
    <div class="faq cv-act reveal" style="margin-top:14px;">
{acts}    </div>

    <div class="work__cta" style="margin-top:36px;"><a class="btn-dark" href="/contact.html#lecture">강의 의뢰하기</a><a class="btn-link" href="#instructor">강사 프로필로 &#8593;</a></div>
  </div>
</section>
<!-- CV:END -->
'''

def home_strip():
    items = [(when.split(' ~')[0][:4], org, role.split(' · ')[0]) for when, org, role, now in CAREER]
    li = ''.join(f'<li><span class="cvs__y">{esc(y)}</span><b>{esc(o)}</b><span>{esc(r)}</span></li>' for y, o, r in items)
    return f'''<!-- CV:START -->
<section class="sec sec--alt" id="career" aria-labelledby="cvsTitle" style="padding:72px 0;">
  <div class="wrap">
    <div class="cvs reveal">
      <div class="cvs__head">
        <p class="sec-kicker">Career</p>
        <h2 class="cvs__t" id="cvsTitle">현장과 연구를 오간 이력<span class="dot">.</span></h2>
        <p class="cvs__d">취·창업 컨설턴트, 청년센터 총괄기획, 코칭 플랫폼 런칭, 뇌·인공지능 연구실, 그리고 네다바웨이. 액션러닝 퍼실리테이터 · 국제인증코치(ICF ACC, 2014~2020) · 제주공익활동촉진위원회 위원.</p>
        <a class="btn-link" href="/about.html#career">이력 전체 보기 &#8599;</a>
      </div>
      <ol class="cvs__list">{li}</ol>
    </div>
  </div>
</section>
<!-- CV:END -->
'''

def inject(path, block, anchor):
    f = ROOT / path; s = f.read_text(encoding='utf-8')
    s = re.sub(r'<!-- CV:START -->.*?<!-- CV:END -->\n', '', s, flags=re.S)
    assert anchor in s, (path, anchor)
    s = s.replace(anchor, block + anchor, 1)
    f.write_text(s, encoding='utf-8'); print('cv ->', path)

# About: the very bottom, after 운영 정보 (before </main>)
inject('about.html', about_section(), '</main>')
# Home: the very bottom, after Contact (before </main>)
inject('index.html', home_strip(), '</main>')
