/* CarDNA — Supabase connection.
   Only the project URL and the PUBLISHABLE key belong here. Both are designed to be public.
   Never put the secret key (sb_secret_…) or the database password in this file, or anywhere
   in this repository. If a task seems to need one, it belongs in a server function instead. */

window.CARDNA_SUPABASE = {
  url: "https://wcyhhufdxyepyneektou.supabase.co",

  /* Paste the publishable key between the quotes, then reload.
     Dashboard → Project Settings → API Keys → "Publishable key" (sb_publishable_…). */
  key: ""
};
