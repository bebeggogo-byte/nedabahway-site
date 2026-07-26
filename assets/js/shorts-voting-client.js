/* shorts-voting-client.js — Supabase helpers for the shorts voting event
 *
 * Reuses the shared client (sb) and auth helpers from supabase-client.js.
 * Voter side needs only submitVote(); admin side uses fetchAllVotes()/subscribe/reset.
 */

import { sb } from '/assets/js/supabase-client.js';

const VOTER_KEY = 'shorts_voter_uuid';
const VOTED_KEY = 'shorts_voted';

// Stable per-device id (survives refresh); also the DB uniqueness key.
export function getVoterUuid() {
  let id = localStorage.getItem(VOTER_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID()
      : 'v-' + Date.now() + '-' + Math.random().toString(16).slice(2));
    localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}

export function hasVotedLocally() {
  return localStorage.getItem(VOTED_KEY) === '1';
}

function markVotedLocally() {
  localStorage.setItem(VOTED_KEY, '1');
}

/**
 * Submit a ballot. `choices` = array of school names (1..3). `voterSchool` optional.
 * Returns { ok:true } on success, { ok:false, duplicate:true } if this device
 * already voted (DB unique violation), or throws on other errors.
 */
export async function submitVote({ choices, voterSchool }) {
  const voter_uuid = getVoterUuid();
  const { error } = await sb.from('shorts_votes').insert({
    voter_uuid,
    voter_school: voterSchool || null,
    choices,
  });
  if (error) {
    // 23505 = unique_violation → 이미 이 기기로 투표함
    if (error.code === '23505' || /duplicate key|unique/i.test(error.message || '')) {
      markVotedLocally();
      return { ok: false, duplicate: true };
    }
    throw error;
  }
  markVotedLocally();
  return { ok: true };
}

// ---- Admin only (requires authenticated session) ----

export async function fetchAllVotes() {
  const { data, error } = await sb
    .from('shorts_votes')
    .select('id, voter_school, choices, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw error;
  return data || [];
}

export function subscribeVotes(onChange) {
  return sb
    .channel('shorts-votes-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shorts_votes' }, onChange)
    .subscribe();
}

export async function resetAllVotes() {
  // delete-all (RLS: authenticated only). neq on a never-matching id = "all rows".
  const { error } = await sb
    .from('shorts_votes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}
