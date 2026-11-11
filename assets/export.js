/* CarDNA — export saved vehicles with their full decode.
   Markdown, CSV, a real .xlsx (merged sheet + one sheet per model) and a print-to-PDF view.
   No libraries: the xlsx writer is a minimal ZIP store with CRC-32 and inline strings. */

(function () {
  "use strict";

  var ENDPOINT = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/";

  /* ------------------------------------------------------------------ data */

  async function fetchFields(vin) {
    var response = await fetch(ENDPOINT + encodeURIComponent(vin) + "?format=json");
    if (!response.ok) { throw new Error("vPIC HTTP " + response.status + " for " + vin); }
    var payload = await response.json();
    var fields = {};

    (payload.Results || []).forEach(function (row) {
      var name = row.Variable;
      if (!name || fields[name]) { return; }
      var value = String(row.Value == null ? "" : row.Value).trim();
      if (!value || value === "0" || /^not applicable$/i.test(value)) { return; }
      fields[name] = value;
    });

    return fields;
  }

  /* Every schema field in order, as [label, key, section]. */
  function schemaFields() {
    var out = [];
    var schema = window.CarDNASchema;
    if (!schema || !schema.sections) { return out; }

    schema.sections.forEach(function (section) {
      section.fields.forEach(function (pair) {
        out.push({ label: pair[0], key: pair[1], section: section.title });
      });
    });
    return out;
  }

  function carName(vehicle) {
    return [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
      (vehicle.model || vehicle.vin);
  }

  function shortName(vehicle) {
    return (vehicle.model || vehicle.make || vehicle.vin || "Vehicle").trim();
  }

  /* ------------------------------------------------------------------ formats */

  function toCsv(vehicles, fieldsByVin) {
    var fields = schemaFields();
    var head = ["Section", "Field"].concat(vehicles.map(function (v) { return v.vin; }));
    var lines = [head.map(csvCell).join(",")];

    fields.forEach(function (field) {
      var row = [field.section, field.label];
      vehicles.forEach(function (v) { row.push((fieldsByVin[v.vin] || {})[field.key] || ""); });
      lines.push(row.map(csvCell).join(","));
    });

    return "\uFEFF" + lines.join("\r\n");
  }

  function csvCell(value) {
    var text = String(value == null ? "" : value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function toMarkdown(vehicles, fieldsByVin) {
    var fields = schemaFields();
    var out = ["# CarDNA — saved vehicles", "", "Exported " + new Date().toISOString().slice(0, 10) +
      " · " + vehicles.length + (vehicles.length === 1 ? " vehicle" : " vehicles"), ""];

    out.push("| Vehicle | VIN | Year | Make | Model |");
    out.push("|---|---|---|---|---|");
    vehicles.forEach(function (v) {
      out.push("| " + mdCell(carName(v)) + " | " + v.vin + " | " + mdCell(v.year || "—") +
        " | " + mdCell(v.make || "—") + " | " + mdCell(v.model || "—") + " |");
    });
    out.push("");

    vehicles.forEach(function (v) {
      var fields2 = fieldsByVin[v.vin] || {};
      out.push("## " + carName(v) + " — " + v.vin);
      out.push("");

      var section = "";
      fields.forEach(function (field) {
        if (field.section !== section) {
          section = field.section;
          out.push("### " + section);
          out.push("| Field | Value |");
          out.push("|---|---|");
        }
        out.push("| " + mdCell(field.label) + " | " + mdCell(fields2[field.key] || "—") + " |");
      });
      out.push("");
    });

    return out.join("\n");
  }

  function mdCell(value) {
    return String(value == null ? "" : value).replace(/\|/g, "\\|").replace(/\n/g, " ");
  }

  /* ------------------------------------------------------------------ xlsx */

  var CRC_TABLE = (function () {
    var table = [];
    for (var n = 0; n < 256; n += 1) {
      var c = n;
      for (var k = 0; k < 8; k += 1) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i += 1) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function zipStore(files) {
    var encoder = new TextEncoder();
    var chunks = [];
    var central = [];
    var offset = 0;

    files.forEach(function (file) {
      var name = encoder.encode(file.name);
      var data = file.data;
      var crc = crc32(data);

      var local = new Uint8Array(30 + name.length);
      var dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0x21, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true);
      dv.setUint32(22, data.length, true);
      dv.setUint16(26, name.length, true);
      dv.setUint16(28, 0, true);
      local.set(name, 30);

      var cen = new Uint8Array(46 + name.length);
      var dv2 = new DataView(cen.buffer);
      dv2.setUint32(0, 0x02014b50, true);
      dv2.setUint16(4, 20, true);
      dv2.setUint16(6, 20, true);
      dv2.setUint16(8, 0, true);
      dv2.setUint16(10, 0, true);
      dv2.setUint16(12, 0, true);
      dv2.setUint16(14, 0x21, true);
      dv2.setUint32(16, crc, true);
      dv2.setUint32(20, data.length, true);
      dv2.setUint32(24, data.length, true);
      dv2.setUint16(28, name.length, true);
      dv2.setUint16(30, 0, true);
      dv2.setUint16(32, 0, true);
      dv2.setUint16(34, 0, true);
      dv2.setUint16(36, 0, true);
      dv2.setUint32(38, 0, true);
      dv2.setUint32(42, offset, true);
      cen.set(name, 46);

      chunks.push(local, data);
      central.push(cen);
      offset += local.length + data.length;
    });

    var centralSize = central.reduce(function (total, part) { return total + part.length; }, 0);
    var end = new Uint8Array(22);
    var dv3 = new DataView(end.buffer);
    dv3.setUint32(0, 0x06054b50, true);
    dv3.setUint16(4, 0, true);
    dv3.setUint16(6, 0, true);
    dv3.setUint16(8, central.length, true);
    dv3.setUint16(10, central.length, true);
    dv3.setUint32(12, centralSize, true);
    dv3.setUint32(16, offset, true);
    dv3.setUint16(20, 0, true);

    var parts = chunks.concat(central, [end]);
    var total = parts.reduce(function (sum, part) { return sum + part.length; }, 0);
    var out = new Uint8Array(total);
    var at = 0;
    parts.forEach(function (part) { out.set(part, at); at += part.length; });
    return out;
  }

  function xmlEscape(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
      /* strip control characters Excel refuses */
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  }

  function columnName(index) {
    var name = "";
    var n = index + 1;
    while (n > 0) {
      var rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function sheetXml(rows) {
    var body = rows.map(function (row, r) {
      var cells = row.map(function (value, c) {
        var ref = columnName(c) + (r + 1);
        return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' +
          xmlEscape(value) + "</t></is></c>";
      }).join("");
      return '<row r="' + (r + 1) + '">' + cells + "</row>";
    }).join("");

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      "<sheetData>" + body + "</sheetData></worksheet>";
  }

  function sheetName(raw, used) {
    var base = String(raw || "Vehicle").replace(/[\\\/\?\*\[\]:]/g, " ").trim().slice(0, 28) || "Vehicle";
    var name = base;
    var n = 2;
    while (used[name]) {
      name = base.slice(0, 26) + " " + n;
      n += 1;
    }
    used[name] = true;
    return name;
  }

  function toXlsx(vehicles, fieldsByVin) {
    var fields = schemaFields();
    var encoder = new TextEncoder();

    var merged = [["Section", "Field"].concat(vehicles.map(carName))];
    fields.forEach(function (field) {
      var row = [field.section, field.label];
      vehicles.forEach(function (v) { row.push((fieldsByVin[v.vin] || {})[field.key] || ""); });
      merged.push(row);
    });

    var sheets = [{ name: "All vehicles", rows: merged }];
    var used = { "All vehicles": true };

    vehicles.forEach(function (v) {
      var rows = [["Field", "Value"]];
      var data = fieldsByVin[v.vin] || {};
      rows.push(["VIN", v.vin]);
      rows.push(["Vehicle", carName(v)]);
      rows.push(["", ""]);
      fields.forEach(function (field) {
        rows.push([field.label, data[field.key] || ""]);
      });
      sheets.push({ name: sheetName(shortName(v), used), rows: rows });
    });

    var files = [];
    var overrides = sheets.map(function (s, i) {
      return '<Override PartName="/xl/worksheets/sheet' + (i + 1) +
        '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }).join("");

    files.push({
      name: "[Content_Types].xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        overrides + "</Types>")
    });

    files.push({
      name: "_rels/.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>")
    });

    var sheetTags = sheets.map(function (s, i) {
      return '<sheet name="' + xmlEscape(s.name) + '" sheetId="' + (i + 1) +
        '" r:id="rId' + (i + 1) + '"/>';
    }).join("");

    files.push({
      name: "xl/workbook.xml",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        "<sheets>" + sheetTags + "</sheets></workbook>")
    });

    var rels = sheets.map(function (s, i) {
      return '<Relationship Id="rId' + (i + 1) +
        '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
        'Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    }).join("");

    files.push({
      name: "xl/_rels/workbook.xml.rels",
      data: encoder.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        rels + "</Relationships>")
    });

    sheets.forEach(function (s, i) {
      files.push({
        name: "xl/worksheets/sheet" + (i + 1) + ".xml",
        data: encoder.encode(sheetXml(s.rows))
      });
    });

    return zipStore(files);
  }

  /* ------------------------------------------------------------------ files */

  function download(bytes, type, name) {
    var blob = new Blob([bytes], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function stamp() {
    return new Date().toISOString().slice(0, 10);
  }

  /* PDF via the browser's print-to-PDF: one page per vehicle, no pop-up blocker involved. */
  function printReport(vehicles, fieldsByVin) {
    var fields = schemaFields();
    var frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);

    var doc = frame.contentWindow.document;
    var html = ["<!doctype html><html><head><meta charset='utf-8'><title>CarDNA export</title>",
      "<style>",
      "body{font:12px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#111;margin:24px}",
      "h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px}",
      "p.meta{color:#666;font-size:11px;margin:0 0 16px}",
      "table{width:100%;border-collapse:collapse;margin:0 0 12px}",
      "th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #ddd;vertical-align:top;font-size:11px}",
      "th{background:#f2f2f2}",
      "@media print{body{margin:12mm}h2{page-break-after:avoid}}",
      "</style></head><body>"];

    html.push("<h1>CarDNA — saved vehicles</h1>");
    html.push("<p class='meta'>Exported " + new Date().toISOString().slice(0, 10) + " · " +
      vehicles.length + " vehicle(s)</p>");
    html.push("<table><tr><th>Vehicle</th><th>VIN</th><th>Year</th><th>Make</th><th>Model</th></tr>");
    vehicles.forEach(function (v) {
      html.push("<tr><td>" + xmlEscape(carName(v)) + "</td><td>" + xmlEscape(v.vin) + "</td><td>" +
        xmlEscape(v.year || "—") + "</td><td>" + xmlEscape(v.make || "—") + "</td><td>" +
        xmlEscape(v.model || "—") + "</td></tr>");
    });
    html.push("</table>");

    vehicles.forEach(function (v) {
      var data = fieldsByVin[v.vin] || {};
      html.push("<h2>" + xmlEscape(carName(v)) + " — " + xmlEscape(v.vin) + "</h2>");
      html.push("<table><tr><th>Field</th><th>Value</th></tr>");
      fields.forEach(function (field) {
        var value = data[field.key];
        html.push("<tr><td>" + xmlEscape(field.label) + "</td><td>" + xmlEscape(value || "—") + "</td></tr>");
      });
      html.push("</table>");
    });

    html.push("</body></html>");

    doc.open();
    doc.write(html.join(""));
    doc.close();

    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(function () { frame.remove(); }, 60000);
  }

  /* ------------------------------------------------------------------ api */

  /* Decode every vehicle, reporting progress, then hand the fields to a formatter. */
  async function prepare(vehicles, onProgress) {
    var fieldsByVin = {};

    for (var i = 0; i < vehicles.length; i += 1) {
      var vehicle = vehicles[i];
      if (onProgress) { onProgress(i, vehicles.length, vehicle); }
      try {
        fieldsByVin[vehicle.vin] = await fetchFields(vehicle.vin);
      } catch (err) {
        fieldsByVin[vehicle.vin] = {};
        if (window.console && window.console.warn) { window.console.warn(err); }
      }
    }

    if (onProgress) { onProgress(vehicles.length, vehicles.length, null); }
    return fieldsByVin;
  }

  function save(format, vehicles, fieldsByVin) {
    var name = "cardna-export-" + stamp();
    var count = vehicles.length;

    if (format === "md") {
      download(toMarkdown(vehicles, fieldsByVin), "text/markdown", name + ".md");
    } else if (format === "csv") {
      download(toCsv(vehicles, fieldsByVin), "text/csv", name + ".csv");
    } else if (format === "xlsx") {
      download(toXlsx(vehicles, fieldsByVin),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name + ".xlsx");
    } else if (format === "pdf") {
      printReport(vehicles, fieldsByVin);
    }

    return count;
  }

  window.CarDNAExport = {
    prepare: prepare,
    save: save,
    fetchFields: fetchFields,
    carName: carName,
    shortName: shortName
  };
})();
