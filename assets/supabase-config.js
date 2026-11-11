/* CarDNA — Supabase connection.

   The URL and the PUBLISHABLE key only. Both are public by design: this key ships to every
   visitor's browser, and Supabase labels it "safe to share publicly". It grants nothing on its
   own — row-level security in the database decides what any request may read or write.

   NEVER put the secret key (sb_secret_…), the legacy service_role key, or the Postgres password
   in this file or anywhere in this public repository. If something seems to need one, it belongs
   in a server function's environment variables instead.

   Rotate the publishable key in the dashboard any time; paste the new one here and redeploy. */

window.CARDNA_SUPABASE = {
  url: "https://wcyhhufdxyepyneektou.supabase.co",
  key: "sb_publishable_CWmv9thGVTy8JfiTTymSAQ_-v-NW3bY"
};
