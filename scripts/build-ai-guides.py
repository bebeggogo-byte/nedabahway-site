#!/usr/bin/env python3
"""Generate /ai/ hub + 12 environment-setup guides (sky.css style), assets/ai.css, assets/ai.js and OG SVGs.

Usage: python3 scripts/build-ai-guides.py   (then scripts/build-og-jpg.py for the JPG twins)
"""
import html, json, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://www.nedabah.org'
DATE = '2026-09-25'

GROUPS = [
    ('기준 세우기', 'AI가 무엇을 기준으로 판단할지 먼저 올립니다. 서식, 규칙, 규범, 제도, 강령, 법.'),
    ('일의 프로세스', '일이 어떤 순서로 흐르고 어디서 사람이 결정하는지 알려 줍니다.'),
    ('목적과 과업 도달', '왜 하는지, 끝났다는 것이 어떤 모양인지 정합니다.'),
]

# Each guide: slug, group index, title, short (card), lead, why (list of paragraphs),
# template (pre), prompt (pre), steps (list), checklist (list), tip (optional)
GUIDES = [
dict(slug='forms', g=0, title='서식 사전', short='공문·보고서·회의록. 우리가 실제로 쓰는 서식을 AI에 올립니다.',
 lead='AI가 낸 결과를 매번 우리 서식으로 옮겨 적고 있다면, 서식을 먼저 올리지 않은 것입니다. 가장 잘 된 문서 한 편이 가장 좋은 지시문입니다.',
 why=['조직마다 공문, 결과보고, 회의록, 계획서의 모양이 다릅니다. AI는 그 모양을 모르기 때문에 매번 일반적인 형태로 냅니다. 서식을 사전처럼 등록해 두면 AI는 등록된 모양으로만 씁니다.',
      '핵심은 설명이 아니라 예시입니다. 필수 항목 순서와 함께 실제로 잘 된 문서 한 편을 그대로 붙여 넣으면 말투와 분량까지 따라옵니다.'],
 template='''[서식 사전]

서식 이름:
쓰는 상황:
받는 사람:
필수 항목(순서대로):
  1.
  2.
  3.
  4.
말투·문체: (예: 개조식 / ~함·~임 / 존댓말 완결문)
분량: (예: A4 1장, 항목당 3줄 이내)
금지: (예: 이모지, 영어 약어, 추정 수치)
파일명 규칙: (예: 2026-09_결과보고_기관명.hwpx)

실제 예시(가장 잘 된 문서 한 편을 그대로 붙여 넣기):
"""

"""

(서식이 여러 개면 위 블록을 반복합니다.)''',
 prompt='''너는 우리 조직의 문서 담당자다. 아래 [서식 사전]에 등록된 서식만 사용한다.

규칙
1. 내가 "OO 서식으로"라고 말하면 그 서식의 필수 항목을 순서대로 모두 채운다. 항목을 빼거나 새로 만들지 않는다.
2. 말투, 분량, 금지 사항, 파일명 규칙을 그대로 지킨다. 실제 예시의 문장 길이와 어조를 따른다.
3. 채울 정보가 부족하면 지어내지 않는다. 그 자리에 [확인 필요: 무엇]이라고 쓰고, 필요한 정보를 마지막에 한 번에 묻는다.
4. 결과는 서식 본문만 낸다. 인사말, 설명, 요약을 앞뒤에 붙이지 않는다.
5. 서식 사전에 없는 문서를 요청받으면 가장 가까운 서식을 제안하고, 내 확인을 받은 뒤 쓴다.

[서식 사전]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['가장 자주 쓰는 서식 3개만 고릅니다. 결과보고, 공문, 회의록이면 충분합니다.',
        '각 서식의 실제 예시 한 편을 찾아 그대로 붙입니다. 이름과 개인정보는 지웁니다.',
        '프롬프트와 함께 AI의 프로젝트 지침(또는 지식 파일)에 저장합니다. 이후에는 "결과보고 서식으로"라고만 말합니다.'],
 check=['필수 항목에 순서 번호가 있는가', '실제 예시가 한 편 이상 붙어 있는가', '금지 사항이 구체적인가(예: "딱딱하게 쓰지 마" 대신 "이모지 금지")', '예시 문서에서 개인정보를 지웠는가']),

dict(slug='rules', g=0, title='일하는 규칙과 말투', short='우리가 쓰는 말, 안 쓰는 말, 결정 원칙. AI가 조직처럼 말하게 합니다.',
 lead='AI 결과물이 "우리 것 같지 않다"는 느낌은 대부분 말투와 원칙이 빠져서 생깁니다. 규칙 한 장이면 해결됩니다.',
 why=['말투는 취향이 아니라 규칙입니다. 호칭, 존댓말 여부, 숫자와 날짜 표기, 문장 길이 같은 것을 정해 두면 AI는 흔들리지 않습니다.',
      '규칙에는 일하는 원칙도 들어갑니다. 예를 들어 "확인되지 않은 수치는 쓰지 않는다", "외부 발송 문서는 두 번 읽는다" 같은 원칙은 AI의 행동을 바꿉니다.'],
 template='''[일하는 규칙과 말투]

조직 한 줄 소개:
우리가 하는 일을 부르는 말: (예: "교육현장", "프로그램", "참가자")
호칭: (예: 참가자 → "OO 님", 기관 담당자 → "담당관님")
존댓말: (예: 대외 문서는 "~습니다", 내부 메모는 개조식)
숫자 표기: (예: 1,200회 / 30분 / 2026-09-25)
문장 길이: (예: 한 문장 40자 이내, 한 문단 3문장 이내)
쓰지 않는 말: (예: "혁신적인", "최고의", 이모지, 느낌표 연속)
대신 쓰는 말: (예: "혁신적인" → 구체적 변화 한 가지)

일하는 원칙
1. (예: 확인되지 않은 수치는 쓰지 않는다)
2. (예: 사람 이름은 실명 대신 역할로 쓴다)
3. (예: 외부 발송 문서는 반드시 사람이 최종 확인한다)''',
 prompt='''너는 우리 조직의 일원으로 일한다. 아래 [일하는 규칙과 말투]는 모든 답변에 적용되는 기본 규칙이다.

규칙
1. 호칭, 존댓말, 숫자 표기, 문장 길이를 항상 지킨다.
2. "쓰지 않는 말" 목록의 표현은 쓰지 않는다. 필요하면 "대신 쓰는 말"로 바꾼다.
3. "일하는 원칙"과 충돌하는 요청을 받으면 먼저 충돌을 알리고, 내가 결정한 뒤 진행한다.
4. 규칙에 없는 상황은 가장 가까운 규칙을 적용하고, 답 끝에 "적용한 규칙: OO"라고 한 줄로 밝힌다.

[일하는 규칙과 말투]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['최근 문서 다섯 편을 훑어 반복해서 고친 부분을 적습니다. 그것이 규칙입니다.',
        '쓰지 않는 말은 실제로 지웠던 표현만 넣습니다. 상상으로 만들지 않습니다.',
        '서식 사전(01)과 같은 지침 파일에 넣습니다. 서식은 모양, 규칙은 말투를 맡습니다.'],
 check=['호칭과 존댓말 규칙이 있는가', '숫자·날짜 표기가 예시와 함께 있는가', '쓰지 않는 말마다 대신 쓰는 말이 있는가', '일하는 원칙이 3개 이내로 압축돼 있는가']),

dict(slug='references', g=0, title='제도·강령·법 레퍼런스', short='관련 법, 기관 지침, 윤리 강령, 내부 규정. AI의 판단 근거를 정합니다.',
 lead='AI는 법을 모른 채 자신 있게 말합니다. 우리 일에 적용되는 규범을 레퍼런스로 올려 두면, 판단할 때 그것을 먼저 봅니다.',
 why=['교육, 코칭, 공공사업, 보조금, 개인정보. 운영자의 일에는 반드시 지켜야 할 규범이 있습니다. 관련 법령, 기관 지침, 직업 윤리 강령, 내부 규정을 한 장으로 정리해 두면 AI가 초안을 낼 때 그 기준을 통과시킵니다.',
      '규범 사이에 충돌이 생기면 우선순위가 필요합니다. 법이 가장 위, 그다음 기관 지침, 내부 규정, 관행 순서입니다. 이 순서를 적어 두면 AI가 임의로 고르지 않습니다.',
      '법령 조문은 반드시 최신본을 확인합니다. 국가법령정보센터에서 조문 번호와 개정일을 함께 적어 두면 나중에 다시 찾기 쉽습니다.'],
 template='''[제도·강령·법 레퍼런스]

우선순위: 법령 > 기관 지침 > 직업 윤리 강령 > 내부 규정 > 관행

■ 규범 1
이름: (예: 개인정보 보호법)
출처: (조문 번호, 개정일, 확인한 날짜)
우리 일에 적용되는 핵심 요약(3줄 이내):
개입해야 하는 상황: (예: 참가자 명단·사진·설문 응답을 다룰 때)
위반 시 처리: (예: 즉시 중단, 담당자 확인)

■ 규범 2
이름: (예: 기관 사업 수행 지침)
출처:
핵심 요약:
개입 상황:
위반 시 처리:

■ 규범 3
이름: (예: 코칭 윤리 강령, 내부 강사 행동 규정)
출처:
핵심 요약:
개입 상황:
위반 시 처리:''',
 prompt='''너는 우리 조직의 일을 도울 때 아래 [제도·강령·법 레퍼런스]를 판단의 기준으로 삼는다.

규칙
1. 초안을 내기 전에 "개입해야 하는 상황"에 해당하는지 확인한다. 해당하면 관련 규범을 먼저 적용한다.
2. 규범이 서로 충돌하면 적힌 우선순위를 따른다. 임의로 고르지 않는다.
3. 레퍼런스에 없는 조항이나 출처를 인용하지 않는다. 필요하면 [확인 필요: 어떤 규범의 어떤 조항]이라고 표시한다.
4. 규범을 적용해 초안을 바꿨다면 답 끝에 "적용한 규범: OO(조항)"을 한 줄로 밝힌다.
5. 위반 가능성이 있는 요청은 실행하지 않고 이유와 대안을 말한다.

[제도·강령·법 레퍼런스]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['우리 일에서 실제로 문제가 됐던 상황 세 가지를 떠올립니다. 그 상황을 다루는 규범부터 올립니다.',
        '조문 전체를 붙이지 않습니다. 핵심 요약 3줄과 조문 번호, 확인한 날짜만 적습니다.',
        '분기마다 한 번 개정 여부를 확인하고 날짜를 갱신합니다.'],
 check=['우선순위 한 줄이 맨 위에 있는가', '규범마다 출처와 확인 날짜가 있는가', '개입 상황이 구체적인 업무 장면으로 적혀 있는가', '위반 시 처리에 사람 확인 단계가 있는가']),

dict(slug='glossary', g=0, title='용어집', short='같은 것을 같은 말로. 우리가 쓰는 용어와 쓰지 않는 용어를 정합니다.',
 lead='"교실"이 아니라 "교육현장". 한 단어의 선택이 조직의 관점을 드러냅니다. 용어집은 그 관점을 AI에 넘기는 가장 짧은 방법입니다.',
 why=['같은 대상을 문서마다 다르게 부르면 읽는 사람이 헷갈리고, AI는 그중 아무거나 고릅니다. 용어집은 정의, 쓰는 말, 쓰지 않는 말, 예문을 한 줄에 묶습니다.',
      '용어집은 짧을수록 좋습니다. 헷갈렸던 말, 고쳤던 말, 외부에서 오해받았던 말만 넣습니다.'],
 template='''[용어집]

용어 | 정의 | 쓰지 않는 말 | 예문
교육현장 | 학교·기관·연수 등 우리가 가르치는 모든 자리 | 교실, 수업 장소 | "12년간 1,200회가 넘는 교육현장에서 배운 방법"
참가자 | 프로그램에 참여하는 사람(학생·성인 모두) | 수강생, 고객 | "참가자 24명이 4개 조로 나뉘어"
운영자 | 조직·프로그램·수업을 운영하는 사람 | 사업자, 관리자 | "운영자가 먼저 기준을 세웁니다"
(계속 추가) | | |''',
 prompt='''너는 아래 [용어집]을 우리 조직의 공식 용어로 사용한다.

규칙
1. "쓰지 않는 말"이 입력에 들어와도 답변에서는 "용어" 열의 말로 바꿔 쓴다.
2. 정의가 겹치거나 애매한 용어가 나오면 예문에 가장 가까운 것을 고르고, 답 끝에 "용어 선택: OO"라고 밝힌다.
3. 용어집에 없는 새 용어를 만들어야 하면 그 용어와 정의를 제안하고 내 확인을 받은 뒤 쓴다.
4. 외부 문서(공고, 계약서, 법령)를 인용할 때는 원문 용어를 유지하고 괄호 안에 우리 용어를 적는다.

[용어집]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['최근 1년 문서에서 같은 대상을 다르게 부른 사례를 모읍니다.',
        '한 대상에 한 용어만 남기고 나머지는 "쓰지 않는 말"로 옮깁니다.',
        '규칙(02)과 함께 지침 파일에 넣고, 새 용어가 생길 때마다 한 줄씩 추가합니다.'],
 check=['용어마다 예문이 있는가', '쓰지 않는 말이 실제로 쓰였던 말인가', '전체가 30개 이내로 유지되는가', '정의가 한 줄로 끝나는가']),

dict(slug='process', g=1, title='반복 업무 프로세스 지도', short='시작 신호부터 끝 신호까지. 반복되는 일을 단계로 그립니다.',
 lead='AI에게 한 번에 결과를 요구하면 중간이 무너집니다. 일의 순서를 지도처럼 그려 주면 어느 단계에서 무엇을 낼지 스스로 압니다.',
 why=['강의 의뢰 접수, 프로그램 운영, 결과보고, 정산. 운영자의 일은 대부분 반복됩니다. 반복되는 일은 단계, 담당, 입력, 산출로 나눌 수 있습니다.',
      '프로세스 지도의 핵심은 "시작 신호"와 "끝 신호"입니다. 무엇이 오면 시작하고, 무엇이 나가면 끝나는지 정하면 AI가 지금 어느 단계인지 말할 수 있습니다.'],
 template='''[반복 업무 프로세스 지도]

업무 이름: (예: 기관 강의 의뢰 처리)
시작 신호: (예: 문의 폼 또는 메일로 의뢰가 들어옴)
끝 신호: (예: 확정 공문 발송 + 일정표 등록)

단계 | 하는 일 | 담당 | 입력 | 산출 | 넘어가는 조건
1 | 의뢰 내용 정리 | AI | 의뢰 메일 원문 | 의뢰 요약 카드(대상·일시·주제·예산) | 빠진 항목 없음
2 | 가능 여부 판단 | 사람 | 요약 카드, 일정표 | 가능/조정/불가 | 결정됨
3 | 제안서 초안 | AI | 요약 카드, 서식 사전 | 제안서 초안 | 서식 필수 항목 충족
4 | 검토·발송 | 사람 | 제안서 초안 | 발송본 | 검수 체크리스트 통과
5 | 확정 처리 | AI | 확정 회신 | 확정 공문 초안, 일정 항목 | 사람 확인

예외: (예: 예산 미기재 → 2단계 전에 질문 메일 초안)''',
 prompt='''너는 아래 [반복 업무 프로세스 지도]에 따라 일한다.

규칙
1. 시작 신호에 해당하는 입력이 오면 "1단계 시작"이라고 밝히고 그 단계의 산출만 낸다. 다음 단계를 미리 하지 않는다.
2. 담당이 "사람"인 단계에서는 실행하지 않는다. 사람이 결정할 항목을 정리해서 제시하고 멈춘다.
3. 각 단계가 끝나면 "넘어가는 조건"을 대조해 통과 여부를 한 줄로 적는다. 통과하지 못하면 무엇이 부족한지 말한다.
4. 답 첫 줄에 항상 "현재 단계: N/총 단계"를 쓴다.
5. 예외 상황이면 예외 처리를 먼저 하고 어느 단계로 돌아가는지 밝힌다.

[반복 업무 프로세스 지도]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['한 달에 세 번 이상 반복되는 일을 하나 고릅니다.',
        '실제로 했던 순서를 그대로 적습니다. 이상적인 순서가 아니라 실제 순서입니다.',
        '단계마다 담당을 "사람" 또는 "AI"로 표시합니다. 이 표시가 06 가이드의 출발점이 됩니다.'],
 check=['시작 신호와 끝 신호가 관찰 가능한 사건인가', '단계마다 입력과 산출이 있는가', '사람이 담당하는 단계가 최소 하나 있는가', '예외가 하나 이상 적혀 있는가']),

dict(slug='boundaries', g=1, title='AI에게 맡길 일과 사람이 결정할 일', short='초안·정리·분류는 AI, 발송·금액·사람 평가는 사람. 경계를 긋습니다.',
 lead='AI가 일을 잘할수록 경계가 중요해집니다. 어디까지 맡기고 어디서 멈출지 적어 두지 않으면, 멈춰야 할 곳에서 멈추지 않습니다.',
 why=['AI에게 맡기기 좋은 일은 초안 쓰기, 정리, 분류, 요약, 대조입니다. 사람이 결정해야 할 일은 외부 발송, 금액, 사람에 대한 평가, 개인정보 처리, 계약입니다.',
      '경계는 금지 목록이 아니라 "멈추고 묻는 상황"의 목록입니다. AI가 멈춰서 결정 카드를 내밀면 운영자는 결정만 하면 됩니다.'],
 template='''[AI에게 맡길 일과 사람이 결정할 일]

AI가 끝까지 한다
- 초안 작성(메일, 공문, 제안서, 안내문)
- 정리·요약(회의록, 설문 응답, 자료)
- 분류·대조(문의 유형, 기준 준수 여부)
- 일정·체크리스트 생성

AI가 초안까지만 하고 사람이 결정한다
- 외부로 나가는 모든 발송
- 금액, 견적, 정산
- 사람에 대한 평가·선발·피드백
- 개인정보가 포함된 자료 처리
- 계약, 약정, 공식 회신

반드시 멈추고 묻는 상황
- (예: 참가자 개인정보가 입력에 포함됨)
- (예: 요청이 규범 레퍼런스와 충돌함)
- (예: 예산·일정이 기준 밖임)''',
 prompt='''너는 아래 [AI에게 맡길 일과 사람이 결정할 일]의 경계 안에서 일한다.

규칙
1. "AI가 끝까지 한다" 항목은 완성본을 낸다.
2. "사람이 결정한다" 항목은 초안까지만 내고, 마지막에 [결정 필요] 카드를 붙인다. 카드에는 결정할 것, 선택지, 각 선택지의 영향, 내 권고를 적는다. 실행하지 않는다.
3. "반드시 멈추고 묻는 상황"에 해당하면 작업을 시작하지 않고 상황과 질문만 낸다.
4. 어떤 항목에 해당하는지 애매하면 "사람이 결정한다"로 취급한다.

[AI에게 맡길 일과 사람이 결정할 일]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['프로세스 지도(05)에서 담당이 "사람"인 단계를 모읍니다. 그것이 결정 목록의 초안입니다.',
        '지난 1년간 "이건 AI가 하면 안 됐다"고 느꼈던 일을 "멈추고 묻는 상황"에 넣습니다.',
        '분기마다 경계를 다시 봅니다. 신뢰가 쌓이면 옮기고, 사고가 있었으면 되돌립니다.'],
 check=['외부 발송과 금액이 사람 결정에 있는가', '개인정보 처리가 멈춤 상황에 있는가', '결정 카드에 권고가 포함되도록 했는가', '애매할 때의 기본값이 정해져 있는가']),

dict(slug='io-spec', g=1, title='입력·산출 규격', short='무엇을 넣고 무엇이 나와야 하는지. 형식을 먼저 고정합니다.',
 lead='결과가 매번 다른 모양이면 다시 쓰게 됩니다. 넣는 것과 나오는 것의 규격을 고정하면 AI 결과가 바로 다음 단계에 들어갑니다.',
 why=['입력 규격은 AI가 질문을 덜 하게 만듭니다. 최소 필수 정보를 정해 두면 빠진 것을 한 번에 묻습니다.',
      '산출 규격은 결과를 재사용하게 만듭니다. 표인지 개조식인지, 몇 줄인지, 어떤 순서인지, 파일명은 무엇인지 정하면 복사해서 바로 씁니다.'],
 template='''[입력·산출 규격]

작업 이름: (예: 설문 응답 정리)

입력
- 받는 형태: (예: 응답 원문을 한 줄에 하나씩)
- 최소 필수 정보: (예: 프로그램명, 응답 수, 질문 문항)
- 있으면 좋은 정보: (예: 대상 연령대, 이전 회차 결과)
- 받지 않는 것: (예: 응답자 이름·연락처)

산출
- 형식: (예: 표 1개 + 개조식 5줄)
- 순서: (예: 요약 → 긍정 상위 3 → 개선 상위 3 → 다음 회차 제안)
- 길이: (예: 전체 A4 반 장)
- 숫자 표기: (예: 비율은 소수점 없이 %, 응답 수 함께)
- 파일명: (예: 2026-09_설문정리_프로그램명)
- 마지막 줄: (예: "확인 필요" 항목 목록)''',
 prompt='''너는 아래 [입력·산출 규격]을 지켜 작업한다.

규칙
1. 입력을 받으면 먼저 "최소 필수 정보"가 다 있는지 확인한다. 빠졌으면 작업을 시작하지 않고 빠진 항목만 한 번에 묻는다.
2. "받지 않는 것"이 입력에 섞여 있으면 그 부분은 사용하지 않고, 답 첫 줄에 "제외한 입력: OO"라고 밝힌다.
3. 산출은 형식, 순서, 길이, 숫자 표기, 파일명, 마지막 줄 규칙을 그대로 따른다. 규격 밖의 설명은 붙이지 않는다.
4. 규격을 지킬 수 없는 이유가 있으면 결과 대신 이유와 대안을 말한다.

[입력·산출 규격]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['가장 자주 다시 고쳐 쓰는 결과물 하나를 고릅니다.',
        '최근에 잘 나온 결과 한 편을 보고 형식, 순서, 길이를 역으로 적습니다.',
        '서식 사전(01)과 겹치면 서식 사전을 가리키고 규격에는 입력 부분만 남깁니다.'],
 check=['최소 필수 정보가 3개 이내인가', '받지 않는 것에 개인정보가 있는가', '산출 순서가 번호로 적혀 있는가', '파일명 규칙에 날짜가 있는가']),

dict(slug='review', g=1, title='결과물 검수 체크리스트', short='사실, 기준, 서식, 대상, 개인정보. AI가 스스로 검수하고 표를 붙입니다.',
 lead='검수를 사람이 전부 하면 AI를 쓰는 의미가 줄어듭니다. 검수 기준을 주면 AI가 먼저 걸러내고, 사람은 남은 것만 봅니다.',
 why=['검수 항목은 다섯 가지면 충분합니다. 사실이 맞는가, 기준(규범·규칙)을 지켰는가, 서식이 맞는가, 대상에게 적합한가, 개인정보가 없는가.',
      '검수 결과를 표로 붙이게 하면 무엇을 확인했고 무엇이 남았는지 한눈에 보입니다. "확인 필요"만 사람이 보면 됩니다.'],
 template='''[결과물 검수 체크리스트]

항목 | 확인할 것 | 통과 기준
사실 | 수치, 날짜, 이름, 인용 | 입력에 있는 것만 사용, 추정 없음
기준 | 규범 레퍼런스, 일하는 규칙 | 충돌 없음, 적용 규범 명시
서식 | 서식 사전의 필수 항목 | 항목 누락 없음, 순서 일치
대상 | 받는 사람의 눈높이와 상황 | 전문 용어 설명 있음, 요구가 한 줄로 분명
개인정보 | 이름·연락처·사진·민감 정보 | 없음 또는 [확인 필요] 표시
톤 | 쓰지 않는 말, 문장 길이 | 규칙 위반 0건

판정: 통과 / 수정 / 확인 필요''',
 prompt='''너는 결과물을 낸 뒤 반드시 아래 [결과물 검수 체크리스트]로 자체 검수하고, 검수 표를 결과 끝에 붙인다.

규칙
1. 항목마다 판정(통과 / 수정 / 확인 필요)과 근거를 한 줄로 적는다.
2. "수정"이 하나라도 있으면 먼저 고친 뒤 다시 검수한다. 최대 2회. 그래도 남으면 "확인 필요"로 넘긴다.
3. "확인 필요"는 무엇을, 누가, 어떻게 확인하면 되는지 적는다.
4. 검수 표는 결과물의 일부가 아니다. 결과물과 표 사이에 구분선을 넣는다.
5. 내가 "검수만"이라고 하면 결과물 없이 검수 표만 낸다.

[결과물 검수 체크리스트]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['최근에 외부로 나간 뒤 문제가 됐던 결과물을 떠올립니다. 그때 놓친 항목을 표에 넣습니다.',
        '통과 기준을 관찰 가능한 말로 씁니다. "적절함" 대신 "항목 누락 없음".',
        '외부 발송 문서는 AI 검수 통과 후에도 사람이 한 번 더 읽습니다. 경계(06)에 적어 둡니다.'],
 check=['항목이 6개 이내인가', '통과 기준이 관찰 가능한가', '확인 필요 항목에 담당이 지정되는가', '외부 발송 전 사람 확인이 경계 문서에 있는가']),

dict(slug='purpose', g=2, title='목적 선언문', short='누구를 위해, 무엇을, 왜. 모든 초안을 비추어 볼 한 장.',
 lead='목적이 없으면 AI는 그럴듯한 것을 냅니다. 목적이 있으면 맞는 것을 냅니다. 한 장이면 충분합니다.',
 why=['목적 선언문은 조직이나 프로그램이 존재하는 이유를 한 장에 적은 것입니다. 누구를 위해, 무엇을, 왜 하는지, 성공하면 어떤 변화가 보이는지, 그리고 하지 않는 것은 무엇인지.',
      '"하지 않는 것"이 가장 힘이 셉니다. AI가 범위를 넓히려 할 때 이 항목이 멈춥니다.'],
 template='''[목적 선언문]

이 일(조직/프로그램)의 이름:
누구를 위해: (예: 진로를 고민하는 중·고등학생과 그들을 돕는 교사)
무엇을: (예: 자기 이해를 바탕으로 한 진로 설계 경험)
왜: (예: 같은 프로그램을 모두에게 권하는 방식으로는 자립이 일어나지 않기 때문)
성공하면 보이는 변화: (예: 참가자가 자기 말로 다음 행동 한 가지를 정한다)
하지 않는 것: (예: 표준 커리큘럼 납품, 결과 등급 매기기)
우선순위가 충돌할 때: (예: 참가자의 자립 > 기관의 편의 > 우리의 효율)''',
 prompt='''너는 아래 [목적 선언문]을 모든 제안과 초안의 기준으로 삼는다.

규칙
1. 초안을 내기 전에 이 일이 "누구를 위해, 무엇을, 왜"에 맞는지 한 줄로 확인한다.
2. "하지 않는 것"에 해당하는 요청은 실행하지 않고 이유를 말한다. 대안이 있으면 한 가지만 제안한다.
3. 선택지가 여러 개면 "우선순위가 충돌할 때"의 순서로 고른다.
4. 결과가 "성공하면 보이는 변화"에 어떻게 기여하는지 답 끝에 한 줄로 적는다.

[목적 선언문]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['이미 있는 소개문을 그대로 쓰지 않습니다. 소개문은 밖을 향하고, 선언문은 안을 향합니다.',
        '"하지 않는 것"을 먼저 씁니다. 거절했던 일, 후회했던 일에서 나옵니다.',
        '마스터 프롬프트(12)의 맨 위에 둡니다. 모든 기준보다 앞섭니다.'],
 check=['한 장 안에 들어가는가', '성공하면 보이는 변화가 관찰 가능한 행동인가', '하지 않는 것이 두 개 이상인가', '우선순위 순서가 있는가']),

dict(slug='done', g=2, title='과업 도달 형태', short='끝났다는 것이 어떤 모양인지. 완료 기준을 먼저 정합니다.',
 lead='"다 됐어요"는 사람마다 다릅니다. 무엇이, 어디에, 어떤 상태로 있으면 끝인지 적으면 AI와 사람이 같은 곳을 봅니다.',
 why=['과업 도달 형태는 완료 기준입니다. 결과물이 무엇인지, 어디에 있는지, 어떤 상태인지, 누가 확인하는지, 무엇은 완료가 아닌지.',
      '시작할 때 완료 기준을 확인하고, 끝날 때 대조표를 붙이게 하면 "거의 됐다"가 사라집니다.'],
 template='''[과업 도달 형태]

과업 이름: (예: 9월 진로 워크숍 결과보고)
완료된 모습
- 무엇이: (예: 결과보고서 1부, 사진 10장, 설문 집계표 1장)
- 어디에: (예: 기관 담당자 메일 + 우리 드라이브 2026-09 폴더)
- 어떤 상태로: (예: 서식 사전 "결과보고" 필수 항목 충족, 검수 통과)
측정 방법: (예: 담당자 회신 "접수 확인" 수령)
받는 사람이 확인하는 것: (예: 참가 인원, 만족도, 예산 집행 내역)
완료가 아닌 것: (예: 초안 저장만 한 상태, 사진 미정리, 담당자 미회신)
기한: (예: 워크숍 종료 후 5일 이내)''',
 prompt='''너는 과업을 시작하기 전에 아래 [과업 도달 형태]를 확인하고, 끝낼 때 완료 대조표를 붙인다.

규칙
1. 시작할 때 "완료된 모습"을 한 줄로 되풀이해 말한다. 내가 수정하면 그 기준으로 진행한다.
2. 결과를 낼 때 완료 대조표를 붙인다. 항목: 무엇이 / 어디에 / 어떤 상태로 / 측정 / 완료가 아닌 것. 각 항목에 충족 여부와 근거를 적는다.
3. "완료가 아닌 것"에 해당하면 완료라고 말하지 않는다. 남은 일을 목록으로 낸다.
4. 기한 안에 끝낼 수 없다고 판단되면 가장 먼저 그 사실과 대안을 말한다.

[과업 도달 형태]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['최근에 "끝났다"고 했다가 다시 돌아온 일 하나를 고릅니다. 돌아온 이유가 "완료가 아닌 것"입니다.',
        '완료된 모습을 사진 찍듯 씁니다. 파일 이름, 폴더 이름, 받는 사람 이름까지.',
        '프로젝트 브리프(11)의 산출물 항목에 그대로 인용합니다.'],
 check=['무엇이·어디에·어떤 상태로가 모두 있는가', '측정 방법이 외부에서 확인되는가', '완료가 아닌 것이 세 개 이상인가', '기한이 있는가']),

dict(slug='brief', g=2, title='프로젝트 브리프', short='배경·목적·범위·산출물·결정권자. 프로젝트 하나를 한 장으로 넘깁니다.',
 lead='기준, 프로세스, 완료 기준이 있어도 프로젝트마다 다른 것이 있습니다. 브리프는 그 다른 것을 한 장에 모아 AI에 넘기는 문서입니다.',
 why=['브리프는 앞선 가이드를 인용하는 문서입니다. 목적은 09에서, 산출물은 10에서, 기준은 01과 03에서, 프로세스는 05에서 가져옵니다. 새로 쓰는 것은 배경, 대상, 범위, 일정, 결정권자, 리스크입니다.',
      '범위의 "제외" 항목이 브리프의 핵심입니다. AI가 범위 밖 요청을 알아채게 만듭니다.'],
 template='''[프로젝트 브리프]

프로젝트 이름:
배경(왜 지금 이 일이 생겼나, 3줄):
목적: (목적 선언문 09에서 인용)
대상: (누구에게, 몇 명, 어떤 상황)
범위
- 포함:
- 제외:
산출물: (과업 도달 형태 10에서 인용)
일정
- 시작:
- 중간 확인:
- 완료 기한:
적용 기준: (서식 사전 01, 규범 레퍼런스 03 중 해당 항목)
따르는 프로세스: (프로세스 지도 05 중 해당 업무)
결정권자: (이름 또는 역할, 결정 범위)
리스크와 대응: (예: 참가자 수 미확정 → 최대 인원 기준 준비)''',
 prompt='''너는 아래 [프로젝트 브리프]에 따라 이 프로젝트를 돕는다.

규칙
1. 모든 작업 요청을 "범위 - 포함"과 대조한다. "제외"에 해당하면 실행하지 않고 범위 밖임을 알린다.
2. 결정이 필요한 사항은 "결정권자"에게 [결정 필요] 카드로 정리한다. 카드에 선택지와 권고를 담는다.
3. 일정의 "중간 확인" 시점에는 진행 상황을 산출물 기준으로 요약한다.
4. 리스크에 적힌 상황이 발생하면 적힌 대응을 먼저 적용하고 알린다.
5. 브리프와 다른 기준 문서가 충돌하면 브리프를 따르되, 규범 레퍼런스(법령·지침)는 항상 브리프보다 앞선다.

[프로젝트 브리프]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['새 프로젝트가 생기면 브리프부터 씁니다. 회의보다 먼저입니다.',
        '인용 항목은 복사하지 않고 "09 목적 선언문 참조"처럼 가리킵니다. 기준 문서가 바뀌면 브리프도 자동으로 따라갑니다.',
        '프로젝트가 끝나면 브리프 맨 아래에 실제 결과와 배운 점을 세 줄 적고 보관합니다.'],
 check=['제외 항목이 있는가', '결정권자와 결정 범위가 있는가', '산출물이 과업 도달 형태를 가리키는가', '리스크마다 대응이 있는가']),

dict(slug='master', g=2, title='운영 환경 마스터 프롬프트', short='앞의 11개를 하나로 조립합니다. AI 프로젝트 지침 한 장의 완성형.',
 lead='환경 세팅의 마지막은 조립입니다. 목적, 기준, 프로세스, 과업을 한 장의 지침으로 묶으면, 어떤 AI를 쓰든 첫 대화부터 우리 조직처럼 일합니다.',
 why=['마스터 프롬프트는 새 프롬프트가 아니라 순서입니다. 역할, 목적(09), 기준(01~04), 프로세스(05~08), 과업(10~11), 작동 규칙, 시작 절차의 순서로 앞선 문서를 붙입니다.',
      '한 장이 길어지면 파일로 나눕니다. 지침에는 순서와 작동 규칙만 두고, 서식 사전이나 규범 레퍼런스는 지식 파일로 첨부합니다.',
      'ChatGPT의 프로젝트 지침, Claude의 프로젝트 지침과 지식 파일, Gemini의 Gem 지침 모두 같은 방식으로 씁니다. 저장 기능이 없는 도구라면 파일 하나로 두고 대화를 시작할 때 붙입니다.'],
 template='''[운영 환경 마스터 프롬프트]

■ 역할
너는 (조직 이름)의 운영을 돕는 동료다. 아래 순서로 정리된 우리 조직의 환경 안에서 일한다.

■ 목적 (09 목적 선언문)
(붙여 넣기 또는 "지식 파일: purpose.md 참조")

■ 기준
- 01 서식 사전: (붙여 넣기 또는 파일 참조)
- 02 일하는 규칙과 말투: (붙여 넣기 또는 파일 참조)
- 03 제도·강령·법 레퍼런스: (붙여 넣기 또는 파일 참조)
- 04 용어집: (붙여 넣기 또는 파일 참조)

■ 프로세스
- 05 반복 업무 프로세스 지도: (해당 업무만)
- 06 AI에게 맡길 일과 사람이 결정할 일: (붙여 넣기)
- 07 입력·산출 규격: (해당 작업만)
- 08 결과물 검수 체크리스트: (붙여 넣기)

■ 과업
- 10 과업 도달 형태: (진행 중인 과업만)
- 11 프로젝트 브리프: (진행 중인 프로젝트만)

■ 작동 규칙
1. 우선순위: 규범 레퍼런스(03) > 목적(09) > 브리프(11) > 나머지 기준.
2. 사람이 결정할 일(06)은 실행하지 않고 [결정 필요] 카드로 낸다.
3. 모든 결과에 검수 표(08)를 붙인다.
4. 정보가 부족하면 지어내지 않고 한 번에 묻는다.
5. 답 첫 줄에 "적용 문서: OO, OO"를 쓴다.

■ 시작 절차
대화가 시작되면 (1) 진행 중인 과업과 프로젝트를 한 줄씩 확인하고 (2) 오늘 할 일을 묻는다.

■ 변경 이력
- (날짜) 최초 작성
- (날짜) OO 갱신''',
 prompt='''아래 [운영 환경 마스터 프롬프트]는 이 프로젝트(또는 대화)의 기본 지침이다. 모든 답변은 이 문서의 순서와 작동 규칙을 따른다.

첫 답변에서는 다음만 한다.
1. 읽은 문서 목록을 "적용 문서:" 한 줄로 확인한다.
2. 비어 있거나 "참조"로만 적힌 항목이 있으면 목록으로 알려 준다.
3. 시작 절차를 실행한다.

[운영 환경 마스터 프롬프트]
(여기에 채운 템플릿을 붙여 넣기)''',
 steps=['01부터 11까지 다 채우지 않아도 됩니다. 있는 것만 붙이고 빈 항목은 "미작성"이라고 씁니다. AI가 첫 답변에서 빈 항목을 알려 줍니다.',
        'AI 도구의 프로젝트 지침에 마스터 프롬프트를 넣고, 긴 문서는 지식 파일로 첨부합니다.',
        '월 1회 변경 이력을 갱신합니다. 기준 문서가 바뀌면 마스터 프롬프트의 해당 항목만 바꿉니다.'],
 check=['우선순위 규칙이 작동 규칙에 있는가', '결정 카드와 검수 표 규칙이 있는가', '시작 절차가 있는가', '변경 이력에 날짜가 있는가']),
]

assert len(GUIDES) == 12

# ---------- HTML pieces ----------
def head(title, desc, url, og_img):
    t = html.escape(title); d = html.escape(desc)
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{t}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:image" content="{SITE}/assets/og/{og_img}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{SITE}/assets/og/{og_img}.jpg">
<meta name="theme-color" content="#f1ede5">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/assets/sky.css">
<link rel="stylesheet" href="/assets/ai.css">
'''

HEADER = '''<body>
<a class="skip-link" href="#main">본문 바로가기</a>
<header class="sk-head">
  <div class="sk-head__in">
    <a class="sk-logo" href="/" aria-label="네다바웨이 홈"><img class="sk-logo__word" src="/assets/brand/nw-wordmark-color.png" width="1128" height="180" alt="NEDABAHWAY"></a>
    <nav class="sk-nav" id="skNav" aria-label="주요 메뉴">
      <a href="/about.html">About</a>
      <a href="/programs.html">Programs</a>
      <a href="/personal.html">Personal</a>
      <a href="/ai/" aria-current="page">AI</a>
      <a href="/contact.html">Contact</a>
    </nav>
    <div class="sk-head__r">
      <a class="sk-diag" href="/diagnosis/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>무료진단</a>
      <button class="sk-burger" type="button" aria-controls="skNav" aria-expanded="false" aria-label="메뉴 열기">
        <svg class="i-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        <svg class="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
  </div>
</header>
'''

FOOTER = '''<footer class="sk-foot">
  <div class="wrap sk-foot__bottom">
    <span><strong class="sk-foot__logo"><img class="sk-logo__word" src="/assets/brand/nw-wordmark-color.png" width="1128" height="180" alt="NEDABAHWAY"></strong> &copy; 2026 NEDABAHWAY</span>
    <span class="sk-foot__links">
      <a href="https://www.youtube.com/channel/UCWnbno58Hrtiu8fPjrCCTfQ" rel="noopener">YouTube</a>
      <a href="https://blog.naver.com/nedabah" rel="noopener">Blog</a>
      <a href="/privacy.html">개인정보처리방침</a>
      <a href="/locked/" class="sk-foot__vault">자료실</a>
    </span>
  </div>
</footer>
<script src="/assets/sky.js" defer></script>
<script src="/assets/ai.js" defer></script>
<script src="/assets/analytics.js" defer></script>
</body>
</html>
'''

MAILCARD = '''    <div class="mailcard reveal" style="margin-top:64px;">
      <h2 class="mailcard__t">우리 조직에 맞는 환경을 함께 세팅하고 싶다면</h2>
      <p class="mailcard__d">기준 문서부터 마스터 프롬프트까지, 반나절 워크숍으로 운영 환경을 같이 만듭니다. 짧은 대화 한 번으로 시작합니다.</p>
      <a class="mailcard__btn" href="/contact.html#consult-form">상담 신청하기 <span aria-hidden="true">&rarr;</span></a>
    </div>
'''

def esc(s): return html.escape(s, quote=False)

# ---------- hub ----------
def hub():
    title = 'AI 잘 쓰는 방법 — 환경 세팅 가이드 12개 | 네다바웨이'
    desc = '프롬프트 잘 쓰는 시대는 지났습니다. 기준·프로세스·과업 도달 형태를 AI에 올리는 환경 세팅 가이드 12개. 빈칸 템플릿과 복사용 프롬프트를 모든 운영자에게 무료로 제공합니다.'
    url = f'{SITE}/ai/'
    ld = json.dumps({"@context":"https://schema.org","@type":"CollectionPage","name":"AI 잘 쓰는 방법 — 환경 세팅 가이드 12개",
          "url":url,"description":desc,"inLanguage":"ko","isPartOf":{"@type":"WebSite","name":"네다바웨이","url":SITE+"/"}}, ensure_ascii=False)
    out = head(title, desc, url, 'ai') + f'<script type="application/ld+json">\n{ld}\n</script>\n</head>\n' + HEADER
    out += '''
<main id="main">
<section class="sec" aria-labelledby="aiTitle" style="padding-top:72px;">
  <div class="wrap">
    <div class="sec-head reveal">
      <p class="sec-kicker">AI 잘 쓰는 방법</p>
      <h1 class="sec-title" id="aiTitle">프롬프트 잘 쓰는 시대는<br>지났습니다<span class="dot">.</span></h1>
      <p class="about-lead" style="margin-top:18px;">그러나 환경은 세팅해야 합니다. 좋은 질문 한 줄로 좋은 답을 얻던 시기는 끝났습니다. 지금은 AI가 일할 환경, 즉 우리가 기준으로 삼는 서식과 규칙, 규범과 제도, 강령과 법, 일의 프로세스, 목적과 과업 도달 형태를 먼저 갖춘 사람이 가장 좋은 결과를 얻습니다.</p>
      <p class="about-lead" style="margin-top:12px;">네다바웨이가 실제로 쓰는 방식을 12개 가이드로 정리했습니다. 조직, 프로그램, 수업을 운영하는 모든 운영자에게 무료로 제공합니다. API 키도, 회원가입도 없습니다. 빈칸을 채우고 프롬프트와 함께 쓰는 AI에 붙여 넣으면 됩니다.</p>
    </div>

    <div class="ai-layers reveal" aria-label="가장 효과적인 방법 세 층">
      <div class="ai-layer" style="--tc:var(--explorer);"><span class="ai-layer__n">1</span><strong class="ai-layer__t">기준을 올린다</strong><span class="ai-layer__d">서식, 규칙, 규범, 제도, 강령, 법. AI가 무엇을 기준으로 판단할지 먼저 정합니다.</span></div>
      <div class="ai-layer" style="--tc:var(--connector);"><span class="ai-layer__n">2</span><strong class="ai-layer__t">프로세스를 알려 준다</strong><span class="ai-layer__d">일이 어떤 순서로 흐르고, 어디서 AI가 멈추고 사람이 결정하는지 그립니다.</span></div>
      <div class="ai-layer" style="--tc:var(--supporter);"><span class="ai-layer__n">3</span><strong class="ai-layer__t">목적과 도달 형태를 정한다</strong><span class="ai-layer__d">왜 하는지, 끝났다는 것이 어떤 모양인지 적습니다. 그래야 "거의 됐다"가 사라집니다.</span></div>
    </div>

    <div class="ai-how reveal">
      <p class="sec-kicker">쓰는 법</p>
      <ol class="ai-how__list">
        <li><strong>템플릿을 채웁니다.</strong> 각 가이드의 빈칸 템플릿을 우리 조직의 실제 내용으로 채웁니다. 다 채우지 않아도 됩니다.</li>
        <li><strong>프롬프트와 함께 붙여 넣습니다.</strong> 복사용 프롬프트 아래에 채운 템플릿을 붙여 AI에 넣습니다. ChatGPT, Claude, Gemini 어느 것이든 같습니다.</li>
        <li><strong>지침으로 저장합니다.</strong> AI 도구의 프로젝트 지침이나 지식 파일에 저장하면 다음 대화부터 자동으로 적용됩니다. 12번 가이드가 조립법입니다.</li>
      </ol>
    </div>
'''
    n = 0
    for gi, (gname, gdesc) in enumerate(GROUPS):
        out += f'\n    <h2 class="sec-kicker ai-group__t">{esc(gname)}</h2>\n    <p class="ai-group__d">{esc(gdesc)}</p>\n    <div class="cards cards--4" style="margin-bottom:56px;">\n'
        for g in GUIDES:
            if g['g'] != gi: continue
            n += 1
            out += f'      <a class="card reveal" href="/ai/{g["slug"]}/"><span class="card__n">{n:02d}</span><span class="card__t">{esc(g["title"])}</span><span class="card__d">{esc(g["short"])}</span></a>\n'
        out += '    </div>\n'
    out += MAILCARD + '  </div>\n</section>\n</main>\n\n' + FOOTER
    return out

# ---------- guide page ----------
def pre_block(label, text, idx, kind):
    return f'''    <div class="ai-block">
      <div class="ai-block__bar"><span class="ai-block__label">{label}</span><button type="button" class="ai-copy" data-copy-target="{kind}-{idx}">복사</button></div>
      <pre class="ai-pre" id="{kind}-{idx}" tabindex="0">{esc(text)}</pre>
    </div>
'''

def guide(i, g):
    n = i + 1
    gname = GROUPS[g['g']][0]
    title = f'{g["title"]} — AI 잘 쓰는 방법 {n:02d} | 네다바웨이'
    desc = g['short']
    url = f'{SITE}/ai/{g["slug"]}/'
    prev = GUIDES[i-1] if i > 0 else None
    nxt = GUIDES[i+1] if i < 11 else None
    ld = json.dumps({"@context":"https://schema.org","@type":"HowTo","name":g["title"],"description":desc,
          "url":url,"inLanguage":"ko","step":[{"@type":"HowToStep","text":s} for s in g['steps']]}, ensure_ascii=False)
    out = head(title, desc, url, g['slug']) + f'<script type="application/ld+json">\n{ld}\n</script>\n</head>\n' + HEADER
    out += f'''
<main id="main">
<section class="sec" aria-labelledby="gTitle" style="padding-top:72px;">
  <div class="wrap ai-wrap">
    <p class="ai-crumb"><a href="/ai/">&larr; AI 잘 쓰는 방법</a> · {n:02d}/12 · {esc(gname)}</p>
    <div class="sec-head">
      <h1 class="sec-title" id="gTitle">{esc(g["title"])}<span class="dot">.</span></h1>
      <p class="about-lead" style="margin-top:18px;">{esc(g["lead"])}</p>
    </div>

    <h2 class="ai-h2">왜 필요한가</h2>
    <div class="prose">
'''
    for p in g['why']:
        out += f'      <p>{esc(p)}</p>\n'
    out += '    </div>\n\n    <h2 class="ai-h2">채워 넣을 템플릿</h2>\n    <p class="ai-note">빈칸을 우리 조직의 실제 내용으로 채웁니다. 괄호 안 예시는 지우고 씁니다.</p>\n'
    out += pre_block('템플릿', g['template'], n, 'tpl')
    out += '\n    <h2 class="ai-h2">복사용 프롬프트</h2>\n    <p class="ai-note">이 프롬프트 아래에 채운 템플릿을 붙여 AI에 넣습니다. 프로젝트 지침으로 저장하면 매번 붙일 필요가 없습니다.</p>\n'
    out += pre_block('프롬프트', g['prompt'], n, 'prm')
    out += '\n    <h2 class="ai-h2">이렇게 씁니다</h2>\n    <ol class="ai-steps">\n'
    for s in g['steps']:
        out += f'      <li>{esc(s)}</li>\n'
    out += '    </ol>\n\n    <h2 class="ai-h2">체크리스트</h2>\n    <ul class="ai-check">\n'
    for c in g['check']:
        out += f'      <li>{esc(c)}</li>\n'
    out += '    </ul>\n\n    <nav class="ai-pager" aria-label="가이드 이동">\n'
    if prev:
        out += f'      <a class="ai-pager__a" href="/ai/{prev["slug"]}/"><span class="ai-pager__k">&larr; 이전</span><span class="ai-pager__t">{n-1:02d} {esc(prev["title"])}</span></a>\n'
    else:
        out += '      <a class="ai-pager__a" href="/ai/"><span class="ai-pager__k">&larr; 목록</span><span class="ai-pager__t">AI 잘 쓰는 방법</span></a>\n'
    if nxt:
        out += f'      <a class="ai-pager__a ai-pager__a--next" href="/ai/{nxt["slug"]}/"><span class="ai-pager__k">다음 &rarr;</span><span class="ai-pager__t">{n+1:02d} {esc(nxt["title"])}</span></a>\n'
    else:
        out += '      <a class="ai-pager__a ai-pager__a--next" href="/ai/"><span class="ai-pager__k">목록 &rarr;</span><span class="ai-pager__t">12개 가이드 전체</span></a>\n'
    out += '    </nav>\n' + MAILCARD + '  </div>\n</section>\n</main>\n\n' + FOOTER
    return out

CSS = '''/* ai.css — "AI 잘 쓰는 방법" hub + 12 environment-setup guides (brand v2, 2026-09-25) */
.ai-layers{margin-top:44px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
.ai-layer{position:relative;border:1px solid var(--line);background:var(--card);border-radius:var(--r-lg);padding:28px 26px 30px;display:flex;flex-direction:column;box-shadow:6px 6px 0 var(--tc,var(--connector));}
.ai-layer__n{font-family:var(--display);font-weight:800;font-size:15px;color:var(--cobalt);background:var(--cobalt-bg);border:1px solid var(--cobalt-line);border-radius:999px;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;}
.ai-layer__t{margin-top:14px;font-size:clamp(19px,2.2vw,22px);font-weight:800;letter-spacing:-.02em;color:var(--ink);}
.ai-layer__d{margin-top:10px;font-size:16px;color:var(--text-3);line-height:1.7;word-break:keep-all;}
.ai-how{margin:56px 0 64px;border:2px solid var(--ink);background:var(--bg-2);border-radius:var(--r-lg);padding:34px 32px;}
.ai-how__list{margin:16px 0 0;padding-left:0;list-style:none;counter-reset:how;display:grid;gap:14px;}
.ai-how__list li{position:relative;padding-left:44px;font-size:16px;color:var(--text-2);line-height:1.7;word-break:keep-all;counter-increment:how;}
.ai-how__list li::before{content:counter(how);position:absolute;left:0;top:2px;width:30px;height:30px;border-radius:999px;background:var(--ink);color:var(--card);font-family:var(--display);font-weight:800;font-size:14px;display:inline-flex;align-items:center;justify-content:center;}
.ai-how__list strong{color:var(--ink);}
.ai-group__t{margin-bottom:6px;}
.ai-group__d{margin:0 0 18px;font-size:16px;color:var(--text-3);word-break:keep-all;}
.ai-wrap{max-width:820px;}
.ai-crumb{font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.08em;color:var(--cobalt);margin-bottom:12px;}
.ai-crumb a:hover{text-decoration:underline;}
.ai-h2{margin-top:52px;font-family:var(--display);font-weight:700;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:var(--cobalt);}
.ai-h2 + .prose{margin-top:14px;}
.ai-note{margin-top:10px;font-size:15px;color:var(--text-3);word-break:keep-all;}
.ai-block{margin-top:16px;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--card);}
.ai-block__bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:var(--bg-2);border-bottom:1px solid var(--line);}
.ai-block__label{font-family:var(--display);font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3);}
.ai-copy{font-family:var(--sans);font-weight:700;font-size:14px;color:var(--card);background:var(--ink);border:0;border-radius:8px;padding:7px 14px;cursor:pointer;transition:background .2s;}
.ai-copy:hover,.ai-copy:focus-visible{background:var(--cobalt);}
.ai-copy.is-done{background:var(--sage);}
.ai-pre{margin:0;padding:18px 16px;font-family:'Pretendard Variable','Pretendard',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14.5px;line-height:1.7;color:var(--text-2);white-space:pre-wrap;word-break:break-word;overflow-x:auto;max-height:520px;overflow-y:auto;}
.ai-pre:focus-visible{outline:2px solid var(--cobalt);outline-offset:-2px;}
.ai-steps,.ai-check{margin:16px 0 0;padding-left:0;list-style:none;display:grid;gap:12px;}
.ai-steps{counter-reset:st;}
.ai-steps li{position:relative;padding-left:40px;font-size:16px;color:var(--text-2);line-height:1.7;word-break:keep-all;counter-increment:st;}
.ai-steps li::before{content:counter(st);position:absolute;left:0;top:2px;width:28px;height:28px;border-radius:999px;background:var(--cobalt-bg);border:1px solid var(--cobalt-line);color:var(--cobalt);font-family:var(--display);font-weight:800;font-size:13px;display:inline-flex;align-items:center;justify-content:center;}
.ai-check li{position:relative;padding-left:32px;font-size:16px;color:var(--text-2);line-height:1.7;word-break:keep-all;}
.ai-check li::before{content:"";position:absolute;left:2px;top:7px;width:16px;height:16px;border:2px solid var(--ink);border-radius:4px;background:var(--card);}
.ai-pager{margin-top:56px;display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.ai-pager__a{display:flex;flex-direction:column;gap:4px;border:1px solid var(--line);background:var(--card);border-radius:var(--r);padding:16px 18px;transition:transform .2s,border-color .2s,box-shadow .2s;}
.ai-pager__a:hover{border-color:var(--ink);transform:translate(-2px,-2px);box-shadow:4px 4px 0 var(--connector);}
.ai-pager__a--next{text-align:right;}
.ai-pager__k{font-family:var(--display);font-weight:700;font-size:13px;letter-spacing:.08em;color:var(--cobalt);}
.ai-pager__t{font-weight:700;font-size:15px;color:var(--ink);word-break:keep-all;}
@media(max-width:900px){
  .ai-layers{grid-template-columns:1fr;}
  .ai-how{padding:26px 20px;}
  .ai-pager{grid-template-columns:1fr;}
  .ai-pager__a--next{text-align:left;}
}
'''

JS = '''/* ai.js — copy buttons for the AI environment-setup guides. */
(function () {
  'use strict';
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  document.querySelectorAll('.ai-copy[data-copy-target]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = document.getElementById(btn.getAttribute('data-copy-target'));
      if (!pre) return;
      var text = pre.textContent;
      var done = function (ok) {
        var label = btn.textContent;
        btn.textContent = ok ? '복사됨' : '복사 실패';
        btn.classList.toggle('is-done', ok);
        setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
      } else {
        done(fallbackCopy(text));
      }
    });
  });
})();
'''

# ---------- OG SVG (same <text> layout as scripts/build-og-images.py so build-og-jpg.py can render) ----------
def og_svg(title, summary, label):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="{esc(title)} — 네다바웨이">
  <rect width="1200" height="630" fill="#f1ede5"/>
  <rect x="0" y="0" width="14" height="630" fill="#1d4ed8"/>
  <text x="80" y="120" font-family="'Pretendard', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="22" font-weight="700" letter-spacing="6" fill="#1d4ed8">{esc(label) if label == '환경 세팅 가이드' else 'AI 잘 쓰는 방법' + ((' · ' + esc(label)) if label else '')}</text>
  <text x="80" y="280" font-family="'Pretendard', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="{84 if len(title) <= 10 else 72}" font-weight="800" fill="#1b1b1b">{esc(title)}</text>
  <text x="80" y="370" font-family="'Pretendard', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="28" font-weight="500" fill="#55504a">{esc(summary)}</text>
  <text x="80" y="560" font-family="'Pretendard', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="20" font-weight="700" fill="#1d4ed8">김창환</text>
  <text x="170" y="560" font-family="'Pretendard', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="18" font-weight="400" fill="#55504a">· nedabah.org/ai</text>
</svg>
'''

def write(p, s):
    p = ROOT / p; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(s, encoding='utf-8')

write('ai/index.html', hub())
for i, g in enumerate(GUIDES):
    write(f'ai/{g["slug"]}/index.html', guide(i, g))
write('assets/ai.css', CSS)
write('assets/ai.js', JS)
write('assets/og/ai.svg', og_svg('AI 잘 쓰는 방법', '프롬프트가 아니라 환경. 세팅 가이드 12개', '환경 세팅 가이드'))
for i, g in enumerate(GUIDES):
    write(f'assets/og/{g["slug"]}.svg', og_svg(g['title'], g['short'][:40].rstrip('. ') , f'{i+1:02d}'))

# lists for other scripts
print('\n'.join(['ai/index.html'] + [f'ai/{g["slug"]}/index.html' for g in GUIDES]))
