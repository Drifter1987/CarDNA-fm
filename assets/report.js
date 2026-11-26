/* F-23 — the public shareable report, the link side.
   Contract: share({ vin }) → { ok, message, html } or { ok:false, error }.
   GitHub Pages cannot serve /r/<vin>, so the report is report.html?vin=<vin>, rendered from the
   decode cache by assets/report-view.js. Privacy: the link carries only the VIN — never a note,
   a garage label or an account. Nothing is stored by making a link. */
(function () {
  "use strict";

  var VIN = /^[A-HJ-NPR-Z0-9]{17}$/;

  function clean(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
  }

  function esc(value) {
    return String(value).replace(/[&<>"]/g, function (chr) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[chr];
    });
  }

  /* The folder this page lives in, so the link works from the root and from /tools/. */
  function folder() {
    return window.location.href.split("#")[0].split("?")[0].replace(/[^\/]*$/, "");
  }

  /* The answer the panel shows: the link in words, and a control that copies it again. The copy
     button carries its own data-copy, so app.js's delegated handler picks it up. */
  function linkHtml(vin, url) {
    return '<p class="recall-more">Report for ' + esc(vin) + ': <a href="' + esc(url) + '">' +
      esc(url) + "</a></p>" +
      '<div class="vault-actions" style="margin-top:2px">' +
        '<button class="btn btn--sm btn--ghost" type="button" data-copy="' + esc(url) + '">Copy link</button>' +
        '<a class="btn btn--sm btn--ghost" href="' + esc(url) + '">Open the report</a>' +
      "</div>";
  }

  window.CarDNAReport = {
    live: true,

    share: function (args) {
      var vin = clean(args && args.vin);
      if (!vin) { return { ok: false, error: "Enter the VIN you want to share." }; }
      if (!VIN.test(vin)) {
        return { ok: false, error: "A VIN is 17 characters and never contains I, O or Q." };
      }

      var url = folder() + "report.html?vin=" + encodeURIComponent(vin);

      /* Copied inside the click that asked for it, so the browser still counts it as the
         visitor's own action. Where copying is refused the link stays on screen to be copied. */
      var copy = window.CarDNACopy && window.CarDNACopy.text
        ? window.CarDNACopy.text(url)
        : Promise.resolve(false);

      return Promise.resolve(copy).then(function (copied) {
        return {
          ok: true,
          url: url,
          message: (copied ? "Link copied. " : "Copy the link below. ") +
            "A report for " + vin + ", readable without an account.",
          html: linkHtml(vin, url)
        };
      });
    }
  };
})();
