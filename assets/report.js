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

  window.CarDNAReport = {
    live: true,

    share: function (args) {
      var vin = clean(args && args.vin);
      if (!vin) { return { ok: false, error: "Enter the VIN you want to share." }; }
      if (!VIN.test(vin)) {
        return { ok: false, error: "A VIN is 17 characters and never contains I, O or Q." };
      }

      var url = folder() + "report.html?vin=" + encodeURIComponent(vin);
      return {
        ok: true,
        url: url,
        message: "Link ready for " + vin + ". It shows the filed record only, once someone has " +
          "decoded this VIN with CarDNA.",
        html: '<p class="recall-more">Share this link: <a href="' + esc(url) + '">' + esc(url) + "</a></p>"
      };
    }
  };
})();
