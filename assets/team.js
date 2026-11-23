/* F-19 — seats and invitations.
   Contract: invite({ email }) → { ok, invited } | { ok:false, error }.
   The plan's seat count is enforced in assets/auth.js (PLAN_LIMITS[plan].seats); the table
   and the invitation email are the missing half, so nothing is sent and nothing is stored. */
(function () {
  "use strict";

  function seatsLeft() {
    var a = window.CarDNAAuth;
    if (!a || typeof a.limitsNow !== "function") { return null; }
    var lim = a.limitsNow();
    if (!lim) { return null; }
    return lim.seats;                       /* 0 means unlimited */
  }

  window.CarDNATeam = {
    live: false,

    invite: function (args) {
      var email = String((args && args.email) || "").trim();
      if (email.indexOf("@") < 1 || email.indexOf(".") === -1) {
        return { ok: false, error: "Enter the address you want to invite." };
      }

      var seats = seatsLeft();
      var note = seats === 0
        ? "Your plan has no seat limit"
        : seats > 1
          ? "Your plan includes " + seats + " seats"
          : "Your plan is single-seat";

      return {
        ok: false,
        error: "preview",
        message: "Nothing was sent to " + email + ": " + note.toLowerCase() +
          ", but invitations need the seats table, which is not built yet."
      };
    },

    /* { ok, seats:[{ email, role, status }] } — the list the table will return. */
    seats: function () {
      return { ok: true, seats: [] };
    }
  };
})();
