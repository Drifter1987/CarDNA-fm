/* F-16 — recalls and complaints. LIVE: NHTSA's public data, no key, no cost.
   Contract: recalls({ vin }) → { ok, recalls:[…], message, html } or { ok:false, error }.
   A VIN has no recall lookup of its own, so vPIC files the make, model and year first and
   those three drive NHTSA's recall query — the same two calls tools/vin-compare.html makes. */
(function () {
  "use strict";

  var VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
  var VPIC = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/";
  var RECALLS = "https://api.nhtsa.gov/recalls/recallsByVehicle";

  function clean(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
  }

  /* vPIC files makes in capitals ("HONDA"); a sentence reads better in title case. */
  function titleCase(value) {
    return String(value || "").toLowerCase().replace(/\b[a-z]/g, function (chr) {
      return chr.toUpperCase();
    });
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (chr) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[chr];
    });
  }

  function getJson(url) {
    return fetch(url, { headers: { Accept: "application/json" } }).then(function (res) {
      if (!res.ok) { throw new Error("NHTSA answered HTTP " + res.status + "."); }
      return res.json();
    });
  }

  /* Every campaign, one folded line each. A native details element, so the keyboard, a screen
     reader and a phone all already know how it opens. */
  function listHtml(recalls) {
    return recalls.map(function (recall) {
      var body = "";
      if (recall.summary) { body += "<span>" + esc(recall.summary) + "</span>"; }
      if (recall.remedy) { body += "<span><em>Remedy</em> " + esc(recall.remedy) + "</span>"; }
      if (recall.date) { body += '<span class="recall-meta">filed ' + esc(recall.date) + "</span>"; }

      return '<details class="recall">' +
        "<summary>" +
          "<b>" + esc(recall.component || "Campaign") + "</b>" +
          (recall.campaign ? '<span class="recall-campaign">' + esc(recall.campaign) + "</span>" : "") +
        "</summary>" +
        '<div class="recall-body">' + body + "</div>" +
        "</details>";
    }).join("");
  }

  window.CarDNAVehicle = {
    live: true,

    recalls: function (args) {
      var vin = clean(args && args.vin);
      if (!vin) { return { ok: false, error: "Enter the VIN you want to check." }; }
      if (!VIN.test(vin)) {
        return { ok: false, error: "A VIN is 17 characters and never contains I, O or Q." };
      }

      return getJson(VPIC + encodeURIComponent(vin) + "?format=json")
        .then(function (json) {
          var row = (json && json.Results && json.Results[0]) || {};
          var make = row.Make || "";
          var model = row.Model || "";
          var year = row.ModelYear || "";

          if (!make || !model || !year) {
            return {
              ok: false,
              error: "vPIC filed no make, model and year for " + vin +
                ", and a recall search needs all three. Nothing was guessed."
            };
          }

          var url = RECALLS +
            "?make=" + encodeURIComponent(make) +
            "&model=" + encodeURIComponent(model) +
            "&modelYear=" + encodeURIComponent(year);

          return getJson(url).then(function (data) {
            var rows = (data && data.results) || [];
            var recalls = rows.map(function (recall) {
              return {
                campaign: recall.NHTSACampaignNumber || "",
                component: recall.Component || "",
                summary: recall.Summary || "",
                consequence: recall.Consequence || "",
                remedy: recall.Remedy || "",
                date: recall.ReportReceivedDate || ""
              };
            });

            var label = [year, titleCase(make), titleCase(model)].filter(Boolean).join(" ");
            return {
              ok: true,
              recalls: recalls,
              html: recalls.length ? listHtml(recalls) : "",
              message: recalls.length
                ? recalls.length + " campaign" + (recalls.length === 1 ? "" : "s") +
                  " on record for this " + label + "."
                : "No campaigns on record for this " + label + "."
            };
          });
        })
        .catch(function (err) {
          return {
            ok: false,
            error: (err && err.message ? err.message : "The lookup failed.") +
              " Nothing was saved; try again."
          };
        });
    }
  };
})();
