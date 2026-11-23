/* F-22 — the waitlist / pilot capture. Wired to Supabase; the table is docs/supabase-waitlist.sql.
   Contract: join({ email, interest }) → { ok, message } | { ok:false, error }.
   Until the table exists the insert fails cleanly and the panel says nothing was stored, so the
   copy is the same either way and never claims a save that did not happen. */
(function () {
  "use strict";

  var CONTACT = "hello@gmottomotive.com";
  var MAX = 180;

  function config() {
    return window.CARDNA_SUPABASE || {};
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function preview(reason) {
    return { ok: false, error: "preview", message: reason };
  }

  window.CarDNAWaitlist = {
    live: true,

    join: function (args) {
      var input = args || {};
      var email = clean(input.email);
      var interest = clean(input.interest) || "pro";

      if (email.indexOf("@") < 1 || email.indexOf(".") === -1 || email.length > MAX) {
        return { ok: false, error: "Enter an address we can reply to." };
      }

      var cfg = config();
      if (!cfg.url || !cfg.key) {
        return preview("The list is not configured on this deployment, so nothing was stored. " +
          "Write to " + CONTACT + " and we will add you by hand.");
      }

      var body = {
        email: email.toLowerCase(),
        interest: interest.slice(0, 40),
        source: String(window.location.pathname || "/").slice(0, 120)
      };

      return fetch(String(cfg.url).replace(/\/+$/, "") + "/rest/v1/waitlist", {
        method: "POST",
        headers: {
          apikey: cfg.key,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(body)
      }).then(function (response) {
        if (response.ok) {
          return {
            ok: true,
            message: "You are on the list for " + interest + ". We will write to " + body.email +
              " when that part is switched on — once, and you can ask us to remove it any time."
          };
        }

        if (response.status === 409) {
          return {
            ok: true,
            message: body.email + " is already on the list for " + interest + "."
          };
        }

        return response.text().then(function (text) {
          var missing = response.status === 404 || /42P01|does not exist|schema cache/i.test(text || "");
          if (missing) {
            return preview("The list is not connected yet, so nothing was stored. Write to " +
              CONTACT + " and we will add you by hand.");
          }
          return {
            ok: false,
            error: "The list refused the request (" + response.status + "). Nothing was stored."
          };
        });
      }).catch(function () {
        return {
          ok: false,
          error: "The list could not be reached. Nothing was stored — try again in a moment."
        };
      });
    }
  };
})();
