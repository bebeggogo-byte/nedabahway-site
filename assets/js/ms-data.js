/* ms-data.js — 중등부(전도학생회장단) 1차/2차 데이터
 *
 * 학교 소개 투표 + 발표 점수 공용. round = 'm1'(1차) | 'm2'(2차).
 * schools: {name, count(=참가 인원)}, teams: 발표 조 목록.
 * (엑셀 로스터에서 학교명/인원/조 배정만 집계 — 개인정보 미포함)
 */
export const ROUNDS = {
  m1: {
    key: 'm1', label: '1차',
    schools: [
      { name: '고산중학교', count: 2 },
      { name: '귀일중학교', count: 3 },
      { name: '노형중학교', count: 3 },
      { name: '대정중학교', count: 3 },
      { name: '무릉중학교', count: 2 },
      { name: '신엄중학교', count: 3 },
      { name: '신창중학교', count: 3 },
      { name: '애월중학교', count: 3 },
      { name: '저청중학교', count: 2 },
      { name: '제주대학교사범대학부설중학교', count: 3 },
      { name: '제주동여자중학교', count: 3 },
      { name: '제주서중학교', count: 3 },
      { name: '제주여자중학교', count: 2 },
      { name: '제주제일중학교', count: 3 },
      { name: '제주중앙여자중학교', count: 3 },
      { name: '제주중앙중학교', count: 3 },
      { name: '추자중학교', count: 2 },
      { name: '한라중학교', count: 3 },
      { name: '한림여자중학교', count: 3 },
      { name: '한림중학교', count: 3 },
    ],
    teams: ['1조', '2조', '3조', '4조', '5조', '6조', '7조', '8조', '9조'],
  },
  m2: {
    key: 'm2', label: '2차',
    schools: [
      { name: '김녕중학교', count: 3 },
      { name: '남원중학교', count: 3 },
      { name: '서귀포대신중학교', count: 3 },
      { name: '서귀포여자중학교', count: 3 },
      { name: '서귀포중학교', count: 3 },
      { name: '서귀포중앙여자중학교', count: 3 },
      { name: '세화중학교', count: 2 },
      { name: '신산중학교', count: 2 },
      { name: '오름중학교', count: 2 },
      { name: '오현중학교', count: 3 },
      { name: '우도중학교', count: 1 },
      { name: '위미중학교', count: 2 },
      { name: '제주동중학교', count: 3 },
      { name: '조천중학교', count: 3 },
      { name: '중문중학교', count: 3 },
      { name: '탐라중학교', count: 2 },
      { name: '표선중학교', count: 2 },
      { name: '함덕중학교', count: 2 },
    ],
    teams: ['1조', '2조', '3조', '4조', '5조', '6조', '7조'],
  },
};

export function getRound() {
  const r = new URLSearchParams(location.search).get('r');
  return (r === 'm2') ? ROUNDS.m2 : ROUNDS.m1; // default 1차
}

export const MAX_PICKS = 3;
export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

export const CRITERIA = [
  { key: 's_problem',  label: '문제 선정',      hint: '실제 문제를 잘 골랐는가' },
  { key: 's_status',   label: '현황·기대 정리', hint: '현황과 기대 상황을 잘 정리했는가' },
  { key: 's_idea',     label: '아이디어',        hint: '아이디어가 참신하고 타당한가' },
  { key: 's_plan',     label: '실행 계획',       hint: '실행 계획이 구체적인가' },
  { key: 's_present',  label: '발표',            hint: '발표를 명확하고 설득력 있게 했는가' },
  { key: 's_attitude', label: '발표 태도',       hint: '태도가 진지하고 협력적인가' },
];
export const MAX_TOTAL = CRITERIA.length * MAX_SCORE; // 60
