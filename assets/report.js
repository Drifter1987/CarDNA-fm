/* F-23 — the public shareable report.
   Contract: share({ vin }) → { ok, url }. The link reads /r/<vin> and is rendered from the
   cache, so a repeat view costs no decode. Privacy rule: the filed fields only — never the
   note, the garage label or the account. Until it exists, nothing is copied anywhere. */
(function () {
  "use strict";

  var VIN = /^[A-HJ-NPR-Z0-9]{17}$/;

  function clean(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
  }

  window.CarDNAReport = {
    live: false,

    share: function (args) {
      var vin = clean(args && args.vin);
      if (!vin) { return { ok: false, error: "Enter the VIN you want to share." }; }
      if (!VIN.test(vin)) {
        return { ok: false, error: "A VIN is 17 characters and never contains I, O or Q." };
      }

      return {
        ok: false,
        error: "preview",
        message: "Public reports are not live yet, so nothing was copied. The link will read " +
          "/r/" + vin + " and show the filed fields only."
      };
    }
  };
})();
