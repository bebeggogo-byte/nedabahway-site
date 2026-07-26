/* shorts-schools.js — canonical school list for the shorts voting event
 *
 * Single source of truth shared by vote.html (ballot) and vote-admin.html (tally).
 * `count` = number of delegates who attended from that school (for turnout tracking).
 * Total delegates = 64 across 25 schools.
 *
 * Loaded as a module: import { SCHOOLS, SCHOOL_NAMES, TOTAL_DELEGATES } from '/assets/js/shorts-schools.js'
 */

export const SCHOOLS = [
  { name: '남녕고등학교', count: 3 },
  { name: '남주고등학교', count: 2 },
  { name: '서귀포산업과학고등학교', count: 3 },
  { name: '성산고등학교', count: 2 },
  { name: '세화고등학교', count: 3 },
  { name: '신성여자고등학교', count: 2 },
  { name: '애월고등학교', count: 3 },
  { name: '영주고등학교', count: 3 },
  { name: '제주과학고등학교', count: 1 },
  { name: '제주대학교사범대학부설고등학교', count: 3 },
  { name: '제주여자고등학교', count: 3 },
  { name: '제주여자상업고등학교', count: 3 },
  { name: '제주제일고등학교', count: 1 },
  { name: '제주중앙고등학교', count: 3 },
  { name: '제주중앙여자고등학교', count: 3 },
  { name: '중문고등학교', count: 3 },
  { name: '한국뷰티고등학교', count: 3 },
  { name: '한림항공우주고등학교', count: 1 },
  { name: '삼성여자고등학교', count: 3 },
  { name: '한림고등학교', count: 3 },
  { name: '대기고등학교', count: 3 },
  { name: '대정여자고등학교', count: 2 },
  { name: '서귀포고등학교', count: 2 },
  { name: '함덕고등학교', count: 3 },
  { name: '서귀포여자고등학교', count: 3 },
];

export const SCHOOL_NAMES = SCHOOLS.map((s) => s.name);

export const TOTAL_DELEGATES = SCHOOLS.reduce((sum, s) => sum + s.count, 0); // 64

// Ballot rule: each voter may pick up to MAX_PICKS best teams (min 1).
export const MAX_PICKS = 3;
