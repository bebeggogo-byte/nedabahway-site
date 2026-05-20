/* supabase-client.js — single entry point for Supabase access
 *
 * Usage: <script type="module" src="/assets/js/supabase-client.js"></script>
 *        then import { sb } from '/assets/js/supabase-client.js'
 *
 * Configuration: edit assets/js/supabase-config.js (gitignored) OR set
 * window.__SUPABASE_URL__ / window.__SUPABASE_ANON__ before this script loads.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL  = window.__SUPABASE_URL__  || 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON = window.__SUPABASE_ANON__ || 'YOUR-ANON-PUBLIC-KEY';

if (SUPABASE_URL.includes('YOUR-PROJECT')) {
  console.warn('[supabase] config missing — set window.__SUPABASE_URL__ and window.__SUPABASE_ANON__');
}

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Convenience helpers
export async function listSessions({ limit = 60 } = {}) {
  const { data, error } = await sb
    .from('sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function createSession({ title, location, tags }) {
  const { data, error } = await sb
    .from('sessions')
    .insert({ title, location, tags: tags || [], started_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function endSession({ id, photoFile }) {
  let photo_url = null;
  if (photoFile) {
    const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
    const key = `${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage
      .from('session-photos')
      .upload(key, photoFile, { upsert: false, contentType: photoFile.type });
    if (upErr) throw upErr;
    const { data: pub } = sb.storage.from('session-photos').getPublicUrl(key);
    photo_url = pub.publicUrl;
  }
  const { data, error } = await sb
    .from('sessions')
    .update({ ended_at: new Date().toISOString(), photo_url })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitTestimonial({ session_id, name, role, content }) {
  const { data, error } = await sb
    .from('testimonials')
    .insert({ session_id, name, role, content, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listApprovedTestimonials({ limit = 30 } = {}) {
  const { data, error } = await sb
    .from('testimonials')
    .select('id, name, role, content, created_at, approved_at, session_id')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function listPendingTestimonials() {
  const { data, error } = await sb
    .from('testimonials')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approveTestimonial(id) {
  const { data, error } = await sb
    .from('testimonials')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rejectTestimonial(id) {
  const { error } = await sb
    .from('testimonials')
    .update({ status: 'rejected' })
    .eq('id', id);
  if (error) throw error;
}

export function subscribeTestimonialChanges(onChange) {
  return sb
    .channel('testimonials-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonials' }, onChange)
    .subscribe();
}

export async function signInWithPassword(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await sb.auth.signOut();
}

export async function currentUser() {
  const { data } = await sb.auth.getUser();
  return data.user;
}
