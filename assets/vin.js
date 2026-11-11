/* CarDNA — VIN decoding against NHTSA vPIC.
   Renders a fixed, complete field schema for every VIN using vPIC's canonical variable names.
   Fields the manufacturer did not file show "—". Decode errors are surfaced, not hidden. */

(function () {
  "use strict";

  var ENDPOINT = "https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/";
  var RECENT_KEY = "cardna.recent";
  var MAX_RECENT = 6;

  var SECTIONS = [
    {
      title: "Identity",
      fields: [
        ["Make", "Make"],
        ["Model", "Model"],
        ["Model year", "Model Year"],
        ["Series", "Series"],
        ["Series 2", "Series2"],
        ["Trim", "Trim"],
        ["Trim 2", "Trim2"],
        ["Vehicle type", "Vehicle Type"],
        ["Body class", "Body Class"],
        ["Doors", "Doors"],
        ["Steering location", "Steering Location"],
        ["Destination market", "Destination Market"],
        ["Vehicle descriptor", "Vehicle Descriptor"]
      ]
    },
    {
      title: "Engine",
      fields: [
        ["Engine model", "Engine Model"],
        ["Cylinders", "Engine Number of Cylinders"],
        ["Displacement (CC)", "Displacement (CC)"],
        ["Displacement (CI)", "Displacement (CI)"],
        ["Displacement (L)", "Displacement (L)"],
        ["Engine configuration", "Engine Configuration"],
        ["Valve train", "Valve Train Design"],
        ["Aspiration", "Aspiration"],
        ["Turbo", "Turbo"],
        ["Cooling type", "Cooling Type"],
        ["Stroke cycles", "Engine Stroke Cycles"],
        ["Power (kW)", "Engine Power (kW)"],
        ["Brake hp from", "Engine Brake (hp) From"],
        ["Brake hp to", "Engine Brake (hp) To"],
        ["Top speed (mph)", "Top Speed (MPH)"],
        ["Engine manufacturer", "Engine Manufacturer"],
        ["Other engine info", "Other Engine Info"]
      ]
    },
    {
      title: "Fuel & electrification",
      fields: [
        ["Fuel — primary", "Fuel Type - Primary"],
        ["Fuel — secondary", "Fuel Type - Secondary"],
        ["Delivery / injection", "Fuel Delivery/Fuel Injection Type"],
        ["Electrification level", "Electrification Level"],
        ["EV drive unit", "EV Drive Unit"],
        ["Battery type", "Battery Type"],
        ["Battery energy (kWh)", "Battery Energy (kWh) From"],
        ["Battery voltage (V)", "Battery Voltage (Volts) From"],
        ["Charger level", "Charger Level"],
        ["Charger power (kW)", "Charger Power (kW)"],
        ["Cells per module", "Number of Battery Cells per Module"],
        ["Modules per pack", "Number of Battery Modules per Pack"],
        ["Packs per vehicle", "Number of Battery Packs per Vehicle"]
      ]
    },
    {
      title: "Drivetrain & transmission",
      fields: [
        ["Drive type", "Drive Type"],
        ["Transmission style", "Transmission Style"],
        ["Transmission speeds", "Transmission Speeds"],
        ["Transmission manufacturer", "Transmission Manufacturer"],
        ["Axles", "Axles"]
      ]
    },
    {
      title: "Body, dimensions & weights",
      fields: [
        ["Seat rows", "Number of Seat Rows"],
        ["Wheels", "Number of Wheels"],
        ["Wheelbase from (in)", "Wheelbase (inches) From"],
        ["Wheelbase to (in)", "Wheelbase (inches) To"],
        ["Wheel size front (in)", "Wheel Size Front (inches)"],
        ["Wheel size rear (in)", "Wheel Size Rear (inches)"],
        ["Track width (in)", "Track Width (inches)"],
        ["Bed type", "Bed Type"],
        ["Bed length (in)", "Bed Length (inches)"],
        ["Cab type", "Cab Type"],
        ["Curb weight (lb)", "Curb Weight (pounds)"],
        ["GVWR from", "Gross Vehicle Weight Rating From"],
        ["GVWR to", "Gross Vehicle Weight Rating To"],
        ["Trailer connection", "Trailer Type Connection"],
        ["Trailer body type", "Trailer Body Type"],
        ["Trailer length (ft)", "Trailer Length (feet)"]
      ]
    },
    {
      title: "Safety & driver assist",
      fields: [
        ["Seat belt type", "Seat Belt Type"],
        ["Other restraint info", "Other Restraint System Info"],
        ["Pretensioner", "Pretensioner"],
        ["Front airbags", "Front Air Bag Locations"],
        ["Knee airbags", "Knee Air Bag Locations"],
        ["Side airbags", "Side Air Bag Locations"],
        ["Curtain airbags", "Curtain Air Bag Locations"],
        ["Seat cushion airbags", "Seat Cushion Air Bag Locations"],
        ["ABS", "Antilock Braking System (ABS)"],
        ["Stability control", "Electronic Stability Control (ESC)"],
        ["Traction control", "Traction Control"],
        ["Blind spot warning", "Blind Spot Warning (BSW)"],
        ["Forward collision warning", "Forward Collision Warning (FCW)"],
        ["Lane departure warning", "Lane Departure Warning (LDW)"],
        ["Lane keeping assist", "Lane Keeping Assistance (LKA)"],
        ["Lane centering assist", "Lane Centering Assistance"],
        ["Adaptive cruise control", "Adaptive Cruise Control (ACC)"],
        ["Crash imminent braking", "Crash Imminent Braking (CIB)"],
        ["Dynamic brake support", "Dynamic Brake Support (DBS)"],
        ["Pedestrian AEB", "Pedestrian Automatic Emergency Braking (PAEB)"],
        ["Rear cross traffic alert", "Rear Cross Traffic Alert"],
        ["Backup camera", "Backup Camera"],
        ["Parking assist", "Parking Assist"],
        ["Keyless ignition", "Keyless Ignition"],
        ["Daytime running light", "Daytime Running Light (DRL)"],
        ["Headlamp light source", "Headlamp Light Source"],
        ["Beam switching", "Semiautomatic Headlamp Beam Switching"],
        ["Adaptive driving beam", "Adaptive Driving Beam (ADB)"],
        ["Auto-reverse windows/sunroof", "Auto-Reverse System for Windows and Sunroofs"],
        ["Pedestrian alerting sound", "Automatic Pedestrian Alerting Sound (for Hybrid and EV only)"],
        ["Event data recorder", "Event Data Recorder (EDR)"],
        ["SAE automation from", "SAE Automation Level From"],
        ["SAE automation to", "SAE Automation Level To"],
        ["TPMS", "Tire Pressure Monitoring System (TPMS) Type"]
      ]
    },
    {
      title: "Plant & manufacturer",
      fields: [
        ["Manufacturer", "Manufacturer Name"],
        ["Plant company", "Plant Company Name"],
        ["Plant address", "Plant Address"],
        ["Plant city", "Plant City"],
        ["Plant state", "Plant State"],
        ["Plant country", "Plant Country"]
      ]
    }
  ];

  /* assets/vin-schema.js is the single source of truth when it is loaded. */
  if (window.CarDNASchema && window.CarDNASchema.sections) {
    SECTIONS = window.CarDNASchema.sections;
  }

  var NOTE_FIELDS = [
    ["Error code", "Error Code"],    ["Error text", "Error Text"],
    ["Additional error text", "Additional Error Text"],
    ["Suggested VIN", "Suggested VIN"]
  ];

  /* ------------------------------------------------------------------ European decoder
     Structural decode from ISO 3779 / 3780: the first three characters are the World
     Manufacturer Identifier, which identifies the maker and its market. Position 10 is the
     model year, 11 the plant, 12–17 the serial. This is the layer that still works for
     European VINs, which NHTSA's US register does not know. */

  var WMI = {
    /* Germany */
    "WAU": ["Audi", "Germany"], "WUA": ["Audi", "Germany"], "WA1": ["Audi", "Germany"],
    "WVW": ["Volkswagen", "Germany"], "WV1": ["Volkswagen", "Germany"], "WV2": ["Volkswagen", "Germany"],
    "1VW": ["Volkswagen", "United States"], "3VW": ["Volkswagen", "Mexico"], "8AW": ["Volkswagen", "Argentina"],
    "VSS": ["SEAT", "Spain"], "VSE": ["SEAT", "Spain"],
    "TMB": ["Skoda", "Czechia"], "TM9": ["Skoda", "Czechia"],
    "WP0": ["Porsche", "Germany"], "WP1": ["Porsche", "Germany"],
    "WBA": ["BMW", "Germany"], "WBS": ["BMW M", "Germany"], "WBX": ["BMW", "Germany"], "WBY": ["BMW i", "Germany"],
    "5UX": ["BMW", "United States"], "5UJ": ["BMW", "United States"],
    "WMW": ["MINI", "United Kingdom"], "3MW": ["MINI", "Mexico"],
    "WDB": ["Mercedes-Benz", "Germany"], "WDD": ["Mercedes-Benz", "Germany"], "WDC": ["Mercedes-Benz", "Germany"],
    "WMH": ["Mercedes-Benz", "Germany"], "W1K": ["Mercedes-Benz", "Germany"], "W1N": ["Mercedes-Benz", "Germany"],
    "4JG": ["Mercedes-Benz", "United States"], "55S": ["Mercedes-Benz", "United States"],
    "WME": ["Smart", "Germany"],
    "W0L": ["Opel", "Germany"], "W0V": ["Opel", "Germany"], "W0W": ["Opel", "Germany"], "W0P": ["Opel", "Germany"],
    "WF0": ["Ford", "Germany"], "WF1": ["Ford", "Germany"], "WF2": ["Ford", "Germany"],
    "WJK": ["Jeep", "Austria"],
    "7SA": ["Tesla", "Germany"], "7G2": ["Tesla", "Germany"],

    /* France */
    "VF1": ["Renault", "France"], "VF6": ["Renault", "France"], "VF8": ["Renault", "France"],
    "VF3": ["Peugeot", "France"], "VF7": ["Citroen", "France"],
    "VR1": ["DS", "France"], "VR3": ["DS", "France"],
    "VNK": ["Toyota", "France"], "VGA": ["Peugeot", "France"],
    "UU1": ["Dacia", "Romania"],

    /* Italy */
    "ZFA": ["Fiat", "Italy"], "ZAR": ["Alfa Romeo", "Italy"], "ZLA": ["Lancia", "Italy"],
    "ZFF": ["Ferrari", "Italy"], "ZHW": ["Lamborghini", "Italy"], "ZAM": ["Maserati", "Italy"],
    "ZCF": ["Iveco", "Italy"], "Z9M": ["Fiat", "Italy"],

    /* UK & Ireland */
    "SAJ": ["Jaguar", "United Kingdom"], "SAL": ["Land Rover", "United Kingdom"], "SAD": ["Land Rover", "United Kingdom"],
    "SCF": ["Aston Martin", "United Kingdom"], "SBM": ["McLaren", "United Kingdom"],
    "SCC": ["Lotus", "United Kingdom"], "SCB": ["Bentley", "United Kingdom"], "SCA": ["Rolls-Royce", "United Kingdom"],
    "SA9": ["Morgan", "United Kingdom"], "SAB": ["Rover", "United Kingdom"], "SAC": ["MG", "United Kingdom"],
    "SHH": ["Honda", "United Kingdom"], "SB1": ["Toyota", "United Kingdom"], "SJN": ["Nissan", "United Kingdom"],

    /* Sweden, Spain, Czechia, Russia, Turkey, Slovakia, Netherlands */
    "YV1": ["Volvo", "Sweden"], "YV4": ["Volvo", "Sweden"], "YS3": ["Saab", "Sweden"],
    "VSK": ["Nissan", "Spain"], "VX1": ["Santana", "Spain"],
    "TNU": ["Tatra", "Czechia"], "TMA": ["Hyundai", "Czechia"],
    "XTA": ["Lada", "Russia"], "X96": ["GAZ", "Russia"], "XTT": ["UAZ", "Russia"], "X4X": ["Moskvich", "Russia"],
    "NLH": ["Hyundai", "Turkey"], "NMT": ["Togg", "Turkey"],
    "U5Y": ["Kia", "Slovakia"], "UU5": ["Kia", "Slovakia"],
    "VAV": ["DAF", "Netherlands"], "XLR": ["DAF", "Netherlands"],

    /* Asia outside Japan/Korea */
    "LC0": ["BYD", "China"], "L6T": ["Geely", "China"], "LVV": ["Chery", "China"],
    "LGW": ["Great Wall", "China"], "LVY": ["Volvo", "China"], "LFP": ["FAW", "China"],
    "LSV": ["SAIC Volkswagen", "China"], "LGB": ["Dongfeng", "China"],
    "MA3": ["Maruti Suzuki", "India"], "MAT": ["Tata", "India"],
    "RLL": ["VinFast", "Vietnam"], "PMH": ["Perodua", "Malaysia"], "PL1": ["Proton", "Malaysia"],

    /* Japan */
    "JHM": ["Honda", "Japan"], "JHL": ["Honda", "Japan"],
    "JTD": ["Toyota", "Japan"], "JTE": ["Toyota", "Japan"], "JTM": ["Toyota", "Japan"],
    "JT2": ["Toyota", "Japan"], "JT3": ["Toyota", "Japan"], "JTN": ["Toyota", "Japan"],
    "JN1": ["Nissan", "Japan"], "JN8": ["Nissan", "Japan"],
    "JM1": ["Mazda", "Japan"], "JM3": ["Mazda", "Japan"],
    "JF1": ["Subaru", "Japan"], "JF2": ["Subaru", "Japan"],
    "JS2": ["Suzuki", "Japan"], "JS3": ["Suzuki", "Japan"],
    "JA3": ["Mitsubishi", "Japan"], "JA4": ["Mitsubishi", "Japan"],
    "JDA": ["Daihatsu", "Japan"], "JMB": ["Mitsubishi", "Japan"],

    /* Korea */
    "KMH": ["Hyundai", "South Korea"], "KM8": ["Hyundai", "South Korea"],
    "KNA": ["Kia", "South Korea"], "KND": ["Kia", "South Korea"], "KNM": ["Kia", "South Korea"],

    /* North America */
    "1HG": ["Honda", "United States"], "2HG": ["Honda", "Canada"], "3HG": ["Honda", "Mexico"],
    "5FN": ["Honda", "United States"], "5J6": ["Honda", "United States"],
    "1G1": ["Chevrolet", "United States"], "2G1": ["Chevrolet", "Canada"], "3GC": ["Chevrolet", "Mexico"],
    "1GC": ["Chevrolet", "United States"], "1GT": ["GMC", "United States"],
    "1FA": ["Ford", "United States"], "1FB": ["Ford", "United States"], "1FC": ["Ford", "United States"],
    "1FT": ["Ford", "United States"], "2FT": ["Ford", "Canada"], "2FM": ["Ford", "Canada"],
    "3FA": ["Ford", "Mexico"], "1LN": ["Lincoln", "United States"],
    "1C3": ["Chrysler", "United States"], "2C3": ["Chrysler", "Canada"], "3C4": ["Chrysler", "Mexico"],
    "1B3": ["Dodge", "United States"], "2B3": ["Dodge", "Canada"],
    "1J4": ["Jeep", "United States"], "1C4": ["Jeep", "United States"],
    "1D3": ["Dodge", "United States"], "1T7": ["RAM", "United States"],
    "4T1": ["Toyota", "United States"], "4T3": ["Toyota", "United States"], "5TD": ["Toyota", "United States"],
    "5TF": ["Toyota", "United States"], "2T1": ["Toyota", "Canada"], "3TM": ["Toyota", "Mexico"],
    "1NX": ["Toyota", "United States"],
    "5YJ": ["Tesla", "United States"], "7PD": ["Tesla", "United States"],
    "1FM": ["Ford", "United States"], "1ZV": ["Ford", "United States"],
    "1GM": ["Pontiac", "United States"], "1G4": ["Buick", "United States"],
    "1GY": ["Cadillac", "United States"], "1G6": ["Cadillac", "United States"],
    "1B7": ["Dodge", "United States"], "1D7": ["Dodge", "United States"]
  };

  var REGIONS = [
    ["12345", "North America"],
    ["67", "Oceania"],
    ["89", "South America"],
    ["ABCDEFGH", "Africa"],
    ["JKLMNPR", "Asia"],
    ["STUVWXYZ", "Europe"]
  ];

  var YEAR_CODES = {
    A: 1980, B: 1981, C: 1982, D: 1983, E: 1984, F: 1985, G: 1986, H: 1987,
    J: 1988, K: 1989, L: 1990, M: 1991, N: 1992, P: 1993, R: 1994, S: 1995,
    T: 1996, V: 1997, W: 1998, X: 1999, Y: 2000,
    "1": 2001, "2": 2002, "3": 2003, "4": 2004, "5": 2005, "6": 2006,
    "7": 2007, "8": 2008, "9": 2009
  };

  function regionOf(vin) {
    var first = vin.charAt(0);
    for (var i = 0; i < REGIONS.length; i += 1) {
      if (REGIONS[i][0].indexOf(first) !== -1) { return REGIONS[i][1]; }
    }
    return "Unknown";
  }

  /* Model year codes repeat every 30 years; take the instance closest to today. */
  function yearFromCode(code) {
    var base = YEAR_CODES[code];
    if (!base) { return ""; }
    var now = new Date().getFullYear();
    var candidate = base;
    while (candidate + 30 <= now + 1) { candidate += 30; }
    return String(candidate);
  }

  /* North American check digit (transportation letters, weights, mod 11). */
  function checkDigit(vin) {
    var translit = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4,
                     N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
    var weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    var sum = 0;

    for (var i = 0; i < 17; i += 1) {
      var ch = vin.charAt(i);
      var value = /[0-9]/.test(ch) ? Number(ch) : translit[ch];
      if (value === undefined) { return null; }
      sum += value * weights[i];
    }

    var remainder = sum % 11;
    return remainder === 10 ? "X" : String(remainder);
  }

  function structuralDecode(vin) {
    var wmi = vin.slice(0, 3);
    var known = WMI[wmi] || null;
    var region = regionOf(vin);
    var year = yearFromCode(vin.charAt(9));

    var expected = checkDigit(vin);
    var actual = vin.charAt(8);
    var check = "not used in this region";

    if (region === "North America" && expected !== null) {
      check = expected === actual.toUpperCase() ? "valid (" + actual + ")" : "mismatch (expected " + expected + ")";
    }

    return {
      wmi: wmi,
      make: known ? known[0] : "",
      origin: known ? known[1] : "",
      region: region,
      year: year,
      plant: vin.charAt(10),
      serial: vin.slice(11),
      check: check,
      known: Boolean(known)
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function validate(vin) {
    if (!vin) { return "Enter a VIN to continue."; }
    if (vin.length !== 17) { return "A VIN is exactly 17 characters (" + vin.length + " entered)."; }
    if (/[IOQ]/.test(vin)) { return "VINs never contain the letters I, O or Q."; }
    if (!/^[A-HJ-NPR-Z0-9]+$/.test(vin)) { return "Use letters and digits only."; }
    return null;
  }

  function clean(value) {
    var text = String(value == null ? "" : value).trim();
    if (!text) { return ""; }
    if (/^not applicable$/i.test(text)) { return ""; }
    if (/^0(\.0+)?$/.test(text)) { return ""; }
    if (/^null$/i.test(text)) { return ""; }
    return text;
  }

  var NOTE_KEEP = { "Error Code": true, "Error Text": true, "Additional Error Text": true };

  function extract(payload) {
    var fields = {};
    var notes = {};
    var results = (payload && payload.Results) || [];

    results.forEach(function (row) {
      var name = row.Variable;
      if (!name) { return; }
      var raw = String(row.Value == null ? "" : row.Value).trim();

      if (name === "Error Code") {
        notes.errorCode = raw;
        notes.codes = String(raw || "").split(",").map(function (part) {
          return part.trim();
        }).filter(Boolean);
      }      if (name === "Error Text") { notes.errorText = raw; }
      if (name === "Additional Error Text") { notes.additional = raw; }

      if (NOTE_KEEP[name]) {
        if (raw) { fields[name] = raw; }
        return;
      }

      var value = clean(raw);
      if (value && !fields[name]) { fields[name] = value; }
    });

    return { fields: fields, notes: notes };
  }

  function getRecent() {
    try {
      var raw = window.localStorage.getItem(RECENT_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function addRecent(vin, label) {
    var list = getRecent().filter(function (item) { return item.vin !== vin; });
    list.unshift({ vin: vin, label: label || "" });
    list = list.slice(0, MAX_RECENT);
    try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (err) { /* ignore */ }
    return list;
  }

  function countFields() {
    return SECTIONS.reduce(function (total, section) { return total + section.fields.length; }, 0);
  }

  function renderRecent(host, onPick) {
    if (!host) { return; }
    var list = getRecent();
    host.innerHTML = "";
    if (!list.length) { return; }

    var label = document.createElement("span");
    label.className = "dna-key";
    label.textContent = "Recent";
    host.appendChild(label);

    list.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = item.vin;
      button.title = item.label || item.vin;
      button.addEventListener("click", function () { onPick(item.vin); });
      host.appendChild(button);
    });
  }

  function init() {
    var form = document.getElementById("vin-form");
    if (!form) { return; }

    var input = document.getElementById("vin");
    var hint = document.getElementById("vin-hint");
    var result = document.getElementById("vin-result");
    var recentHost = document.getElementById("recent");
    var submit = form.querySelector('button[type="submit"]');
    var defaultHint = hint ? hint.textContent : "";

    function setHint(message, isError) {
      if (!hint) { return; }
      hint.textContent = message || defaultHint;
      hint.classList.toggle("vin-hint--error", Boolean(isError));
    }

    function showError(message) {
      if (!result) { return; }
      result.hidden = false;
      result.innerHTML = '<div class="dna"><p class="dna-empty">' +
        escapeHtml(message) + "</p></div>";
    }

    function rowsHtml(pairs, fields) {
      return pairs.map(function (pair) {
        var value = fields[pair[1]] || "";
        return '<div class="dna-row' + (value ? "" : " is-empty") + '">' +
          '<div class="dna-key">' + escapeHtml(pair[0]) + "</div>" +
          '<div class="dna-val">' + (value ? escapeHtml(value) : "—") + "</div>" +
        "</div>";
      }).join("");
    }

    if (result) {
      result.addEventListener("click", function (event) {
        var button = event.target.closest ? event.target.closest("[data-save]") : null;
        if (!button || !window.CarDNAGarage) { return; }

        window.CarDNAGarage.save({
          vin: button.getAttribute("data-save"),
          year: button.getAttribute("data-year") || "",
          make: button.getAttribute("data-make") || "",
          model: button.getAttribute("data-model") || ""
        });

        button.textContent = "Saved ✓";
        button.disabled = true;
      });
    }

    function render(vin, fields, notes, structural) {
      if (!result) { return; }

      var filled = 0;
      var total = countFields();
      var sectionsHtml = "";

      SECTIONS.forEach(function (section) {
        var sectionFilled = 0;
        section.fields.forEach(function (pair) {
          if (fields[pair[1]]) { filled += 1; sectionFilled += 1; }
        });

        sectionsHtml += '<section class="dna-section">' +
          "<header><h4>" + escapeHtml(section.title) + "</h4>" +
          "<span>" + sectionFilled + "/" + section.fields.length + "</span></header>" +
          '<div class="dna-rows">' + rowsHtml(section.fields, fields) + "</div>" +
        "</section>";
      });

      var make = fields["Make"] || "";
      var model = fields["Model"] || "";
      var year = fields["Model Year"] || "";
      var title = [year, make, model].filter(Boolean).join(" ");

      /* vPIC error codes, classified:
         0  = clean                       -> nothing to show
         5  = errors in a few positions   -> partial decode, not a failure
         14 = cannot resolve some chars   -> partial decode
         7  = manufacturer not registered for US sale -> non-US vehicle
         1  = check digit wrong, 400 = invalid characters, others -> real fault */
      var codes = (notes && notes.codes) || [];
      var SOFT = { "0": true, "5": true, "7": true, "14": true };

      var failed = codes.some(function (code) { return !SOFT[code]; });
      var nonUS = !failed && codes.indexOf("7") !== -1;
      var partial = !failed && !nonUS && (codes.indexOf("5") !== -1 || codes.indexOf("14") !== -1);

      var structuralHtml = "";
      if (structural) {
        var structuralFields = {
          "wmi": structural.wmi,
          "make": structural.make || "not in the WMI table",
          "origin": structural.origin || "—",
          "region": structural.region,
          "year": structural.year || "—",
          "plant": structural.plant,
          "serial": structural.serial,
          "check": structural.check
        };
        var structuralPairs = [
          ["WMI (positions 1–3)", "wmi"],
          ["Manufacturer (WMI)", "make"],
          ["Country of origin", "origin"],
          ["Market / region", "region"],
          ["Model year (position 10)", "year"],
          ["Plant code (position 11)", "plant"],
          ["Serial (positions 12–17)", "serial"],
          ["Check digit (position 9)", "check"]
        ];
        structuralHtml = '<section class="dna-section dna-section--structural">' +
          "<header><h4>Structural decode · WMI</h4><span>" +
            escapeHtml(structural.region) + "</span></header>" +
          '<div class="dna-rows">' + rowsHtml(structuralPairs, structuralFields) + "</div>" +
        "</section>";
      }

      var banner = "";
      if (failed) {
        banner = '<div class="decode-warning"><strong>vPIC could not fully decode this VIN.</strong> ' +
          escapeHtml(notes.errorText || "No error text returned.") +
          (notes.additional ? " " + escapeHtml(notes.additional) : "") +
        "</div>";
      } else if (nonUS) {
        banner = '<div class="decode-info"><strong>Not a US-market vehicle.</strong> ' +
          "NHTSA's register holds no data for this manufacturer, so the fields below come from the " +
          "structural decode and are limited to what the VIN itself encodes." +
        "</div>";
      } else if (partial) {
        banner = '<div class="decode-info"><strong>Partial decode.</strong> ' +
          "vPIC resolved the vehicle but could not map every VIN position — typically unused " +
          "positions on European VINs. The data below is genuine, just incomplete." +
        "</div>";
      }

      var saved = Boolean(window.CarDNAGarage && window.CarDNAGarage.has(vin));

      result.hidden = false;
      result.innerHTML =
        '<div class="dna">' +
          '<div class="dna-head">' +
            '<span class="dna-vin">' + escapeHtml(vin) + "</span>" +
            '<span class="dna-status">' + escapeHtml(title || "Decoded") +
              " · " + filled + " of " + total + " fields filed</span>" +
          "</div>" +
          banner +
          structuralHtml +
          sectionsHtml +
          '<section class="dna-section dna-section--notes">' +
            "<header><h4>vPIC decode notes</h4><span>" +
              (failed ? "incomplete" : nonUS ? "non-US" : partial ? "partial" : "ok") +
            "</span></header>" +
            '<div class="dna-rows">' +
              rowsHtml(NOTE_FIELDS, fields) +
            "</div>" +
          "</section>" +
          '<div class="recent" style="margin-top:16px">' +
            '<button type="button" data-copy="' + escapeHtml(vin) + '">Copy VIN</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-save="' +
              escapeHtml(vin) + '" data-year="' + escapeHtml(fields["Model Year"] || "") +
              '" data-make="' + escapeHtml(fields["Make"] || "") +
              '" data-model="' + escapeHtml(fields["Model"] || "") + '">' +
              (saved ? "Saved \u2713" : "Save to garage") +
            "</button>" +
          "</div>" +
        "</div>";
    }

    async function decode(rawVin, updateUrl) {
      var vin = rawVin.trim().toUpperCase();
      var problem = validate(vin);
      if (problem) {
        setHint(problem, true);
        input.focus();
        return;
      }

      setHint("Reading the vehicle record…", false);
      if (submit) { submit.disabled = true; }
      if (result) {
        result.hidden = false;
        result.innerHTML = '<div class="dna"><p class="dna-empty"><span class="spinner"></span> ' +
          "Decoding " + escapeHtml(vin) + "…</p></div>";
      }

      try {
        var response = await fetch(ENDPOINT + encodeURIComponent(vin) + "?format=json");
        if (!response.ok) { throw new Error("HTTP " + response.status); }
        var payload = await response.json();
        var parsed = extract(payload);
        var fields = parsed.fields;
        var notes = parsed.notes || {};

        var structural = structuralDecode(vin);
        if (!fields["Make"] && structural.make) { fields["Make"] = structural.make; }
        if (!fields["Model Year"] && structural.year) { fields["Model Year"] = structural.year; }

        if (!Object.keys(fields).length && !structural.known) {
          showError("No record for this VIN. It may be a non-US vehicle or not yet filed with NHTSA.");
          setHint("vPIC has no record and the WMI is not recognised.", true);
          return;
        }

        notes.fields = fields;

        var label = [fields["Model Year"], fields["Make"], fields["Model"]]
          .filter(Boolean).join(" ");

        addRecent(vin, label);
        render(vin, fields, notes, structural);

        if (window.CarDNAAuth && window.CarDNAAuth.log) {
          window.CarDNAAuth.log("decode", { vin: vin, fields: Object.keys(fields).length });
        }
        renderRecent(recentHost, function (picked) {
          input.value = picked;
          decode(picked, true);
        });

        if (updateUrl !== false && window.history.replaceState) {
          var url = new URL(window.location.href);
          url.searchParams.set("vin", vin);
          window.history.replaceState({}, "", url);
        }

        var codes = (notes && notes.codes) || [];
        var SOFT_CODES = { "0": true, "5": true, "7": true, "14": true };
        var hasFault = codes.some(function (code) { return !SOFT_CODES[code]; });
        var isNonUS = !hasFault && codes.indexOf("7") !== -1;
        var isPartial = !hasFault && !isNonUS &&
          (codes.indexOf("5") !== -1 || codes.indexOf("14") !== -1);

        if (hasFault) {
          setHint("Decoded with warnings — vPIC reports an invalid VIN, structural data filled in.", true);
        } else if (isNonUS) {
          setHint("Non-US vehicle — vPIC has no record; showing the structural decode.", false);
        } else if (isPartial) {
          setHint("Partial vPIC decode — some VIN positions could not be mapped.", false);
        } else if (!fields["Model"] && structural.make) {
          setHint("US register has no model data — showing the structural decode.", true);
        } else {
          setHint("Decoded from NHTSA vPIC + structural decode — full field set, free.", false);
        }
      } catch (err) {
        if (window.console && window.console.error) {
          window.console.error("[CarDNA] decode failed", err);
        }
        var detail = err && err.message ? err.message : String(err);
        showError("Decode failed: " + detail);
        setHint("Lookup failed — " + detail, true);
      } finally {
        if (submit) { submit.disabled = false; }
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      decode(input.value, true);
    });

    input.addEventListener("input", function () {
      if (hint && hint.classList.contains("vin-hint--error")) { setHint("", false); }
    });

    renderRecent(recentHost, function (picked) {
      input.value = picked;
      decode(picked, true);
    });

    var requested = new URLSearchParams(window.location.search).get("vin");
    if (requested) {
      input.value = requested.toUpperCase();
      decode(requested, false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
