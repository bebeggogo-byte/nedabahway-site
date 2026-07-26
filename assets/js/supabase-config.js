/* supabase-config.js — live Supabase connection for the static site.
 *
 * Loaded BEFORE supabase-client.js; sets globals on window.
 * The publishable key is a PUBLIC key by design (protected by Row Level Security),
 * safe to ship to the browser. Never put the secret (sb_secret_...) key here.
 */
window.__SUPABASE_URL__  = 'https://wdxzndgbowigicbjsnbi.supabase.co';
window.__SUPABASE_ANON__ = 'sb_publishable_iwPKTsppsHr_ukhVFsooTw_hdE2vEEI';
