/* F-17 — bulk VIN upload.
   The reading and checking are real: a CSV is parsed in the browser and every row is
   validated against the same rule the decoder uses. Only the upload is missing, so the
   panel reports exactly what would happen and then says it is not connected. */
(function () {
  "use strict";

  var VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
  var MAX_BYTES = 2 * 1024 * 1024;

  function readText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(new Error("That file could not be read.")); };
      reader.readAsText(file);
    });
  }

  function rowsOf(text) {
    return text.split(/\r?\n/).map(function (line) {
      return String(line).split(/[,;\t]/)[0].replace(/"/g, "").trim().toUpperCase();
    }).filter(function (value) {
      return value && value !== "VIN";
    });
  }

  window.CarDNABulk = {
    live: false,

    /* Contract: upload({ file }) → { ok, accepted, rejected:[{ vin, reason }] }. */
    upload: function (args) {
      var file = args && args.file;
      if (!file) { return { ok: false, error: "Choose a CSV file first." }; }
      if (file.size > MAX_BYTES) {
        return { ok: false, error: "Keep the file under 2 MB — that is around 60,000 VINs." };
      }

      return readText(file).then(function (text) {
        var rows = rowsOf(text);
        if (!rows.length) {
          return { ok: false, error: "That file has no rows. One VIN per line is enough." };
        }

        var accepted = [];
        var rejected = [];
        rows.forEach(function (vin) {
          if (VIN.test(vin)) { accepted.push(vin); }
          else { rejected.push({ vin: vin, reason: "Not 17 characters without I, O or Q." }); }
        });

        return {
          ok: false,
          error: "preview",
          message: rows.length + " row" + (rows.length === 1 ? "" : "s") + " read: " +
            accepted.length + " valid VIN" + (accepted.length === 1 ? "" : "s") +
            (rejected.length ? ", " + rejected.length + " rejected" : "") +
            ". Uploading them to your garage is not connected yet, so nothing was saved.",
          detail: { accepted: accepted, rejected: rejected }
        };
      });
    }
  };
})();
