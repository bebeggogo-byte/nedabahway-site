/* presentation-teams.js — teams + scoring criteria for the presentation judging event.
 *
 * 10 teams (6 members each). Each judge scores every team on 4 process criteria
 * (1..10 each). A team's score from one judge = sum of the 4 criteria (max 40).
 * Ranking is by the average of those totals across judges.
 *
 * Students score every team except their own; teachers (name required) score all.
 *
 * To rename teams or criteria, edit below — score.html and score-results.html use it.
 */
export const TEAMS = ['1조', '2조', '3조', '4조', '5조', '6조', '7조', '8조', '9조', '10조'];

export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

// key = DB column name; label = shown to judges. Order = display order.
export const CRITERIA = [
  { key: 's_problem', label: '문제 선정',      hint: '실제 문제를 잘 골랐는가' },
  { key: 's_status',  label: '현황·기대 정리', hint: '현황과 기대 상황을 잘 정리했는가' },
  { key: 's_idea',    label: '아이디어',        hint: '아이디어가 참신하고 타당한가' },
  { key: 's_plan',    label: '실행 계획',       hint: '실행 계획이 구체적인가' },
];

export const MAX_TOTAL = CRITERIA.length * MAX_SCORE; // 40
