/* ============================================================
   Where the app gets its data

   apiBase empty -> everything runs locally, exactly as it has been.
   apiBase set   -> accounts, balances and payments come from the API.

   The price feed and contract settlement stay local either way: the
   backend does not own them yet. That is worth knowing rather than
   assuming — while the browser decides outcomes, a balance is not
   a claim anyone should rely on.
   ============================================================ */
window.NEXAS_CONFIG = {
  apiBase: '',

  /* Supabase project. The publishable key is bound by row level
     security and is safe to ship in a browser. The service-role key
     must never appear in a file like this. */
  supabaseUrl: 'https://avzuiwqkqyhsjanjwtrx.supabase.co',
  supabaseKey: 'sb_publishable_aGZeOzRTqbvY2P6NgEVliQ_d_rh_pvn'
};

/* api.js reads this. Kept as a separate global so a host can override
   it with one inline script tag without editing config.js. */
window.NEXAS_API = window.NEXAS_API || window.NEXAS_CONFIG.apiBase;
