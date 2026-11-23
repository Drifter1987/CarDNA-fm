/* F-16 — recalls and complaints. LIVE: NHTSA's public data, no key, no cost.
   Contract: recalls({ vin }) → { ok, recalls:[…], message, html } or { ok:false, error }.
   A VIN has no recall lookup of its own, so vPIC files the make, model and year first and
   those three drive NHTSA's recall query — the same two calls tools/vin-compare.html makes. */
(function () {
  "use strict";

  var VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
  var VPIC = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/";
  var RECALLS = "https://api.nhtsa.gov/recalls/recallsByVehicle";
  var SHOWN = 8;

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

  function listHtml(recalls) {
    var html = recalls.slice(0, SHOWN).map(function (recall) {
      var meta = [recall.campaign, recall.date ? "filed " + recall.date : ""]
        .filter(Boolean).join(" \u00b7 ");
      return '<div class="recall">' +
        "<b>" + esc(recall.component || "Campaign") + "</b>" +
        (recall.summary ? "<span>" + esc(recall.summary) + "</span>" : "") +
        (recall.remedy ? "<span><em>Remedy</em> " + esc(recall.remedy) + "</span>" : "") +
        (meta ? "<span class=\"recall-meta\">" + esc(meta) + "</span>" : "") +
        "</div>";
    }).join("");

    if (recalls.length > SHOWN) {
      html += '<p class="recall-more">Showing the first ' + SHOWN + " of " +
        recalls.length + ". The full list is on NHTSA's site.</p>";
    }
    return html;
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
