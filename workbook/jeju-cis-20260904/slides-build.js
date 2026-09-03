const pptxgen = require('pptxgenjs');
const p = new pptxgen();
p.layout = 'LAYOUT_WIDE';           // 13.3 x 7.5
p.author = 'JEJU CIS Workshop';
p.title = '성과결과물, 어떻게 만들 것인가';

const DARK='12312B', TEAL='2E7D6B', CRAB='C1502E', MUT='6B7B75',
      W='FFFFFF', TINT='EEF2F0', LINE='C9D4D0', INK='1A2622';
const F='Arial';
const M=0.72, CW=13.33-2*M;         // margin / content width

// ---- helpers (fresh objects every call) ----
function darkBg(s){ s.background={color:DARK}; }
function badge(s,txt,x,y,col){
  s.addShape(p.ShapeType.roundRect,{x,y,w:1.35,h:0.32,fill:{color:col},rectRadius:0.16,line:{color:col}});
  s.addText(txt,{x,y,w:1.35,h:0.32,isTextBox:true,margin:0,align:'center',valign:'middle',
    fontFace:F,fontSize:11,bold:true,color:W});
}
function num(s,n,x,y,col){
  s.addShape(p.ShapeType.ellipse,{x,y,w:0.42,h:0.42,fill:{color:col},line:{color:col}});
  s.addText(String(n),{x,y,w:0.42,h:0.42,isTextBox:true,margin:0,align:'center',valign:'middle',
    fontFace:F,fontSize:14,bold:true,color:W});
}
function card(s,x,y,w,h,fillCol){
  s.addShape(p.ShapeType.rect,{x,y,w,h,fill:{color:fillCol||TINT},line:{color:LINE,width:1}});
}

/* ================= 1. 표지 ================= */
let s=p.addSlide(); darkBg(s);
s.addText('제주대학교 시민과학대학  JEJU CIS   ·   2026. 09. 04',
  {x:M,y:1.15,w:CW,h:0.32,isTextBox:true,margin:0,fontFace:F,fontSize:13,color:'9FBDB2',charSpacing:2});
s.addText('12월에 손에 들고 나갈 것을\n오늘 정합니다',
  {x:M,y:1.75,w:CW,h:2.1,isTextBox:true,margin:0,fontFace:F,fontSize:46,bold:true,color:W,lineSpacing:56});
s.addShape(p.ShapeType.rect,{x:M,y:4.15,w:2.0,h:0.045,fill:{color:TEAL},line:{color:TEAL}});
s.addText('성과결과물, 어떻게 만들 것인가',
  {x:M,y:4.45,w:CW,h:0.42,isTextBox:true,margin:0,fontFace:F,fontSize:20,color:'BFD6CD'});
const meta=[['3팀','게 · 곶자왈 · 거문오름'],['90분','+ 식사 30분 코칭'],['D-90','12월 성과공유회까지']];
meta.forEach((m,i)=>{
  const x=M+i*3.15;
  s.addText(m[0],{x,y:5.35,w:2.9,h:0.55,isTextBox:true,margin:0,fontFace:F,fontSize:30,bold:true,color:TEAL});
  s.addText(m[1],{x,y:5.92,w:2.9,h:0.34,isTextBox:true,margin:0,fontFace:F,fontSize:12,color:'9FBDB2'});
});
s.addNotes('오늘은 제가 설명하는 시간이 아니라 여러분이 쓰는 시간입니다. 강사 발화 목표는 총 15분 이내. 워크지는 반드시 손으로 쓰게 할 것. 노트북을 열면 검색을 시작하고 작성이 멈춥니다.');

/* ================= 2. 열기 ================= */
s=p.addSlide(); s.background={color:W};
badge(s,'0 – 10분  열기',M,0.62,TEAL);
s.addText('질문 하나로 시작합니다',
  {x:M,y:1.12,w:CW,h:0.5,isTextBox:true,margin:0,fontFace:F,fontSize:19,color:MUT});
s.addText('12월 성과공유회 날,\n여러분 책상 위에 무엇이\n놓여 있으면 좋겠습니까?',
  {x:M,y:1.75,w:8.1,h:2.6,isTextBox:true,margin:0,fontFace:F,fontSize:38,bold:true,color:INK,lineSpacing:50});
card(s,9.15,1.75,3.45,2.6);
s.addText('말보다 손이 먼저',
  {x:9.45,y:2.02,w:2.85,h:0.38,isTextBox:true,margin:0,fontFace:F,fontSize:15,bold:true,color:TEAL});
s.addText([
  {text:'크기를 손으로 그려 보이게 한다',options:{bullet:true,breakLine:true}},
  {text:'한 사람씩 30초',options:{bullet:true,breakLine:true}},
  {text:'나온 말을 그대로 적는다',options:{bullet:true,breakLine:true}},
  {text:'교정하지 않는다',options:{bullet:true}}],
  {x:9.45,y:2.48,w:2.85,h:1.7,isTextBox:true,margin:0,fontFace:F,fontSize:13,color:INK,paraSpaceAfter:7});
card(s,M,4.65,CW,1.35,TINT);
s.addText('"지금 나온 것들 다 적어 놨습니다. 90분 뒤에 이 중 하나가 사양서로 바뀌어 있을 겁니다."',
  {x:M+0.35,y:4.95,w:CW-0.7,h:0.8,isTextBox:true,margin:0,fontFace:F,fontSize:17,italic:true,color:INK});
s.addNotes('손짓부터 시키고 그다음 한 사람씩 30초. 나온 단어를 화이트보드에 그대로 적고 절대 교정하지 않는다. 이 판서가 8번 슬라이드에서 다시 쓰인다.');

/* ================= 3. 게팀 실물 ================= */
s=p.addSlide(); s.background={color:W};
badge(s,'10 – 18분  흔들기 A',M,0.62,TEAL);
s.addText('먼저 간 팀의 자료를 펼칩니다',
  {x:M,y:1.1,w:CW,h:0.55,isTextBox:true,margin:0,fontFace:F,fontSize:32,bold:true,color:INK});
s.addText('표선 사계(四季) 사게(四蟹)  ·  제주 동부에서 직접 관찰한 게류 21종 현장 관찰 필드 가이드',
  {x:M,y:1.72,w:CW,h:0.36,isTextBox:true,margin:0,fontFace:F,fontSize:14,color:MUT});
const st=[['21','관찰 종수'],['7','상과'],['11','과'],['4','해양보호생물'],['9','조사 지점']];
st.forEach((v,i)=>{
  const x=M+i*2.42;
  card(s,x,2.28,2.2,1.32);
  s.addText(v[0],{x,y:2.45,w:2.2,h:0.72,isTextBox:true,margin:0,align:'center',fontFace:F,fontSize:38,bold:true,color:TEAL});
  s.addText(v[1],{x,y:3.16,w:2.2,h:0.32,isTextBox:true,margin:0,align:'center',fontFace:F,fontSize:12,color:MUT});
});
s.addText('게팀에게 던질 질문은 이 세 개뿐입니다',
  {x:M,y:3.92,w:CW,h:0.38,isTextBox:true,margin:0,fontFace:F,fontSize:16,bold:true,color:INK});
const qs=['처음에 무엇을 세기로 정하셨습니까?','중간에 바뀐 게 있습니까?','지금 다시 4월로 돌아간다면\n무엇을 먼저 하시겠습니까?'];
qs.forEach((q,i)=>{
  const x=M+i*4.04;
  card(s,x,4.4,3.8,1.15);
  num(s,i+1,x+0.28,4.62,TEAL);
  s.addText(q,{x:x+0.85,y:4.6,w:2.75,h:0.8,isTextBox:true,margin:0,fontFace:F,fontSize:13,color:INK,lineSpacing:17});
});
s.addText('중요한 건 21이라는 숫자가 아닙니다.  무엇을 셀지 정한 순간부터 기록이 쌓이기 시작했습니다.',
  {x:M,y:5.85,w:CW,h:0.4,isTextBox:true,margin:0,fontFace:F,fontSize:15,bold:true,color:TEAL});
s.addNotes('게팀에게 마이크를 넘기고 강사는 질문 세 개만 던진다. 모범 사례로 치켜세우지 말 것 — "먼저 간 팀"으로만 소개한다. 난이도 별점을 "전국적 희귀도가 아니라 표선에서 서식지를 찾아다닐 때의 현장 체감 난이도"로 스스로 재정의한 점, 카드마다 관찰자의 말 한 줄이 있는 점을 짚어준다.');

/* ================= 4. 빈 칸 공개 ================= */
s=p.addSlide(); darkBg(s);
badge(s,'18 – 24분  분기점',M,0.62,CRAB);
s.addText('그런데 한 장 열어 보십시오',
  {x:M,y:1.15,w:CW,h:0.5,isTextBox:true,margin:0,fontFace:F,fontSize:20,color:'9FBDB2'});
s.addShape(p.ShapeType.rect,{x:M,y:1.85,w:7.4,h:1.5,fill:{color:'1B4038'},line:{color:CRAB,width:2,dashType:'dash'}});
s.addText('[ 직접 촬영 사진 삽입 ]',
  {x:M,y:1.85,w:7.4,h:1.5,isTextBox:true,margin:0,align:'center',valign:'middle',
   fontFace:F,fontSize:30,bold:true,color:CRAB});
s.addText('사진 21장이\n전부 비어 있습니다',
  {x:8.5,y:1.85,w:4.1,h:1.5,isTextBox:true,margin:0,fontFace:F,fontSize:26,bold:true,color:W,lineSpacing:34});
const gaps=[['지도','지점 이름은 9곳,\n지도는 없음'],['조사 횟수','몇 번 나갔는지\n적혀 있지 않음'],['판형','인쇄물 형태가\n정해지지 않음']];
gaps.forEach((g,i)=>{
  const x=M+i*4.04;
  s.addShape(p.ShapeType.rect,{x,y:3.72,w:3.8,h:1.4,fill:{color:'1B4038'},line:{color:'2A5C51',width:1}});
  s.addText(g[0],{x:x+0.3,y:3.95,w:3.2,h:0.34,isTextBox:true,margin:0,fontFace:F,fontSize:15,bold:true,color:CRAB});
  s.addText(g[1],{x:x+0.3,y:4.32,w:3.2,h:0.7,isTextBox:true,margin:0,fontFace:F,fontSize:13,color:'BFD6CD',lineSpacing:17});
});
s.addText('가장 앞선 팀도 지금 비어 있습니다. 그런데 골격은 서 있습니다.',
  {x:M,y:5.5,w:CW,h:0.45,isTextBox:true,margin:0,fontFace:F,fontSize:22,bold:true,color:W});
s.addText('여러분이 오늘 만들 것은 내용이 아니라 칸입니다.',
  {x:M,y:6.0,w:CW,h:0.4,isTextBox:true,margin:0,fontFace:F,fontSize:16,color:'9FBDB2'});
s.addNotes('오늘의 분기점. 빈 칸을 반드시 공개할 것 — 이것이 곶자왈팀·거문오름팀의 시작 문턱을 낮추는 장치다. 두 팀이 "우리는 아무것도 없다"고 하면: "없는 게 아니라 흩어져 있는 겁니다. 사진첩 여시죠."');

/* ================= 5. 카드 양식 ================= */
s=p.addSlide(); s.background={color:W};
badge(s,'24 – 28분  공용 양식',M,0.62,TEAL);
s.addText('이 양식, 게 전용이 아닙니다',
  {x:M,y:1.1,w:CW,h:0.55,isTextBox:true,margin:0,fontFace:F,fontSize:32,bold:true,color:INK});
s.addText("'게'를 지우고 '식물'을 넣으면 곶자왈 카드, '지점'을 넣으면 거문오름 카드입니다",
  {x:M,y:1.72,w:CW,h:0.36,isTextBox:true,margin:0,fontFace:F,fontSize:14,color:MUT});
card(s,M,2.25,4.35,3.75,W);
s.addText('카드 1장의 고정 칸',
  {x:M+0.3,y:2.45,w:3.75,h:0.34,isTextBox:true,margin:0,fontFace:F,fontSize:14,bold:true,color:TEAL});
const rows=['대상 이름 / 학명','난이도 ★☆☆☆☆  ·  보호종','서식지','우리 지역에서는','특징 · 구별법','행동 · 변화','시기 / 조건 / 크기','사진','관찰자의 말 한 줄','날짜 · 장소  /  출처'];
rows.forEach((r,i)=>{
  const y=2.85+i*0.30;
  s.addText(r,{x:M+0.3,y,w:3.75,h:0.28,isTextBox:true,margin:0,fontFace:F,fontSize:11.5,
    color:(i===8?CRAB:INK),bold:(i===8)});
  s.addShape(p.ShapeType.rect,{x:M+0.3,y:y+0.27,w:3.75,h:0.012,fill:{color:LINE},line:{color:LINE}});
});
const map=[['칸','게팀 (실제)','곶자왈팀','거문오름팀'],
 ['대상','게 1종','식물 1종 / 지형','조사 지점 · 구간'],
 ['분류','상과 · 과 · 속','과 · 속 · 종','지질 단위 / 식생'],
 ['서식지','암반 조간대 · 기수역','용암 지대 · 숨골','사면 방위 · 고도'],
 ['우리 지역','"표선에서"','"○○곶자왈에서"','"거문오름 ○구간"'],
 ['구별법','갑각 · 이 개수','잎 · 착생 위치','노두 · 식생 경계'],
 ['조건','물때 · 간조','계절 · 습도','탐방 시간 · 예약']];
const cx=5.45, cwid=[1.2,2.1,1.95,1.9];
map.forEach((r,ri)=>{
  const y=2.25+ri*0.52;
  let x=cx;
  r.forEach((cell,ci)=>{
    s.addShape(p.ShapeType.rect,{x,y,w:cwid[ci],h:0.52,
      fill:{color:ri===0?TEAL:(ri%2?W:TINT)},line:{color:LINE,width:1}});
    s.addText(cell,{x:x+0.09,y,w:cwid[ci]-0.18,h:0.52,isTextBox:true,margin:0,valign:'middle',
      fontFace:F,fontSize:10.5,bold:ri===0||ci===0,color:ri===0?W:INK});
    x+=cwid[ci];
  });
});
s.addText('모든 카드가 같은 칸을 가지면, 빠진 칸이 눈에 보입니다.',
  {x:M,y:6.2,w:CW,h:0.4,isTextBox:true,margin:0,fontFace:F,fontSize:15,bold:true,color:TEAL});
s.addNotes('이 양식을 A3로 확대 인쇄해 테이블 중앙에 고정해 둘 것. 오늘 활동의 기준점이다. 관찰자의 말 한 줄 칸(붉은색)은 절대 비우지 말라고 강조한다 — 전문 도감에는 없는, 시민과학 결과물에만 있는 칸이다.');

/* ================= 6. 피벗 + 8대 유형 ================= */
s=p.addSlide(); s.background={color:W};
badge(s,'28 – 32분  피벗',M,0.62,TEAL);
s.addText('결과물은 조사의 끝이 아니라,\n조사의 설계도입니다',
  {x:M,y:1.1,w:7.5,h:1.5,isTextBox:true,margin:0,fontFace:F,fontSize:34,bold:true,color:INK,lineSpacing:44});
card(s,8.5,1.15,4.1,1.45,TINT);
s.addText('데이터가 결과물을 만드는 게 아니라,\n결과물이 데이터를 부릅니다.',
  {x:8.8,y:1.42,w:3.55,h:0.95,isTextBox:true,margin:0,fontFace:F,fontSize:14,italic:true,color:INK,lineSpacing:20});
s.addText('오늘 고를 것은 하나입니다.  단, 12월 그날 손에 들고 나갈 수 있어야 합니다 — 유형(有形)의 결과물',
  {x:M,y:2.82,w:CW,h:0.38,isTextBox:true,margin:0,fontFace:F,fontSize:15,bold:true,color:CRAB});
const types=[['①','필드가이드 소책자','A5 제본'],['②','학술 포스터','A1 1장'],
 ['③','분포 지도','대형 인쇄'],['④','조사 보고서','제본'],
 ['⑤','데이터셋 + 명세서','인쇄 + QR'],['⑥','정책 제안서','제본'],
 ['⑦','전시 패널','폼보드 3장'],['⑧','현장 접이식 카드','A4 4단 접지']];
types.forEach((t,i)=>{
  const col=i%4, row=Math.floor(i/4);
  const x=M+col*3.03, y=3.4+row*1.32;
  card(s,x,y,2.80,1.15);
  s.addText(t[0],{x:x+0.18,y:y+0.14,w:0.4,h:0.32,isTextBox:true,margin:0,fontFace:F,fontSize:15,bold:true,color:TEAL});
  s.addText(t[1],{x:x+0.6,y:y+0.14,w:2.05,h:0.34,isTextBox:true,margin:0,fontFace:F,fontSize:13.5,bold:true,color:INK});
  s.addText(t[2],{x:x+0.6,y:y+0.55,w:2.05,h:0.3,isTextBox:true,margin:0,fontFace:F,fontSize:11.5,color:MUT});
});
s.addText('판형을 정하는 순간, 사진 몇 장·지도 몇 개·카드 몇 장이 자동으로 정해집니다.',
  {x:M,y:6.28,w:CW,h:0.4,isTextBox:true,margin:0,fontFace:F,fontSize:14,color:MUT});
s.addNotes('4월부터 다섯 달이 지났고 남은 건 석 달. 조사를 다 하고 결과물을 만들면 12월에 데이터는 있는데 형태가 없다. 순서를 뒤집으면 남은 3개월에 무엇을 조사할지가 자동으로 정해진다. 게팀 자료도 지금은 슬라이드이므로, 게팀의 오늘 숙제는 판형을 정하는 것.');

/* ================= 7. 활동 투트랙 ================= */
s=p.addSlide(); s.background={color:W};
badge(s,'32 – 68분  활동',M,0.62,TEAL);
s.addText('워크지를 펴십시오 — 시작점이 다릅니다',
  {x:M,y:1.1,w:CW,h:0.55,isTextBox:true,margin:0,fontFace:F,fontSize:32,bold:true,color:INK});
const tracks=[
 {t:'트랙 A',who:'게팀',c:TEAL,start:'S1부터 시작',
  st:'아카이빙 완료 · 36쪽 초안 보유',
  task:'아이디어 → 결정',
  items:['12월 결과물의 판형·부수 확정','사진 21장 확보분과 미확보분 구분','지도 1장 담당자와 마감일'],
  warn:'다 됐다고 느껴도 빈 칸이 있습니다'},
 {t:'트랙 B',who:'곶자왈팀 · 거문오름팀',c:CRAB,start:'S0 재고조사부터 시작',
  st:'아카이빙 없음 · 기록이 흩어진 상태',
  task:'정리 → 아이디어',
  items:['휴대폰 사진첩 4월 이후 스크롤','팀 단톡방 사진·파일 탭','현장 가방 속 수첩'],
  warn:'없는 게 아니라 흩어져 있는 겁니다'}];
tracks.forEach((tr,i)=>{
  const x=M+i*6.14;
  card(s,x,1.8,5.85,4.15,W);
  s.addShape(p.ShapeType.roundRect,{x:x+0.3,y:2.05,w:1.15,h:0.34,fill:{color:tr.c},line:{color:tr.c},rectRadius:0.17});
  s.addText(tr.t,{x:x+0.3,y:2.05,w:1.15,h:0.34,isTextBox:true,margin:0,align:'center',valign:'middle',
    fontFace:F,fontSize:12,bold:true,color:W});
  s.addText(tr.who,{x:x+1.6,y:2.02,w:3.75,h:0.4,isTextBox:true,margin:0,fontFace:F,fontSize:17,bold:true,color:INK});
  s.addText(tr.st,{x:x+0.3,y:2.5,w:5.25,h:0.32,isTextBox:true,margin:0,fontFace:F,fontSize:12,color:MUT});
  s.addText(tr.task,{x:x+0.3,y:2.88,w:5.25,h:0.44,isTextBox:true,margin:0,fontFace:F,fontSize:20,bold:true,color:tr.c});
  s.addText(tr.start,{x:x+0.3,y:3.36,w:5.25,h:0.34,isTextBox:true,margin:0,fontFace:F,fontSize:14,bold:true,color:INK});
  s.addText(tr.items.map((it,j)=>({text:it,options:{bullet:true,breakLine:j<tr.items.length-1}})),
    {x:x+0.3,y:3.8,w:5.25,h:1.2,isTextBox:true,margin:0,fontFace:F,fontSize:12.5,color:INK,paraSpaceAfter:6});
  card(s,x+0.3,5.15,5.25,0.6,TINT);
  s.addText(tr.warn,{x:x+0.5,y:5.15,w:4.9,h:0.6,isTextBox:true,margin:0,valign:'middle',
    fontFace:F,fontSize:12.5,bold:true,italic:true,color:tr.c});
});
s.addText('S0 재고조사   →   S1 장면   →   S2 한 문장 질문   →   S3 유형 선택   →   S4 사양서   →   S5 백캐스팅   →   S6 3분 발표',
  {x:M,y:6.22,w:CW,h:0.4,isTextBox:true,margin:0,align:'center',fontFace:F,fontSize:12.5,color:MUT});
s.addNotes('이 구간 동안 강사는 침묵하고 순회만 한다. 막힌 사람에게만 질문 하나를 던지고 답은 주지 않는다. S0 막힘: "4월 이후 휴대폰으로 찍은 사진이 몇 장쯤 됩니까?" S2 막힘: "그래서 뭐가 궁금하셨던 겁니까, 처음에요." S5 막힘: "12월 며칠입니까? 거기서 한 달씩 거꾸로 세어 보시죠." 게팀이 일찍 끝나면 지도 초안을 그리게 한다.');

/* ================= 8. 닫기 ================= */
s=p.addSlide(); darkBg(s);
badge(s,'83 – 90분  닫기',M,0.62,TEAL);
s.addText('마지막 질문입니다',
  {x:M,y:1.3,w:CW,h:0.45,isTextBox:true,margin:0,fontFace:F,fontSize:19,color:'9FBDB2'});
s.addText('이 결과물이 없으면,\n누가 아쉬워집니까?',
  {x:M,y:1.9,w:8.6,h:1.9,isTextBox:true,margin:0,fontFace:F,fontSize:42,bold:true,color:W,lineSpacing:54});
s.addText('나 말고요.  나 말고 누구인지를 쓰십시오.',
  {x:M,y:3.85,w:8.6,h:0.42,isTextBox:true,margin:0,fontFace:F,fontSize:18,color:CRAB});
s.addShape(p.ShapeType.rect,{x:M,y:4.6,w:CW,h:0.03,fill:{color:'2A5C51'},line:{color:'2A5C51'}});
s.addText('결과물은 조사의 끝이 아니라, 조사의 설계도다',
  {x:M,y:4.9,w:8.6,h:0.5,isTextBox:true,margin:0,fontFace:F,fontSize:24,bold:true,color:TEAL});
s.addText('오늘 가져가실 문장은 이 하나입니다.',
  {x:M,y:5.45,w:8.6,h:0.36,isTextBox:true,margin:0,fontFace:F,fontSize:14,color:'9FBDB2'});
s.addShape(p.ShapeType.rect,{x:9.7,y:4.85,w:2.9,h:1.35,fill:{color:'1B4038'},line:{color:'2A5C51',width:1}});
s.addText('약 90일',{x:9.7,y:5.0,w:2.9,h:0.6,isTextBox:true,margin:0,align:'center',fontFace:F,fontSize:30,bold:true,color:W});
s.addText('12월 성과공유회까지',{x:9.7,y:5.62,w:2.9,h:0.32,isTextBox:true,margin:0,align:'center',fontFace:F,fontSize:12,color:'9FBDB2'});
s.addText('다음 마일스톤 날짜만 지금 확정하고 마칩니다.',
  {x:M,y:6.45,w:CW,h:0.36,isTextBox:true,margin:0,fontFace:F,fontSize:13,color:'7FA396'});
s.addNotes('답은 말로 받지 않고 워크지 맨 아래에 쓰게 한다. 그리고 팀별 다음 마일스톤 날짜를 확정하고 끝낸다. 식사 30분 동안 팀당 10분씩 순회 — 게팀은 판형 확정, 곶자왈팀은 기록의 물리적 위치 확인, 거문오름팀은 탐방 예약제 제약 확인(세계자연유산센터 전화, 화요일 탐방 불가).');

p.writeFile({fileName:'/tmp/claude-0/-home-user-nedabahway-site/1c72292e-0e1d-5dd0-a430-c09830c398d0/scratchpad/deck/jeju-cis-workshop.pptx'})
 .then(f=>console.log('OK:',f));
