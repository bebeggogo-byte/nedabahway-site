#!/usr/bin/env python3
"""Generate the proposal set under /proposal/.

  /proposal/                 hub: pick the audience
  /proposal/business/        기업·조직
  /proposal/institution/     기관·센터
  /proposal/faith/           신앙공동체
  /proposal/smallgroup/      소그룹·동아리

Each proposal is a paged document (one topic per page, A4 when printed).
6 MINDS always sits on a single page. Instructor page uses the real photo at
assets/brand/profile-kim-photo.jpg when present, else a clearly marked slot.

Content source: 2026-09-27 brief "자립은 자발성에서 시작된다".
Re-run after editing:  python3 scripts/build-proposal.py
"""
import importlib.util, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('bd', ROOT / 'scripts' / 'build-diagnosis.py')
bd = importlib.util.module_from_spec(spec); spec.loader.exec_module(bd)
esc, head, HEADER, FOOTER, ARROW, SITE = bd.esc, bd.head, bd.HEADER, bd.FOOTER, bd.ARROW, bd.SITE

PHOTO = ROOT / 'assets' / 'brand' / 'profile-kim-photo.jpg'
DATE = '2026. 09'

# ---------------------------------------------------------------- shared data
THEORY = [
 ('자기결정이론', 'Ryan & Deci, 2000', '자율성·유능감·관계성이 충족될 때 사람은 스스로 동기화된다.', '2·3·4단계의 축'),
 ('유기적 통합 이론', 'Ryan & Deci', '동기는 무동기 → 외적 → 내사 → 동일시 → 통합으로 내면화된다.', '5단계의 뼈대'),
 ('인과적 행위주체 이론', 'Shogren, Wehmeyer 외, 2015', '자기결정은 자기 삶의 원인이 되는 것이며 목표 설정·달성 교육으로 키울 수 있다.', '2단계 선택의 방법'),
 ('자기효능감', 'Bandura, 1977', '효능감의 가장 강한 원천은 성취 경험이다.', '3단계 해냄. 작은 성공부터'),
 ('긍정적 발달 5C', 'Lerner 외, 4-H', '유능성·자신감·연결·인성·배려가 자라면 여섯 번째 C, 기여로 이어진다.', '4·5단계'),
 ('의식화', 'Freire, 1970', '학습자는 가르침의 대상이 아니라 세계를 읽고 바꾸는 주체다.', '1단계 깨어남'),
 ('역량 접근', 'Sen, 1999 · Nussbaum, 2006', '발전은 가치 있는 삶을 살 실질적 자유를 넓히는 것이다.', '성과를 "선택의 폭"으로 보는 이유'),
 ('아동권리협약 제12조', 'UN, 1989', '자기 의견을 형성할 수 있는 사람은 자신에게 영향을 주는 문제에 의견을 말할 권리가 있다.', '참여자가 과정 설계에 참여'),
]
STAGES = [
 ('깨어남', 'Awaken', '나는 무엇을 좋아하고 원하는가?', '6 MINDS 상태 진단, 관심 탐색 대화, 먼저 길을 찾은 사람의 이야기', '스스로 말한 관심사 1개 이상', '무동기 → 외적', '#FF6B3D'),
 ('선택', 'Choose', '나는 어떤 길을 고르겠는가?', '선택지 비교, 3개월 개인 목표 세우기', '스스로 정한 목표를 말이나 글로 표현', '외적 → 내사', '#FFC857'),
 ('해냄', 'Achieve', '나는 해낼 수 있는가?', '목표를 작은 과업으로 쪼개 매주 하나씩 완수', '과업 완수 횟수, 자기 평가 변화', '내사 → 동일시', '#3B82F6'),
 ('연결', 'Connect', '누구와 함께 계속할 수 있는가?', '또래 모임, 멘토 연결, 3자 대화', '스스로 도움을 요청한 횟수, 지속 참여', '동일시 → 통합', '#10B981'),
 ('기여', 'Contribute', '내 일은 누구에게 닿는가?', '작은 프로젝트로 누군가를 돕기, 다음 기수 돕기', '자기 선택의 의미를 자기 말로 설명', '통합', '#8B5CF6'),
]
TOOLS = [
 ('MBTI', '성향(선호)', '4개 축 → 16유형', '"당신은 ○○○○형"', '보통 1회'),
 ('DISC', '행동 스타일', '4요인 조합', '주도·사교·안정·신중', '보통 1회'),
 ('HEXACO', '성격 특질', '6요인 × 하위 척도', '요인별 점수', '수년 단위'),
 ('에니어그램', '핵심 동기', '9유형 + 날개', '"당신은 N번"', '보통 1회'),
 ('6 MINDS', '지금의 상태·배분', '6마음 × 2축 + 총량 3 = 15문항', '"요즘 나는 ○○을 많이 쓰고 △△을 거의 안 쓴다"', '4주마다'),
]
MINDS = [
 ('explorer', '탐험하는 마음', 'Explorer', '#FF6B3D'), ('maker', '만드는 마음', 'Maker', '#FFC857'),
 ('connector', '연결하는 마음', 'Connector', '#3B82F6'), ('supporter', '돕는 마음', 'Supporter', '#10B981'),
 ('thinker', '생각하는 마음', 'Thinker', '#8B5CF6'), ('enjoyer', '즐기는 마음', 'Enjoyer', '#F472B6'),
]
CRED = [
 ('코칭', '국제인증코치(ICF ACC, 2014). 개인 코칭 프로그램을 직접 제작해 전국 70여 명에게 300시간 1:1 코칭'),
 ('진단·퍼실리테이션', '6 MINDS 상태 진단 설계, 액션러닝 퍼실리테이터 2급'),
 ('청소년·청년', '서귀포시 학교밖청소년지원센터 지원사업 설계, 대안학교 수업, 제주 중·고 진로캠프, 탐라교육원 학생회장단 리더십캠프(2024~2026)'),
 ('조직 교육', '제주 공공기관·중소기업 신입·중간관리자 역량강화, 생성형 AI 직무역량 워크숍 다수'),
 ('자립 성과', '2026년 서귀포시장애인종합복지관 취업 준비 참여자 4명 전원 취업, 미자립청년 취·창업 프로그램 설계'),
 ('연구', '조선대학교 뇌및인공지능연구실 국가연구원, Brain Computer Interface (2022~2024)'),
 ('위촉', '제주공익활동촉진위원회 위원 (2024~2028)'),
]
REFS = [
 'Ryan, R. M., &amp; Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. <i>American Psychologist</i>, 55(1), 68–78.',
 'Shogren, K. A. 외 (2015). Causal agency theory. <i>Education and Training in Autism and Developmental Disabilities</i>, 50(3), 251–263.',
 'Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change. <i>Psychological Review</i>, 84(2), 191–215.',
 'Lerner, R. M. 외. 청소년 긍정적 발달 5C와 4-H 종단연구.',
 'Freire, P. (1970). <i>Pedagogy of the Oppressed</i>. / Sen, A. (1999). <i>Development as Freedom</i>. / Nussbaum, M. C. (2006). <i>Frontiers of Justice</i>.',
 'United Nations (1989). Convention on the Rights of the Child, Article 12. / 「학교 밖 청소년 지원에 관한 법률」(2015 시행). / 교육부 (2025) 교육기본통계. / 여성가족부 (2023) 학교 밖 청소년 실태조사.',
]

# ---------------------------------------------------------------- per audience
TYPES = {
 'business': dict(
  slug='business', name='기업 · 조직', en='For Teams & Organizations', color='#3B82F6',
  cover_sub='성과가 아니라 배분을 봅니다. 팀의 에너지 총량을 키우는 자발성 설계',
  summary=[
   ('왜', '번아웃은 "일이 많아서"가 아니라 한 마음을 지나치게 오래 써서 옵니다. 지시로 움직이는 팀은 총량이 줄고, 스스로 고른 일을 하는 팀은 총량이 늡니다.'),
   ('무엇', '구성원 한 사람 한 사람의 여섯 마음 배분과 팀 총량을 한 장으로 보고, 자발성 5단계로 "시켜서"를 "내가 원해서"로 옮깁니다.'),
   ('어떻게', '「팀 에너지 맵」 워크숍(반나절·1일) + 관리자 코칭 3회 + 4주 뒤 재진단.'),
   ('결과물', '개인 해설지(본인만), 팀 배분·총량 리포트, 관리자용 대화 가이드, 4주 비교표.'),
  ],
  why_title='지시는 총량을 줄이고,<br>선택은 총량을 늘립니다.',
  why_p='자기결정이론은 자율성·유능감·관계성이 충족될 때 사람이 스스로 움직인다고 말합니다. 조직에서 이 세 가지가 부족하면 구성원은 같은 업무량에도 더 빨리 지칩니다. 네다바웨이는 조직의 자립을 "각자가 스스로 원하고, 고르고, 책임지는 팀"으로 정의하고, 그 상태를 6 MINDS로 측정해 4주 단위로 관리합니다.',
  facts=[('15문항 · 4분', '한 사람의 여섯 마음 배분과 총량을 확인하는 시간'), ('4주', '상태는 2주 단위로 바뀌므로 4주 뒤 다시 확인합니다'), ('1장', '팀 전체의 배분·총량이 한 장 리포트로')],
  program_title='프로그램 구성',
  program=[
   ('사전', '6 MINDS 온라인 진단(개인)', '15문항. 결과는 본인에게, 팀에는 평균과 총량만'),
   ('1부', '팀 에너지 맵 (90분)', '여섯 마음 정의, 팀 배분 지도 읽기, "이걸 더 하려고 저걸 줄여 왔구나" 대화'),
   ('2부', '자발성 5단계 워크숍 (120분)', '깨어남·선택·해냄·연결·기여를 팀 과제에 적용. 각자 "줄일 것 하나, 늘릴 것 하나"'),
   ('3부', '관리자 세션 (60분)', '줄일 마음을 일찍 알아보는 신호, 1:1 대화 가이드, 일을 맡기는 문장'),
   ('사후', '관리자 코칭 3회 + 4주 재진단', '팀 총량 변화, 마음별 ▲▼, 다음 분기 실행안'),
  ],
  ops=[('대상', '팀 단위 8~20명, 관리자 포함'), ('형식', '반나절(1·2부) 또는 1일(1~3부) + 사후 4주'), ('장소', '제주 현장(연수·워크숍·팀빌딩, 워케이션 연계 가능)'), ('기업 역할', '참여자 확정, 사전 진단 안내, 재진단 일정 확보'), ('네다바웨이 역할', '설계·진행·해설·리포트·관리자 코칭'), ('성과 측정', '사전·사후 총량과 6마음 평균, 줄일 마음이 있는 사람 수의 변화, 참여자가 자기 말로 남긴 변화')],
  outputs=['개인 해설지 (본인만 열람)', '팀 배분·총량 리포트 1장', '관리자 대화 가이드', '4주 비교표와 다음 분기 실행안', '워크숍 키트(카드 덱·노트·포스터·스티커) 선택'],
 ),
 'institution': dict(
  slug='institution', name='기관 · 센터', en='For Institutions & Centers', color='#FF6B3D',
  cover_sub='지원을 "받는" 자리에서 스스로 "골라 쓰는" 자리로. 학교 밖 청소년·청년 자립 5단계',
  summary=[
   ('왜', '한 해 5만 명이 넘는 학생이 학교를 떠나고, 그중 27.1%는 "원하는 것을 배우려고" 떠납니다. 학생에게 자발성은 이미 있습니다. 부족한 것은 그 자발성을 자립까지 이어 가는 과정입니다.'),
   ('무엇', '센터가 이미 운영하는 상담·학업·진로·체험·취업연계를 대체하지 않고, 참여자가 그것을 스스로 골라 쓰는 순서(5단계)로 엮습니다.'),
   ('어떻게', '5단계 × 2회기 = 10회기 소그룹 + 단계 사이 1:1 코칭. 첫 회기와 마지막 회기에 6 MINDS 진단.'),
   ('결과물', '사전·사후 자기결정 수준, 단계별 관찰 기록, 결과 보고서(6마음 평균·총량 변화·참여자의 말).'),
  ],
  why_title='밖에서 주는 계획이 아니라,<br>안에서 생기는 자발성.',
  why_p='자립을 "혼자 살아남는 힘"으로 정의하면 프로그램은 기술 목록이 됩니다. 네다바웨이는 자립을 스스로 원하고, 고르고, 책임지는 힘으로 정의합니다. 학교를 떠난 것은 멈춤이 아니라 다른 길의 출발선이며, 그 길을 걷게 하는 것은 안에서 생기는 자발성입니다. 「학교 밖 청소년 지원에 관한 법률」이 정한 상담·학업·진로·직업체험·취업연계 지원을 하나의 자립 경로로 엮는 것이 이 제안의 목적입니다.',
  facts=[('54,516명', '한 해 학교를 떠나는 초·중·고 학생 (교육부 2025)'), ('27.1%', '"원하는 것을 배우려고" 떠났다 (여가부 2023)'), ('31.4%', '심리·정서적으로 지쳐서 떠났다 (여가부 2023)')],
  program_title='10회기 구성',
  program=[
   ('1·2회기', '깨어남', '6 MINDS 진단과 해설, 관심 탐색 대화, 선배 이야기 · 지표: 스스로 말한 관심사 1개'),
   ('3·4회기', '선택', '검정고시·훈련·창작·취업 선택지 비교, 3개월 목표 · 지표: 목표를 말이나 글로'),
   ('5·6회기', '해냄', '과업 쪼개기, 매주 하나 완수, 직업체험 연계 · 지표: 완수 횟수, 자기 평가'),
   ('7·8회기', '연결', '또래 모임, 멘토, 담당 상담사·보호자 3자 대화 · 지표: 도움 요청 횟수, 지속 참여'),
   ('9·10회기', '기여', '지역 봉사·작은 프로젝트, 6 MINDS 재진단, 다음 기수 돕기 · 지표: 자기 말로 설명'),
  ],
  ops=[('대상', '센터 등록 참여자(후기 청소년 우선), 소그룹 6~10명'), ('구성', '5단계 × 2회기 = 10회기 + 단계 사이 1:1 코칭'), ('센터 사업과의 연결', '1단계↔상담 · 2단계↔학업·진로 · 3단계↔직업체험 · 4단계↔멘토·보호자 · 5단계↔취업연계·지역 봉사'), ('진행 원칙', '참여자가 회기 주제와 목표를 함께 정한다 (의견표명권)'), ('센터 역할', '참여자 모집, 기존 지원 연계, 담당자와 회기별 공유'), ('네다바웨이 역할', '과정 설계, 회기 진행, 진단·해설, 관찰 기록, 결과 보고서'), ('성과 측정', '사전·사후 자기결정 수준(표준화 척도 병행), 단계별 관찰 지표, 목표 실행 여부, 참여자가 자기 말로 남긴 변화')],
  outputs=['개인 해설지 (본인만)', '단계별 관찰 기록', '결과 보고서 (6마음 평균·총량 변화·참여자의 말)', '공모사업 제안서 협력', '워크숍 키트(카드 덱·노트·포스터·스티커) 선택'],
 ),
 'faith': dict(
  slug='faith', name='신앙공동체', en='For Faith Communities', color='#10B981',
  cover_sub='섬기고 나서 지치지 않고 힘이 나도록. 청년부·소그룹·리더를 위한 여섯 마음 나눔',
  summary=[
   ('왜', '돕는 마음을 지나치게 쓰는 사람은 자기 힘이 다 떨어져도 잘 알아차리지 못합니다. 섬기는 사람이 먼저 지쳐서 떠나면 공동체는 오래가지 못합니다.'),
   ('무엇', '여섯 마음을 함께 보며 "이걸 더 하려고 저걸 줄여 왔구나"를 서로 말하게 하고, 자발성 5단계의 마지막 단계인 "기여"를 소명과 연결해 이야기합니다.'),
   ('어떻게', '「여섯 마음 나눔」 4주 소그룹 + 리더·교사 세미나 + 청년 진로·비전 캠프.'),
   ('결과물', '개인 해설지, 소그룹 나눔 가이드, 공동체 6마음 분포·총량 리포트, 리더용 돌봄 체크리스트.'),
  ],
  why_title='혼자가 아닌 함께라서<br>더 멀리.',
  why_p='진로는 스펙을 고르는 일이 아니라 내 일이 누구에게 도움이 될지를 찾는 일입니다. 네다바웨이의 핵심 명제 "직업의 속성은 이타성이다"는 공동체가 오래 말해 온 섬김과 같은 뜻입니다. 다만 이타성은 자기 총량이 있을 때만 지속됩니다. 여섯 마음 나눔은 섬김을 줄이자는 과정이 아니라, 섬기고 나서 힘이 나는 배분을 함께 찾는 과정입니다.',
  facts=[('6', '누구나 여섯 마음을 다 갖고 있고 배분만 다릅니다'), ('4주', '첫 주 진단, 넷째 주 재진단. 그 사이 매주 나눔'), ('1개', '매주 "줄일 것 하나, 늘릴 것 하나"')],
  program_title='4주 여섯 마음 나눔',
  program=[
   ('1주', '깨어남 · 진단과 해설', '6 MINDS 15문항, 해설지 읽기, "나는 언제 힘이 나나" 나누기'),
   ('2주', '선택 · 짝이 되는 마음', '줄일 마음과 늘릴 마음 찾기, 짝 마음으로 서로 소개'),
   ('3주', '해냄 · 총량 키우기', '쉬기 먼저 · 방식 바꾸기 · 짝지어 쓰기 · 몸 먼저, 네 원칙 중 하나 실행'),
   ('4주', '연결과 기여 · 재진단', '4주 비교표, 총량이 오른 사람의 방법 나누기, 기여를 소명과 연결해 말하기'),
   ('리더', '리더·교사 세미나 (120분)', '돕는 마음을 지나치게 쓸 때의 신호, 돌봄 체크리스트, 청년 1:1 대화 가이드'),
  ],
  ops=[('대상', '청년부·소그룹 6~12명, 리더·교사'), ('형식', '주 1회 90분 × 4주 + 리더 세미나 1회. 캠프형(1박 2일)으로 압축 가능'), ('장소', '교회·공동체 공간 또는 제주 현장'), ('공동체 역할', '참여자 모집, 소그룹 편성, 리더 참여'), ('네다바웨이 역할', '설계·진행·해설·리포트, 리더 세미나, 청년 진로·비전 캠프 설계'), ('성과 측정', '사전·사후 총량과 6마음 평균, 돕는 마음을 지나치게 쓰는 사람의 비율 변화, 참여자가 자기 말로 남긴 변화')],
  outputs=['개인 해설지 (본인만)', '소그룹 나눔 가이드', '공동체 6마음 분포·총량 리포트', '리더용 돌봄 체크리스트', '워크숍 키트(카드 덱·노트·포스터·스티커) 선택'],
 ),
 'smallgroup': dict(
  slug='smallgroup', name='소그룹 · 동아리', en='For Small Groups', color='#F472B6',
  cover_sub='6~10명이면 충분합니다. 학급, 동아리, 독서모임, 창업팀을 위한 4주 자발성 과정',
  summary=[
   ('왜', '작은 모임은 서로를 볼 수 있어 변화가 빠릅니다. 대신 한 사람이 지쳐서 빠지면 모임 전체가 흔들리기 쉽습니다. 각자의 배분을 알면 모임이 오래갑니다.'),
   ('무엇', '첫 주에 진단, 넷째 주에 재진단. 그 사이 매주 "줄일 것 하나, 늘릴 것 하나"를 서로 확인합니다. 총량이 올라간 사람의 방법이 다음 사람의 교재가 됩니다.'),
   ('어떻게', '주 1회 90분 × 4주. 진행자 1명이 오거나, 모임 리더가 진행할 수 있도록 키트를 드립니다.'),
   ('결과물', '개인 해설지, 짝 마음 대화 카드, 재진단 비교표, 다음 기수용 키트.'),
  ],
  why_title='작을수록<br>빨리 바뀝니다.',
  why_p='자기효능감은 성취 경험에서 가장 강하게 자랍니다. 소그룹은 매주 작은 성취를 서로 확인할 수 있는 최소 단위입니다. 자발성 5단계를 4주에 압축해, 각자가 "이번 주 한 가지"를 정하고 해내고 말하는 순환을 만듭니다.',
  facts=[('6~10명', '서로의 시도를 볼 수 있는 크기'), ('4주', '진단 → 실행 → 실행 → 재진단'), ('90분', '주 1회. 진단 15분, 나눔 45분, 다음 주 한 가지 30분')],
  program_title='4주 과정',
  program=[
   ('1주', '깨어남 · 진단', '6 MINDS 15문항과 해설지, "나는 언제 힘이 나나" 한 사람씩 말하기'),
   ('2주', '선택 · 한 가지 정하기', '줄일 마음·늘릴 마음 확인, "줄일 마음 하나, 늘릴 마음 하나" 선언'),
   ('3주', '해냄 · 확인', '지난주 한 가지 결과 나누기, 총량 키우기 원칙 하나 추가'),
   ('4주', '연결·기여 · 재진단', '4주 비교표, 방법 공유, 다음 기수에게 남길 한 줄'),
   ('키트', '리더 진행 키트', '회기별 진행안, 대화 카드, 진단 링크, 비교표 양식'),
  ],
  ops=[('대상', '학급·동아리·독서모임·창업팀 6~10명'), ('형식', '주 1회 90분 × 4주. 제주 방문 워크숍으로 시작하고 이후 리더 진행(키트)'), ('장소', '제주(첫 워크숍) · 이후 구글 미트 온라인'), ('모임 역할', '참여자 확정, 매주 시간 확보'), ('네다바웨이 역할', '1주·4주 진행(또는 전 회기), 해설, 키트 제공'), ('성과 측정', '사전·사후 총량과 6마음 평균, 4주 실행 횟수, 참여자가 자기 말로 남긴 변화')],
  outputs=['개인 해설지 (본인만)', '짝 마음 대화 카드(마음 카드 덱)', '재진단 비교표(4주 노트)', '다음 기수용 리더 키트'],
 ),
}
ORDER = ['business', 'institution', 'faith', 'smallgroup']

# ---------------------------------------------------------------- page helpers
def page(no, kicker, title, body, cls='', color=None):
    style = f' style="--pc:{color};"' if color else ''
    return f'''<section class="dp {cls}"{style} aria-labelledby="p{no}t">
  <header class="dp__head"><span class="dp__k">{esc(kicker)}</span><span class="dp__no">{no:02d}</span></header>
  <h2 class="dp__t" id="p{no}t">{title}</h2>
  <div class="dp__body">
{body}
  </div>
  <footer class="dp__foot"><span>NEDABAHWAY · 자립은 자발성에서 시작된다</span><span>{no:02d}</span></footer>
</section>
'''

def cover(t):
    return f'''<section class="dp dp--cover" style="--pc:{t['color']};" aria-label="표지">
  <div class="dp-cover__top"><span class="dp-cover__tag">Proposal · {DATE}</span><span class="dp-cover__aud">{esc(t['name'])} <small>{esc(t['en'])}</small></span></div>
  <h1 class="dp-cover__h1">자립은<br>자발성에서<br>시작된다<span class="dot" aria-hidden="true"></span></h1>
  <p class="dp-cover__sub">{esc(t['cover_sub'])}</p>
  <img class="dp-cover__strip" src="/assets/brand/nw-6minds-strip.jpg" width="1536" height="340" alt="네다바웨이 여섯 마음 캐릭터" fetchpriority="high">
  <div class="dp-cover__foot"><img src="/assets/brand/nw-wordmark-color.png" width="1128" height="180" alt="NEDABAHWAY"><span>제주 · 교육 · 라이프 · nedabah.org</span></div>
</section>
'''

def p_summary(t):
    toc = ['제안 요지', '왜 자발성인가', '이론 근거', '자발성 5단계', '6 MINDS 설계 구조', t['program_title'], '운영안 · 결과물 · 성과 측정', '강사 소개', '문의 · 참고문헌']
    rows = ''.join(f'<li><b>{esc(k)}</b><p>{esc(v)}</p></li>' for k, v in t['summary'])
    tl = ''.join(f'<li><span>{i+2:02d}</span>{esc(x)}</li>' for i, x in enumerate(toc))
    return f'''<div class="dp-sum"><ul class="dp-sum__l">{rows}</ul>
<aside class="dp-toc"><p class="dp-toc__k">Contents</p><ol>{tl}</ol></aside></div>'''

def p_why(t):
    facts = ''.join(f'<div class="dp-fact"><b>{esc(n)}</b><span>{esc(d)}</span></div>' for n, d in t['facts'])
    return f'''<p class="dp-p dp-p--lg">{esc(t['why_p'])}</p>
<div class="dp-facts">{facts}</div>
<p class="dp-p dp-p--sm">두 출발점이 있습니다. 지친 사람에게는 "나도 원하는 것이 있다"는 감각을 다시 느끼는 것(1단계)이, 원하는 것이 분명한 사람에게는 그 선택을 실행하고 사람들과 함께 이어 가는 것(2~4단계)이 필요합니다. 자발성은 이미 있습니다. 부족한 것은 그 자발성을 이어 가는 과정입니다.</p>'''

def p_theory():
    cards = ''.join(f'<li><b>{esc(n)}</b><small>{esc(w)}</small><p>{esc(c)}</p><span>{esc(u)}</span></li>' for n, w, c, u in THEORY)
    return f'''<p class="dp-p">여덟 가지 근거가 한 방향을 가리킵니다. 사람은 고쳐야 할 문제가 아니라 자기 삶의 원인이 될 수 있는 주체이며, 그 힘은 자율성을 지지하는 관계 안에서 자랍니다.</p>
<ul class="dp-theory">{cards}</ul>'''

def p_stages():
    cards = ''
    for i, (n, en, q, act, ind, mot, c) in enumerate(STAGES, 1):
        cards += f'<li style="--sc:{c};"><span class="dp-st__n">0{i}</span><b class="dp-st__t">{esc(n)}<small>{en}</small></b><p class="dp-st__q">{esc(q)}</p><dl><dt>현장 활동</dt><dd>{esc(act)}</dd><dt>관찰 지표</dt><dd>{esc(ind)}</dd></dl><p class="dp-st__m">{esc(mot)}</p></li>'
    return f'''<p class="dp-p">"남이 정해 준 길"에서 "내가 고른 길"로, 나아가 "누군가의 힘이 되는 길"로. 맨 아래 띠는 자기결정이론의 동기 내면화 단계를 각 단계에 맞춘 네다바웨이의 설계 가설입니다.</p>
<ol class="dp-stages">{cards}</ol>
<p class="dp-note">관찰 지표는 현장용이며 표준화 척도가 아닙니다. 사전·사후 비교에는 표준화된 자기결정 척도의 한국어판을 함께 씁니다.</p>'''

def p_minds():
    rows = ''
    for t, w, s, l, r in TOOLS:
        cls = ' class="is-ours"' if t == '6 MINDS' else ''
        rows += f'<tr{cls}><th scope="row">{esc(t)}</th><td>{esc(w)}</td><td>{esc(s)}</td><td>{esc(l)}</td><td>{esc(r)}</td></tr>'
    strip = ''.join(f'<li style="--mc:{c};"><img src="/assets/brand/char-{k}.jpg" width="520" height="520" alt=""><b>{esc(n)}</b><small>{en}</small></li>' for k, n, en, c in MINDS)
    return f'''<p class="dp-p">MBTI, DISC, HEXACO, 에니어그램은 잘 만든 도구입니다. 모두 <b>성향</b>을 다루고 대부분 한 번이면 끝입니다. 6 MINDS는 같은 수준의 구조를 갖되 다른 질문을 던집니다. 지금 어느 마음을 많이 쓰고, 쓰고 나면 힘이 나는지 지치는지, 그래서 총량이 어디쯤인지. 상태는 2주 단위로 바뀌므로 4주 뒤 다시 확인합니다.</p>
<ul class="dp-minds">{strip}</ul>
<div class="dp-two">
<table class="dp-table"><caption>구조 비교</caption><thead><tr><th scope="col">도구</th><th scope="col">다루는 것</th><th scope="col">구조</th><th scope="col">결과의 언어</th><th scope="col">주기</th></tr></thead><tbody>{rows}</tbody></table>
<ol class="dp-arch">
<li><b>6개 마음</b> 탐험·만들기·연결·돕기·생각·즐기기. 누구나 여섯을 다 갖고 있고 배분만 다릅니다.</li>
<li><b>2개 축</b> 마음마다 사용량(얼마나 썼나)과 쓰고 난 뒤(힘이 나나, 지치나)를 따로 묻습니다.</li>
<li><b>총량 3문항</b> 잠·움직임·의욕. 총량의 60%는 여기서, 40%는 여섯 마음을 쓰고 난 뒤의 상태에서.</li>
<li><b>네 자리</b> 지킬 마음(많이·힘이 남) / 줄일 마음(많이·지침) / 늘릴 마음(적게·힘이 남) / 기다릴 마음(적게·지침). 자리 이름이 곧 이번 주 할 일입니다.</li>
<li><b>차이 지수 · 트레이드오프 문장</b> "이걸 더 하려고 저걸 줄여 왔구나." 판정이 아니라 관찰의 언어.</li>
<li><b>마음별 네 수치 · 4주 비교</b> 마음마다 사용 지수·회복 지수·배분 비중·총량 기여를 계산하고 여덟 자리로 해석합니다. 개인 결과는 저장하지 않고, 워크숍에서는 첫 회기와 마지막 회기의 코드를 나란히 놓고 변화를 봅니다. 설계 근거는 <a href="/minds/method/">6 MINDS 설계 백서</a>에 있습니다.</li>
</ol>
</div>
<p class="dp-p dp-p--sm" style="margin-top:12px;">여섯 마음의 정의·신호·짝 마음은 <a href="/minds/">nedabah.org/minds</a> 에, 무료진단은 <a href="/diagnosis/minds/">nedabah.org/diagnosis/minds</a> 에 있습니다.</p>
<ul class="dp-rules"><li>"당신은 ○○형"이라고 말하지 않는다</li><li>우울·불안 단어를 쓰지 않는다. 총량 30 미만이면 상담전화를 조용히 안내</li><li>개인 결과는 본인에게, 기관에는 평균과 총량 변화만</li><li>자체 설계 도구. 표준화 규준은 쌓는 중이며 기관 측정에는 표준화 척도를 병행</li></ul>'''

def p_program(t):
    rows = ''.join(f'<li><span class="dp-pr__n">{esc(n)}</span><b>{esc(h)}</b><p>{esc(d)}</p></li>' for n, h, d in t['program'])
    return f'<ol class="dp-program">{rows}</ol>'

def p_ops(t):
    rows = ''.join(f'<tr><th scope="row">{esc(k)}</th><td>{esc(v)}</td></tr>' for k, v in t['ops'])
    outs = ''.join(f'<li>{esc(o)}</li>' for o in t['outputs'])
    return f'''<div class="dp-two dp-two--ops">
<table class="dp-table dp-table--light"><caption>운영안</caption><tbody>{rows}</tbody></table>
<div><h3 class="dp-h3">결과물</h3><ul class="dp-outs">{outs}</ul>
<h3 class="dp-h3">함께 정할 것</h3><ul class="dp-decide"><li>참여 규모와 일정</li><li>기존 일정과 겹치지 않는 요일·시간</li><li>사전·사후 측정 도구와 동의 절차</li><li>예산과 재원</li></ul></div>
</div>'''

def p_instructor():
    if PHOTO.exists():
        fig = '<img src="/assets/brand/profile-kim-photo.jpg" width="720" height="900" alt="네다바웨이 대표 김창환">'
    else:
        fig = '<img src="/assets/brand/profile-kim.jpg" width="480" height="480" alt="네다바웨이 대표 김창환">'
    cred = ''.join(f'<li><b>{esc(k)}</b>{esc(v)}</li>' for k, v in CRED)
    return f'''<div class="dp-inst">
<figure class="dp-photo">{fig}<figcaption><b>김창환</b> 네다바웨이 대표<br>국제인증코치(ICF ACC) · 액션러닝 퍼실리테이터 2급 · 제주공익활동촉진위원회 위원</figcaption></figure>
<div><p class="dp-p dp-p--lg">"직업의 속성은 이타성이다." 진로는 스펙을 고르는 일이 아니라 내 일이 누구에게 닿을지를 찾는 일입니다. 답을 주지 않고 질문으로 스스로 찾게 하는 코칭 방식이 1·2단계의 핵심 도구입니다.</p>
<ul class="dp-cred">{cred}</ul></div>
</div>'''

def p_contact(t):
    refs = ''.join(f'<li>{r}</li>' for r in REFS)
    return f'''<div class="dp-contact">
<div><p class="dp-p dp-p--lg">{esc(t['name'])} 대상과 규모, 원하는 결과물을 알려 주시면 회기 구성과 견적을 정리해 드립니다. 무료 30분 상담으로 시작합니다.</p>
<p class="dp-contact__b"><a class="btn-dark" href="/contact.html">무료 30분 상담 신청</a><a class="btn-link" href="mailto:nedabah.way@gmail.com">nedabah.way@gmail.com</a></p>
<p class="dp-contact__s">네다바웨이 NEDABAHWAY · 제주 서귀포 · nedabah.org<br>6 MINDS 소개 <a href="/minds/">nedabah.org/minds</a> · 무료진단 <a href="/diagnosis/minds/">nedabah.org/diagnosis/minds</a> · 굿즈·워크숍 키트 <a href="/goods/">nedabah.org/goods</a></p></div>
<div><h3 class="dp-h3">참고문헌</h3><ol class="dp-refs">{refs}</ol></div>
</div>'''

def build_doc(key):
    t = TYPES[key]
    url = f'{SITE}/proposal/{t["slug"]}/'
    title = f'{t["name"]} 제안서 · 자립은 자발성에서 시작된다 | 네다바웨이'
    desc = f'{t["name"]}을 위한 네다바웨이 제안서. {t["cover_sub"]}'
    jsonld = json.dumps({"@context": "https://schema.org", "@type": "WebPage", "name": title, "url": url, "inLanguage": "ko", "description": desc,
                         "about": {"@type": "Organization", "name": "네다바웨이 NEDABAHWAY", "url": SITE}}, ensure_ascii=False)
    others = ''
    for k in ORDER:
        cur = ' aria-current="page"' if k == key else ''
        others += f'<a href="/proposal/{TYPES[k]["slug"]}/"{cur}>{esc(TYPES[k]["name"])}</a>'
    body = f'''
<main id="main" class="dpw">
  <nav class="dp-switch" aria-label="제안서 고객 유형"><div class="wrap"><span>제안서</span>{others}<button type="button" class="dp-print" onclick="window.print()">PDF 저장</button></div></nav>
  <div class="dp-stack">
{cover(t)}{page(2, '제안 요지', '한 장으로 보는 제안<span class="dot" aria-hidden="true"></span>', p_summary(t), color=t['color'])}{page(3, '왜 자발성인가', t['why_title'] + '<span class="dot" aria-hidden="true"></span>', p_why(t), color=t['color'])}{page(4, '이론 근거', '여덟 가지 근거가<br>한 방향을 가리킵니다<span class="dot" aria-hidden="true"></span>', p_theory(), color=t['color'])}{page(5, '자발성 5단계', '깨어남 · 선택 · 해냄 · 연결 · 기여<span class="dot" aria-hidden="true"></span>', p_stages(), color=t['color'])}{page(6, '6 MINDS 설계 구조', '유형이 아니라 지금의 배분을 읽습니다<span class="dot" aria-hidden="true"></span>', p_minds(), cls='dp--dark', color=t['color'])}{page(7, t['program_title'], esc(t['program_title']) + '<span class="dot" aria-hidden="true"></span>', p_program(t), color=t['color'])}{page(8, '운영안 · 결과물 · 성과 측정', '어떻게 운영하고 무엇이 남는가<span class="dot" aria-hidden="true"></span>', p_ops(t), color=t['color'])}{page(9, '강사 소개', '직업의 속성은 이타성이다<span class="dot" aria-hidden="true"></span>', p_instructor(), color=t['color'])}{page(10, '문의 · 참고문헌', '어디서 시작할지, 30분이면 정해집니다<span class="dot" aria-hidden="true"></span>', p_contact(t), color=t['color'])}  </div>
</main>
'''
    html = head(title, desc, url, 'proposal', f'<link rel="stylesheet" href="/assets/proposal.css">\n<script type="application/ld+json">{jsonld}</script>\n') + HEADER + body + FOOTER
    out = ROOT / 'proposal' / t['slug'] / 'index.html'; out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding='utf-8'); print('->', out.relative_to(ROOT))

def build_hub():
    url = f'{SITE}/proposal/'
    title = '제안서 · 자립은 자발성에서 시작된다 | 네다바웨이'
    desc = '기업·기관·신앙공동체·소그룹, 고객 유형별 네다바웨이 제안서. 자발성 5단계 모델과 6 MINDS 상태 진단.'
    jsonld = json.dumps({"@context": "https://schema.org", "@type": "CollectionPage", "name": title, "url": url, "inLanguage": "ko", "description": desc,
                         "about": {"@type": "Organization", "name": "네다바웨이 NEDABAHWAY", "url": SITE}}, ensure_ascii=False)
    cards = ''
    for k in ORDER:
        t = TYPES[k]
        cards += f'''      <a class="hub-card" href="/proposal/{t['slug']}/" style="--hc:{t['color']};"><span class="hub-card__k">{esc(t['en'])}</span><b class="hub-card__t">{esc(t['name'])}</b><p>{esc(t['cover_sub'])}</p><span class="hub-card__go">제안서 열기 {ARROW}</span></a>
'''
    body = f'''
<main id="main" class="hub">
  <section class="hub-hero">
    <div class="wrap">
      <p class="pp-kicker"><span>Proposal</span> {DATE} · 고객 유형별 제안서</p>
      <h1 class="hub-h1">자립은 자발성에서<br>시작된다<span class="dot" aria-hidden="true"></span></h1>
      <p class="hub-lead">스스로 원하고, 고르고, 책임지는 힘. 자발성 5단계 모델과 6 MINDS 상태 진단은 같고, 회기 구성과 결과물만 대상에 맞춥니다. 해당하는 제안서를 열어 보세요. 각 제안서는 페이지 단위로 구성되어 있고 그대로 PDF로 저장됩니다.</p>
    </div>
  </section>
  <section class="sec hub-grid">
    <div class="wrap">
      <div class="hub-cards">
{cards}      </div>
      <p class="hub-foot"><a class="btn-dark" href="/contact.html">무료 30분 상담 신청</a><a class="btn-link" href="/minds/">6 MINDS 소개 &#8599;</a><a class="btn-link" href="/goods/">굿즈 · 워크숍 키트 &#8599;</a><a class="btn-link" href="/diagnosis/minds/">무료진단 &#8599;</a></p>
    </div>
  </section>
</main>
'''
    html = head(title, desc, url, 'proposal', f'<link rel="stylesheet" href="/assets/proposal.css">\n<script type="application/ld+json">{jsonld}</script>\n') + HEADER + body + FOOTER
    out = ROOT / 'proposal' / 'index.html'; out.write_text(html, encoding='utf-8'); print('->', out.relative_to(ROOT))

build_hub()
for k in ORDER: build_doc(k)
