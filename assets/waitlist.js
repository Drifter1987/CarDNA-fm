/* F-22 — the waitlist / pilot capture.
   Contract: join({ email, interest }) → { ok, message } | { ok:false, error }.
   Live means a `waitlist` table (insert-only for anon and authenticated) and this function
   posting to it. Until then nothing is stored anywhere, and the message says so. */
(function () {
  "use strict";

  var CONTACT = "hello@gmottomotive.com";

  window.CarDNAWaitlist = {
    live: false,

    join: function (args) {
      var input = args || {};
      var email = String(input.email || "").trim();
      var interest = String(input.interest || "").trim() || "pro";

      if (email.indexOf("@") < 1 || email.indexOf(".") === -1 || email.length > 180) {
        return { ok: false, error: "Enter an address we can reply to." };
      }

      return {
        ok: false,
        error: "preview",
        message: "Nothing was stored — the list is not connected yet. Write to " + CONTACT +
          " mentioning \u201c" + interest + "\u201d and we will add you by hand."
      };
    }
  };
})();
