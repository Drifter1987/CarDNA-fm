/* F-23 — the public shareable report, the reading side.
   Reads public.decode_cache for one VIN and shows only the filed fields: never a note, a garage
   label or an account. A VIN nobody has decoded yet is answered honestly, not decoded here, so a
   visitor who has no account can still read a report that someone else has already filed. */
(function () {
  "use strict";

  var VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
  var SECTIONS = [
    ["Make", "Make"], ["Model", "Model"], ["Model year", "Model Year"],
    ["Body", "Body Class"], ["Vehicle type", "Vehicle Type"],
    ["Engine", "Displacement (L)"], ["Cylinders", "Engine Number of Cylinders"],
    ["Fuel", "Fuel Type - Primary"], ["Drive", "Drive Type"],
    ["Plant city", "Plant City"], ["Plant country", "Plant Country"],
    ["Manufacturer", "Manufacturer Name"]
  ];

  var form = document.getElementById("report-form");
  var input = document.getElementById("report-vin");
  var hint = document.getElementById("report-hint");
  var out = document.getElementById("report-result");
  var title = document.getElementById("report-title");

  function config() {
    var cfg = window.CARDNA_SUPABASE || {};
    return { base: String(cfg.url || "").replace(/\/+$/, ""), key: cfg.key || "" };
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (chr) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[chr];
    });
  }

  function setHint(text, isError) {
    if (!hint) { return; }
    hint.textContent = text;
    hint.classList.toggle("vin-hint--error", Boolean(isError));
  }

  function show(html) {
    if (!out) { return; }
    out.hidden = false;
    out.innerHTML = html;
  }

  /* The payload is the raw vPIC answer that decode_cache stores: { Results: [ { Variable, Value }, … ] }.
     It is flattened into one Variable → Value map, so the page reads each field by its vPIC name.
     Empty rows, zeros and "Not Applicable" are dropped, as the decoder drops them. Anything else is
     treated as "not in the cache". */
  function filedFields(payload) {
    var results = payload && payload.Results;
    if (!Array.isArray(results) || !results.length) { return null; }
    var fields = {};
    results.forEach(function (item) {
      var name = item && item.Variable;
      if (!name || fields[name]) { return; }
      var value = String(item.Value == null ? "" : item.Value).trim();
      if (!value || value === "0" || /^not applicable$/i.test(value)) { return; }
      fields[name] = value;
    });
    return Object.keys(fields).length ? fields : null;
  }

  function render(vin, fields) {
    var make = fields.Make || "";
    var model = fields.Model || "";
    var year = fields["Model Year"] || "";
    var heading = [year, make, model].filter(Boolean).join(" ") || vin;

    if (title) { title.textContent = heading; }
    setHint("Filed record for " + vin + ".", false);

    var rows = SECTIONS.map(function (pair) {
      var value = fields[pair[1]];
      return '<div class="dna-row' + (value ? "" : " is-empty") + '">' +
        '<div class="dna-key">' + esc(pair[0]) + "</div>" +
        '<div class="dna-val">' + (value ? esc(value) : "\u2014") + "</div>" +
        "</div>";
    }).join("");

    show('<div class="dna"><header class="dna-head"><span class="dna-vin">' + esc(vin) + "</span>" +
      '<span class="dna-head-actions">' +
        '<button class="btn btn--ghost btn--sm" type="button" data-share-report>Share</button>' +
        '<a class="btn btn--ghost btn--sm" href="decode.html?vin=' + encodeURIComponent(vin) + '">Decode this VIN</a>' +
      "</span></header>" +
      '<p class="dna-share-status" aria-live="polite"></p>' +
      '<div class="dna-rows">' + rows + "</div>" +
      '<p class="dna-empty">Only what the NHTSA register filed. Nothing here is a note, a label or an account.</p>' +
      "</div>");
  }

  function lookup(vin) {
    var cfg = config();
    if (!cfg.base || !cfg.key) {
      setHint("Reports are not connected on this copy of the site.", true);
      show('<div class="dna"><p class="dna-empty">Nothing was loaded.</p></div>');
      return;
    }

    setHint("Reading the filed record…", false);
    fetch(cfg.base + "/rest/v1/decode_cache?select=payload&vin=eq." + encodeURIComponent(vin) + "&limit=1", {
      headers: { apikey: cfg.key, Accept: "application/json" }
    }).then(function (response) {
      if (!response.ok) { throw new Error("HTTP " + response.status); }
      return response.json();
    }).then(function (rows) {
      var fields = rows && rows[0] && rows[0].payload ? filedFields(rows[0].payload) : null;
      if (!fields) {
        setHint("No report for " + vin + " yet.", true);
        show('<div class="dna"><p class="dna-empty">Nobody has decoded this VIN with CarDNA yet, so ' +
          "there is no filed record to show. Decode it once from the decoder and this page will have it.</p>" +
          '<p><a class="btn btn--sm" href="decode.html?vin=' + encodeURIComponent(vin) + '">Decode it</a></p></div>');
        return;
      }
      render(vin, fields);
    }).catch(function () {
      setHint("The report could not be read. Nothing was changed; try again.", true);
      show('<div class="dna"><p class="dna-empty">The filed record is not available right now.</p></div>');
    });
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
  }

  function clear() {
    if (!out) { return; }
    out.hidden = true;
    out.innerHTML = "";
  }

  /* The report's own Share control. The copy happens first and on its own, because that is the
     part that always works; the device's share sheet is offered afterwards where the browser has
     one, and a sheet that is dismissed or never answers leaves the copy in place. */
  function bindShare() {
    document.addEventListener("click", function (event) {
      var button = event.target && event.target.closest ? event.target.closest("[data-share-report]") : null;
      if (!button) { return; }

      var host = button.closest(".dna");
      var vinNode = host && host.querySelector(".dna-vin");
      var vin = vinNode ? vinNode.textContent.trim() : "";
      var base = window.location.href.split("#")[0].split("?")[0];
      var url = vin ? base + "?vin=" + encodeURIComponent(vin) : window.location.href.split("#")[0];

      var line = host && host.querySelector(".dna-share-status");
      var say = function (text) { if (line) { line.textContent = text; } };

      var attempt = window.CarDNACopy && window.CarDNACopy.text
        ? window.CarDNACopy.text(url)
        : Promise.resolve(false);

      Promise.resolve(attempt).then(function (ok) {
        say(ok ? "Link copied." : "Copy the address bar instead — this browser refused the copy.");

        if (!navigator.share) { return; }
        try {
          var sheet = navigator.share({ title: document.title, url: url });
          if (sheet && typeof sheet.then === "function") {
            sheet.then(function () { say("Shared."); }, function () { /* dismissed: the copy stands */ });
          }
        } catch (err) {
          /* No share sheet here; the copy is already done. */
        }
      });
    });
  }

  function start() {
    bindShare();

    var requested = clean(new URLSearchParams(window.location.search).get("vin"));
    if (input && requested) { input.value = requested; }

    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var vin = clean(input && input.value);
        if (!VIN.test(vin)) {
          /* A bad VIN must not leave the previous report, or its failure, on screen under it, and
             the address bar must stop naming the VIN that is no longer shown. */
          clear();
          history.replaceState({}, "", "report.html");
          setHint("A VIN is 17 characters and never contains I, O or Q.", true);
          if (input) { input.focus(); }
          return;
        }
        history.replaceState({}, "", "report.html?vin=" + encodeURIComponent(vin));
        lookup(vin);
      });
    }

    if (requested && VIN.test(requested)) { lookup(requested); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
