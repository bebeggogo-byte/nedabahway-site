/* presentation-teams.js — team list + score scale for the presentation judging event.
 *
 * 10 teams (6 members each). Each judge scores every team MIN..MAX except (for
 * students) their own team. Ranking is by average score.
 *
 * To rename teams, edit TEAMS below — score.html and score-results.html both use it.
 */
export const TEAMS = ['1조', '2조', '3조', '4조', '5조', '6조', '7조', '8조', '9조', '10조'];
export const MIN_SCORE = 1;
export const MAX_SCORE = 10;
