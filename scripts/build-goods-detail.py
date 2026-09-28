#!/usr/bin/env python3
"""Generate /goods/<slug>/ detail pages (spec, size chart, order info, policy, FAQ, order form).

All measurements are 기준 사양 (standard production defaults) until the maker confirms;
each page says so. Prices are quoted on request. Re-run:  python3 scripts/build-goods-detail.py
"""
import importlib.util, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('bd', ROOT / 'scripts' / 'build-diagnosis.py')
bd = importlib.util.module_from_spec(spec); spec.loader.exec_module(bd)
esc, head, HEADER, FOOTER, ARROW, SITE = bd.esc, bd.head, bd.HEADER, bd.FOOTER, bd.ARROW, bd.SITE

MAIL = 'nedabah.way@gmail.com'
COMMON_POLICY = [
 ('제작 방식', '주문 후 제작하는 소량 굿즈입니다. 재고를 두지 않으며, 문의 → 견적 확인 → 입금 → 제작 → 발송 순서입니다.'),
 ('결제', '견적서의 계좌로 입금(비영리단체 네다바웨이 명의). 기관·기업은 세금계산서·거래명세서 발행 가능. 카드 결제는 준비 중.'),
 ('배송', '제주에서 택배로 보냅니다. 배송비는 견적에 별도 표기. 워크숍·캠프 진행 건은 현장 지급 가능.'),
 ('교환·환불', '주문 제작 상품이라 단순 변심 교환·환불은 어렵습니다. 인쇄 불량·오배송·파손은 수령 후 7일 안에 사진과 함께 알려 주시면 재제작 또는 환불합니다.'),
 ('저작권', '심볼·워드마크·여섯 마음 캐릭터는 네다바웨이의 브랜드 자산입니다. 개인 사용은 자유, 재판매·재가공은 서면 동의가 필요합니다.'),
]

D = {
 'tee': dict(n='티셔츠', en='T-shirt', c='#3B82F6', photos=['goods-tee', 'goods-tee-back'],
  lead='등에 여섯 색의 심볼과 NEDABAHWAY, 앞은 비워 두었습니다. 캠프와 워크숍의 단체복.',
  spec=[('소재', '면 100%, 20수 싱글 (기준 사양)'), ('색상', '화이트 (아이보리 선택 가능)'), ('인쇄', '등판 DTF 전사, 심볼 가로 약 30cm'), ('핏', '유니섹스 세미오버'), ('구성', '티셔츠 1장, 개별 OPP 포장')],
  size=(['사이즈', '가슴단면', '총장', '어깨', '소매'], [['S', '52', '68', '47', '21'], ['M', '55', '71', '50', '22'], ['L', '58', '74', '53', '23'], ['XL', '61', '77', '56', '24'], ['2XL', '64', '79', '59', '25']], 'cm · 실측 ±1.5cm 오차'),
  order=[('최소 수량', '10장 (사이즈 혼합 가능)'), ('제작 기간', '입금 후 영업일 10~14일'), ('가격', '수량별 견적 (10 / 30 / 50 / 100장 단가 안내)'), ('옵션', '앞면 소형 심볼 추가, 색상 변경, 소매 문구')],
  care=['찬물 뒤집어 세탁, 건조기 사용 금지', '프린트 면에 직접 다림질 금지', '첫 세탁은 단독으로'],
  faq=[('사이즈를 어떻게 고르나요?', '평소 입는 티셔츠의 가슴단면을 재서 표와 비교하세요. 넉넉한 핏을 원하면 한 치수 위.'), ('한 장만 살 수 있나요?', '개인 1~2장은 시즌 공동 주문 때 모아서 제작합니다. 문의하면 다음 회차를 안내합니다.')]),
 'tote': dict(n='에코백', en='Tote bag', c='#FFC857', photos=['goods-tote'],
  lead='워크숍 자료와 4주 노트를 담아 가는 가방. 기관 프로그램 참여자에게 첫날 지급합니다.',
  spec=[('소재', '캔버스 12온스, 내추럴'), ('크기', '가로 38 × 세로 40 × 바닥 10cm'), ('손잡이', '길이 60cm(어깨 걸침), 폭 2.5cm'), ('인쇄', '전면 실크스크린 4도, 심볼+워드마크'), ('구성', '에코백 1개')],
  size=(['항목', '치수'], [['가로', '38cm'], ['세로', '40cm'], ['바닥 폭', '10cm'], ['손잡이', '60cm'], ['A4 수납', '가능 (노트북 13인치 가능)']], '실측 ±1cm 오차'),
  order=[('최소 수량', '20개'), ('제작 기간', '입금 후 영업일 10일'), ('가격', '수량별 견적 (20 / 50 / 100개)'), ('옵션', '안주머니 추가, 기관 로고 병기(뒷면)')],
  care=['손세탁 권장, 표백제 금지', '인쇄면 뒤집어 그늘 건조'],
  faq=[('기관 로고를 같이 넣을 수 있나요?', '뒷면 하단에 단색으로 병기합니다. 로고 파일(AI·SVG)을 보내 주세요.')]),
 'cap': dict(n='볼캡', en='Cap', c='#10B981', photos=['goods-cap'],
  lead='제주 바닷바람용. 앞면에 심볼 자수. 야외 캠프와 현장 진행에서 스태프·참여자 표시로 씁니다.',
  spec=[('소재', '면 트윌(워싱), 6패널'), ('색상', '딥 그린 (블랙·베이지 선택)'), ('장식', '앞면 심볼 자수 약 6cm, 뒷면 워드마크 자수'), ('조절', '메탈 버클 스트랩'), ('구성', '볼캡 1개')],
  size=(['항목', '치수'], [['둘레', '56~60cm (조절)'], ['챙 길이', '7cm'], ['크라운 높이', '11cm']], '프리 사이즈'),
  order=[('최소 수량', '20개'), ('제작 기간', '입금 후 영업일 14일'), ('가격', '수량별 견적'), ('옵션', '색상 변경, 옆면 문구 자수')],
  care=['물에 담그지 말고 부분 세탁', '형태 유지를 위해 눌러 보관하지 않기'],
  faq=[('아동용도 있나요?', '둘레 52~56cm 아동용은 30개 이상일 때 제작합니다.')]),
 'sticker': dict(n='스티커 팩', en='Sticker pack', c='#FF6B3D', photos=['goods-sticker'],
  lead='심볼, 워드마크, "Different People Bigger World", 별과 야자수와 JEJU. 진단 결과와 함께 나눠 주는 첫 굿즈.',
  spec=[('구성', '시트 1장에 9종 (심볼 2, 워드마크 1, 문장 1, 별·야자수·스마일 각 1, JEJU 2)'), ('시트 크기', 'A6 (105 × 148mm)'), ('개별 크기', '25 ~ 70mm, 칼선 제거'), ('재질', '방수 PET 무광 코팅'), ('내구', '텀블러·노트북 사용 가능, 세척 시 유지')],
  size=(['스티커', '크기'], [['심볼 대', '70 × 52mm'], ['심볼 소', '40 × 30mm'], ['워드마크', '65 × 18mm'], ['문장', '60 × 45mm'], ['별·야자수·스마일', '25 ~ 30mm'], ['JEJU 원형·타원', '35 × 22mm']], '기준 사양'),
  order=[('최소 수량', '50장'), ('제작 기간', '입금 후 영업일 7일'), ('가격', '수량별 견적 (50 / 100 / 300장)'), ('옵션', '마음 캐릭터 6종 시트 추가, 기관명 스티커')],
  care=['붙인 뒤 24시간 안에는 물 접촉 피하기'],
  faq=[('여섯 마음 캐릭터 스티커는요?', '캐릭터 6종 시트를 옵션으로 함께 제작합니다. 진단 후 "늘릴 마음" 하나를 골라 붙이는 용도입니다.')]),
 'keyring': dict(n='여섯 마음 키링', en='Mind keyrings', c='#F472B6', photos=['goods-keyring'],
  lead='여섯 마음의 모양을 그대로 딴 아크릴 키링. 진단에서 "이번 주 늘릴 마음" 하나를 골라 들고 다닙니다.',
  spec=[('재질', '아크릴 3mm 양면 인쇄, UV 코팅'), ('크기', '약 45 × 45mm (모양별 상이)'), ('고리', '니켈 도금 열쇠고리 + 체인'), ('종류', '탐험·만들기·연결·돕기·생각·즐기기 6종 + 심볼 태그'), ('구성', '낱개 또는 6종 세트')],
  size=(['마음', '크기(가로×세로)'], [['탐험', '44 × 48mm'], ['만들기', '46 × 44mm'], ['연결', '40 × 50mm'], ['돕기', '48 × 40mm'], ['생각', '44 × 50mm'], ['즐기기', '46 × 44mm'], ['심볼 태그', '30 × 55mm']], '기준 사양 ±2mm'),
  order=[('최소 수량', '낱개 30개 또는 세트 10개'), ('제작 기간', '입금 후 영업일 10일'), ('가격', '수량별 견적'), ('옵션', '뒷면에 이름·기관명 각인')],
  care=['아크릴은 긁힘에 약하니 열쇠와 분리 보관'],
  faq=[('한 마음만 대량으로 되나요?', '됩니다. 캠프에서 팀별로 마음 하나씩 나눌 때 많이 씁니다.')]),
 'sweat': dict(n='맨투맨', en='Sweatshirt', c='#8B5CF6', photos=['goods-sweat'],
  lead='가슴에 작은 검정 심볼과 워드마크만. 일상에서 티 나지 않게 입는 버전. 겨울 캠프와 리더 모임용.',
  spec=[('소재', '면 80% 폴리 20%, 기모 없는 특양면 (기모 선택)'), ('색상', '오트밀 (블랙·네이비 선택)'), ('인쇄', '가슴 좌측 실크스크린 1도, 심볼 5cm + 워드마크'), ('핏', '유니섹스 오버핏'), ('구성', '맨투맨 1장')],
  size=(['사이즈', '가슴단면', '총장', '어깨', '소매'], [['S', '55', '66', '52', '58'], ['M', '58', '69', '55', '60'], ['L', '61', '72', '58', '62'], ['XL', '64', '75', '61', '63']], 'cm · 실측 ±1.5cm 오차'),
  order=[('최소 수량', '10장'), ('제작 기간', '입금 후 영업일 14일'), ('가격', '수량별 견적'), ('옵션', '기모, 색상, 등판 큰 심볼')],
  care=['찬물 뒤집어 세탁, 건조기 금지', '프린트 면 다림질 금지'],
  faq=[('티셔츠와 같이 주문하면 할인되나요?', '합산 수량으로 단가를 냅니다. 같이 문의하세요.')]),
 'poster': dict(n='포스터 2종', en='Posters', c='#1D4ED8', photos=['goods-poster-black', 'goods-poster-sea'],
  lead='검정 바탕의 "Different People Bigger World"와 제주 바다 위의 "다른 사람들이 만들어내는, 더 넓은 세상". 교실·사무실·소그룹 공간의 첫 화면.',
  spec=[('종류', '블랙(타이포) / 제주(사진) 2종'), ('크기', 'A3 (297 × 420mm) / A2 (420 × 594mm)'), ('용지', '몽블랑 200g 무광 (블랙), 아트지 200g 유광 (제주)'), ('인쇄', '디지털 4도, 여백 없음'), ('구성', '포스터 1장, 지관통 포장')],
  size=(['규격', '크기', '권장 장소'], [['A3', '297 × 420mm', '교실 게시판, 사무실 파티션'], ['A2', '420 × 594mm', '로비, 강의실, 카페 벽']], 'ISO A 규격'),
  order=[('최소 수량', '5장 (종류·규격 혼합 가능)'), ('제작 기간', '입금 후 영업일 5일'), ('가격', '규격·수량별 견적'), ('옵션', '액자(우드 프레임), 6 MINDS 보드 포스터 추가')],
  care=['직사광선을 피해 걸기', '지관통에서 꺼낸 뒤 하루 펴 두기'],
  faq=[('6 MINDS 브랜드 보드 포스터도 되나요?', '됩니다. 캐릭터 6인이 든 가로형(A2·A1) 옵션으로 제작합니다.')]),
 'wallpaper': dict(n='폰 배경화면', en='Phone wallpaper', c='#3B82F6', photos=['goods-wallpaper'],
  lead='제주 바다와 브랜드 문장. 잠금화면에 두면 하루에 몇 번씩 "더 넓은 세상"을 봅니다. 진단을 마친 분께 무료로 드립니다.',
  spec=[('형식', 'PNG · JPG'), ('해상도', '1170 × 2532 (iPhone) / 1080 × 2400 (Android)'), ('종류', '제주 바다 문장 1종 + 여섯 마음 카드 12종'), ('가격', '무료'), ('받는 법', '요즘 나의 여섯 마음 진단 완료 후 결과 화면에서 저장')],
  size=(['기기', '해상도'], [['iPhone 15·14·13', '1170 × 2532'], ['iPhone Pro Max', '1290 × 2796'], ['갤럭시 S·A', '1080 × 2400'], ['공통 카드', '1080 × 1920']], '기기에 맞춰 잘려 보일 수 있음'),
  order=[('수량', '제한 없음'), ('제작 기간', '즉시'), ('가격', '무료'), ('사용 범위', '개인 사용 자유, 상업적 재배포 금지')],
  care=['저장 후 잠금화면에 설정하면 문장이 시계와 겹치지 않도록 위치를 조정하세요'],
  faq=[('진단 없이 받을 수 있나요?', '여섯 마음 카드 12장은 6 MINDS 페이지에서 바로 저장됩니다. 제주 바다 배경화면은 진단 결과 화면에서 드립니다.')]),
 'deck': dict(n='마음 카드 덱', en='Mind card deck', c='#10B981', photos=['goods-deck'],
  lead='마음 6 × (정의·켜짐·눌림·넘침·더 쓸 때·줄일 때) = 36장. 진단 없이도 카드를 고르는 것만으로 "요즘 나"를 말하게 됩니다.',
  spec=[('구성', '36장 + 사용 안내 카드 2장 + 케이스'), ('크기', '63 × 88mm (포커 사이즈)'), ('용지', '300g 아트지 양면 무광 코팅, 모서리 라운딩'), ('케이스', '종이 턱박스, 심볼 인쇄'), ('언어', '한국어 (영문 병기)')],
  size=(['항목', '치수'], [['카드', '63 × 88mm'], ['케이스', '66 × 92 × 22mm'], ['무게', '약 120g']], '기준 사양'),
  order=[('최소 수량', '10세트'), ('제작 기간', '입금 후 영업일 14일'), ('가격', '수량별 견적 (10 / 30 / 100세트)'), ('옵션', '기관명 인쇄, 진행 가이드북(16p) 추가')],
  care=['물기 피하기, 케이스에 넣어 보관'],
  faq=[('어떻게 쓰나요?', '1) 요즘 나를 설명하는 카드 3장 고르기 2) 짝과 서로 왜 골랐는지 말하기 3) "이번 주 한 가지" 카드 1장 가져가기. 진행 가이드가 케이스에 들어 있습니다.'), ('디지털 카드와 뭐가 다른가요?', '디지털 12장은 마음별 요약이고, 덱 36장은 상태(켜짐·눌림·넘침)와 행동을 낱장으로 나눠 고를 수 있습니다.')]),
 'note': dict(n='4주 기록 노트', en='4-week journal', c='#8B5CF6', photos=['goods-note'],
  lead='첫 주 진단 결과를 붙이고, 매주 "줄일 것 하나, 늘릴 것 하나"를 적고, 넷째 주 재진단과 비교합니다.',
  spec=[('크기', 'A5 (148 × 210mm)'), ('쪽수', '64쪽 (진단 기록 2 + 주간 기록 4×12 + 비교표 2 + 메모 8)'), ('용지', '내지 100g 미색 모조, 표지 300g 검정 + 심볼 박'), ('제본', '실제본 (180도 펼침)'), ('구성', '노트 1권, 마음 스티커 시트 1장')],
  size=(['항목', '치수'], [['판형', '148 × 210mm'], ['두께', '약 6mm'], ['무게', '약 150g']], '기준 사양'),
  order=[('최소 수량', '20권'), ('제작 기간', '입금 후 영업일 10일'), ('가격', '수량별 견적'), ('옵션', '표지 기관명 인쇄, 8주형(96쪽)')],
  care=['첫 쪽에 진단 결과 코드를 적어 두면 4주 뒤 비교가 쉽습니다'],
  faq=[('혼자 써도 되나요?', '됩니다. 첫 주와 넷째 주에 온라인 진단을 하고 코드를 적어 두면 결과 화면에서 자동 비교됩니다.')]),
 'kit': dict(n='워크숍 키트', en='Workshop kit', c='#1D4ED8', photos=['goods-kit'],
  lead='카드 덱 1 + 4주 노트 10권 + 포스터 1 + 스티커 팩 10 + 키링 10 + 리더 진행안. 프로그램을 도입하는 기관과 리더가 직접 진행하는 소그룹을 위한 한 상자.',
  spec=[('구성', '마음 카드 덱 1세트 · 4주 노트 10권 · A2 포스터 1장 · 스티커 팩 10장 · 여섯 마음 키링 10개 · 리더 진행안(16p) 1부 · 진단 QR 카드 10장'), ('대상', '6~10명 소그룹 1개 기준'), ('상자', '골판지 박스 350 × 250 × 120mm, 심볼 인쇄'), ('무게', '약 2.2kg')],
  size=(['품목', '수량', '규격'], [['카드 덱', '1', '63 × 88mm 36장'], ['4주 노트', '10', 'A5 64p'], ['포스터', '1', 'A2'], ['스티커 팩', '10', 'A6 시트'], ['키링', '10', '6종 혼합'], ['리더 진행안', '1', 'A4 16p']], '10명 기준 · 인원에 맞춰 조정'),
  order=[('최소 수량', '1박스'), ('제작 기간', '입금 후 영업일 14일'), ('가격', '박스당 견적 (프로그램과 묶으면 할인)'), ('옵션', '20명형, 기관명 인쇄, 네다바웨이 진행 1회 포함')],
  care=['리더 진행안대로 1주 진단 → 2·3주 실행 → 4주 재진단'],
  faq=[('네다바웨이가 직접 진행하지 않아도 되나요?', '리더 진행안으로 소그룹 리더가 진행할 수 있게 만들었습니다. 첫 회기만 네다바웨이가 함께하는 옵션도 있습니다.')]),
}
ORDER = ['tee', 'tote', 'cap', 'sticker', 'keyring', 'sweat', 'poster', 'wallpaper', 'deck', 'note', 'kit']

def table(cols, rows, note=''):
    th = ''.join(f'<th scope="col">{esc(c)}</th>' for c in cols)
    tr = ''.join('<tr>' + ''.join((f'<th scope="row">{esc(v)}</th>' if j == 0 else f'<td>{esc(v)}</td>') for j, v in enumerate(r)) + '</tr>' for r in rows)
    return f'<div class="gdd-tw"><table class="gdd-t"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>' + (f'<p class="gdd-note">{esc(note)}</p>' if note else '')

def kv(rows):
    return '<dl class="gdd-kv">' + ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in rows) + '</dl>'

def build(k):
    d = D[k]; url = f'{SITE}/goods/{k}/'
    title = f'{d["n"]} · 6 MINDS 굿즈 | 네다바웨이'
    desc = f'{d["n"]} 상세: 사양, 실측 사이즈, 주문 수량과 제작 기간, 관리와 교환·환불 안내. {d["lead"]}'
    photos_html = ''
    for i, ph in enumerate(d['photos']):
        attr = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        photos_html += f'<img src="/assets/brand/{ph}.jpg" alt="{esc(d["n"])} 제품 사진 {i+1}" {attr}>'
    jsonld = json.dumps({"@context": "https://schema.org", "@type": "Product", "name": d['n'], "description": d['lead'], "url": url,
                         "brand": {"@type": "Brand", "name": "NEDABAHWAY 6 MINDS"}, "image": [f'{SITE}/assets/brand/{ph}.jpg' for ph in d['photos']],
                         "offers": {"@type": "Offer", "availability": "https://schema.org/PreOrder", "priceCurrency": "KRW", "url": f'{SITE}/contact.html'}}, ensure_ascii=False)
    others = ''
    for o in ORDER:
        cur = ' aria-current="page"' if o == k else ''
        others += f'<a href="/goods/{o}/"{cur}>{esc(D[o]["n"])}</a>'
    subject = f'[굿즈 주문 문의] {d["n"]}'
    from urllib.parse import quote
    body = '품목: ' + d['n'] + '\n수량/사이즈: \n받는 곳(주소): \n연락처: \n단체·기관명(해당 시): \n희망 일정: \n옵션·요청사항: '
    mailto = f'mailto:{MAIL}?subject={quote(subject)}&body={quote(body)}'
    policy = kv(COMMON_POLICY)
    faq = ''.join(f'<details class="gdd-faq"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in d['faq'])
    care = ''.join(f'<li>{esc(x)}</li>' for x in d['care'])
    page = head(title, desc, url, 'goods', f'<link rel="stylesheet" href="/assets/goods.css">\n<script type="application/ld+json">{jsonld}</script>\n') + HEADER + f'''
<main id="main" class="gdd" style="--gc:{d['c']};">
  <nav class="gdd-switch" aria-label="굿즈 품목"><div class="wrap"><a href="/goods/" class="gdd-switch__all">&larr; 굿즈</a>{others}</div></nav>

  <section class="gdd-hero">
    <div class="wrap gdd-hero__in">
      <div class="gdd-gal">{photos_html}</div>
      <div class="gdd-info">
        <p class="gd-kicker"><span>Goods</span> {d['en']}</p>
        <h1 class="gdd-h1">{esc(d['n'])}<span class="gd-dot" aria-hidden="true"></span></h1>
        <p class="gdd-lead">{esc(d['lead'])}</p>
        {kv(d['order'])}
        <p class="gdd-cta"><a class="btn-dark" href="{mailto}">주문 문의 메일 쓰기</a><a class="btn-link" href="/contact.html">상담 신청 &#8599;</a></p>
        <p class="gdd-note">아래 사양은 기준 사양입니다. 제작처 확정 시 소재·치수가 조정될 수 있으며, 견적서에 최종 사양을 적습니다.</p>
      </div>
    </div>
  </section>

  <section class="gdd-sec">
    <div class="wrap gdd-two">
      <div><h2 class="gdd-h2">사양</h2>{kv(d['spec'])}</div>
      <div><h2 class="gdd-h2">실측 사이즈</h2>{table(*d['size'])}</div>
    </div>
  </section>

  <section class="gdd-sec gdd-sec--alt">
    <div class="wrap gdd-two">
      <div><h2 class="gdd-h2">관리 · 사용</h2><ul class="gdd-list">{care}</ul><h2 class="gdd-h2" style="margin-top:28px;">자주 묻는 질문</h2>{faq}</div>
      <div><h2 class="gdd-h2">주문 · 배송 · 교환</h2>{policy}</div>
    </div>
  </section>

  <section class="gdd-sec">
    <div class="wrap">
      <h2 class="gdd-h2">주문 양식</h2>
      <p class="gdd-lead" style="margin-top:8px;">아래 항목을 채워 메일로 보내 주시면 영업일 1일 안에 견적과 일정을 답합니다. 버튼을 누르면 메일 앱에 양식이 채워져 열립니다.</p>
      <ol class="gdd-form"><li>품목: <b>{esc(d['n'])}</b></li><li>수량 / 사이즈(해당 시)</li><li>받는 곳 주소</li><li>연락처</li><li>단체·기관명 (세금계산서 필요 시 사업자 정보)</li><li>희망 일정</li><li>옵션·요청사항</li></ol>
      <p class="gdd-cta"><a class="btn-dark" href="{mailto}">{esc(d['n'])} 주문 문의 메일 쓰기</a><a class="btn-link" href="mailto:{MAIL}">{MAIL}</a></p>
    </div>
  </section>
</main>
''' + FOOTER
    out = ROOT / 'goods' / k / 'index.html'; out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding='utf-8'); print('->', out.relative_to(ROOT))

for k in ORDER: build(k)
