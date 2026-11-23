/* F-16 — recalls and complaints.
   Contract: recalls({ vin }) → { ok, recalls:[{ campaign, component, summary, remedy, date }] }.
   The data is free public NHTSA and the call itself is the next thing switched on, so this
   answers with the preview shape and the honest reason until then. */
(function () {
  "use strict";

  var VIN = /^[A-HJ-NPR-Z0-9]{17}$/;

  function clean(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
  }

  window.CarDNAVehicle = {
    live: false,

    recalls: function (args) {
      var vin = clean(args && args.vin);
      if (!vin) { return { ok: false, error: "Enter the VIN you want to check." }; }
      if (!VIN.test(vin)) {
        return { ok: false, error: "A VIN is 17 characters and never contains I, O or Q." };
      }

      return {
        ok: false,
        error: "preview",
        message: "Recalls are free public data (NHTSA) and the lookup is the next thing we switch " +
          "on. Nothing was requested for " + vin + ", so nothing is shown yet."
      };
    }
  };
})();
