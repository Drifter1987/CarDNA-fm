/* F-12 / F-14 / F-20 — checkout, the billing portal, overage and invoices.
   Never says a payment happened: every answer here is a shape, not a receipt.
   Going live: implement these against the processor, set `live` to true and flip the
   `payments`, `overage` and `invoices` flags in assets/preview.js. Views do not change. */
(function () {
  "use strict";

  function preview() {
    var out = { ok: false, error: "preview" };
    for (var i = 0; i < arguments.length; i += 1) {
      var extra = arguments[i];
      if (!extra) { continue; }
      for (var key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) { out[key] = extra[key]; }
      }
    }
    return out;
  }

  window.CarDNABilling = {
    live: false,

    /* Contract: { ok, url, error }. Live means a hosted checkout session comes back. */
    startCheckout: function (plan, interval) {
      return preview({ plan: plan || "pro", interval: interval || "month" });
    },

    /* { ok, url, error } — the processor's own page for cards and invoices. */
    portalUrl: function (plan) {
      return preview({ plan: plan || "pro" });
    },

    /* { ok, url, dueDate } — a real invoice, issued by the processor or by hand. */
    invoice: function (plan) {
      return preview({ plan: plan || "business" });
    },

    /* { ok, price, note } — the per-lookup price past a plan's European quota. */
    overagePrice: function (plan) {
      var prices = { pro: "€0.99", workshop: "€0.85", business: "€0.55" };
      var key = String(plan || "pro").toLowerCase();
      return {
        ok: false,
        error: "preview",
        price: prices[key] || prices.pro,
        note: "Overage is charged by the processor when it is connected; nothing is billed today."
      };
    }
  };
})();
