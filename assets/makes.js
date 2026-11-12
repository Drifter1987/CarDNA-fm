/* CarDNA — static car brands and models, with generation + engine enrichment.
   Sources: VehiclesDB (CC BY 4.0) for makes/models · gor3a/vehicle-makes-models (ODbL) for
   generations and engine variants. Both credits are required and appear in the footer. */

(function () {
  "use strict";

  var DATA_PATH = "data/vehicles.csv";
  var META_PATH = "data/catalog_car_makes.json";
  var PARENT_PATH = "data/brands.json";
  var ENGINES_PATH = "data/engines.csv";

  var DISPLAY = {
    "delorean": "DeLorean",
    "vinfast": "VinFast",
    "nio": "NIO",
    "mg": "MG",
    "byd": "BYD",
    "gac": "GAC",
    "tvr": "TVR"
  };

  var ISO = {
    "ar": "Argentina", "at": "Austria", "au": "Australia", "be": "Belgium",
    "bg": "Bulgaria", "br": "Brazil", "ca": "Canada", "ch": "Switzerland",
    "cl": "Chile", "cn": "China", "co": "Colombia", "cz": "Czechia",
    "de": "Germany", "dk": "Denmark", "ee": "Estonia", "eg": "Egypt",
    "es": "Spain", "fi": "Finland", "fr": "France", "gb": "United Kingdom",
    "gr": "Greece", "hr": "Croatia", "hu": "Hungary", "id": "Indonesia",
    "ie": "Ireland", "il": "Israel", "in": "India", "ir": "Iran",
    "is": "Iceland", "it": "Italy", "jp": "Japan", "kr": "South Korea",
    "lt": "Lithuania", "lu": "Luxembourg", "lv": "Latvia", "ma": "Morocco",
    "mx": "Mexico", "my": "Malaysia", "nl": "Netherlands", "no": "Norway",
    "nz": "New Zealand", "pe": "Peru", "ph": "Philippines", "pl": "Poland",
    "pt": "Portugal", "ro": "Romania", "rs": "Serbia", "ru": "Russia",
    "se": "Sweden", "sg": "Singapore", "si": "Slovenia", "sk": "Slovakia",
    "th": "Thailand", "tr": "Turkey", "tw": "Taiwan", "ua": "Ukraine",
    "us": "United States", "uy": "Uruguay", "vn": "Vietnam", "za": "South Africa"
  };

  function normalise(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function displayName(name) {
    return DISPLAY[normalise(name)] || name;
  }

  /* RFC 4180-ish parser: quotes, escaped quotes, CRLF, BOM. */
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 1; }
          else { inQuotes = false; }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch !== "\r") {
        field += ch;
      }
    }

    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function init() {
    var host = document.getElementById("brand-groups");
    if (!host) { return; }

    var searchEl = document.getElementById("brand-search");
    var metaEl = document.getElementById("results-meta");
    var brands = [];
    var timer = null;

    /* ---------------------------------------------------------- engines layer */
    var enginesIndex = null;
    var enginesPromise = null;

    function ensureEngines() {
      if (enginesPromise) { return enginesPromise; }
      enginesPromise = fetch(ENGINES_PATH)
        .then(function (response) {
          if (!response.ok) { throw new Error("HTTP " + response.status); }
          return response.text();
        })
        .then(function (text) {
          var table = parseCSV(text);
          table.shift();
          var index = new Map();

          table.forEach(function (cells) {
            var makeKey = normalise(cells[1]);
            var modelKey = normalise(cells[2]);
            if (!makeKey || !modelKey) { return; }

            var key = makeKey + "|" + modelKey;
            if (!index.has(key)) { index.set(key, []); }
            index.get(key).push({
              generation: cells[3] || "",
              yearStart: cells[4] || "",
              yearEnd: cells[5] || "",
              body: cells[6] || "",
              label: cells[7] || "",
              fuel: cells[8] || "",
              cc: cells[10] || "",
              hp: cells[11] || "",
              torque: cells[12] || "",
              trans: cells[13] || "",
              drive: cells[14] || "",
              accel: cells[15] || "",
              top: cells[16] || ""
            });
          });

          enginesIndex = index;
          return index;
        })
        .catch(function () {
          enginesIndex = new Map();
          return enginesIndex;
        });

      return enginesPromise;
    }

    function enginesFor(brand, model) {
      if (!enginesIndex) { return null; }
      var key = normalise(brand.name) + "|" + normalise(model);
      return enginesIndex.get(key) || null;
    }

    /* ------------------------------------------------------------- model detail */
    function renderModelDetail(container, brand, model) {
      var rows = enginesFor(brand, model);
      container.innerHTML = "";

      if (!rows || !rows.length) {
        var none = document.createElement("p");
        none.className = "dna-empty";
        none.textContent = "No generation data for " + model + ".";
        container.appendChild(none);
        return;
      }

      var byGeneration = new Map();
      rows.forEach(function (row) {
        var name = row.generation || "Unknown generation";
        if (!byGeneration.has(name)) { byGeneration.set(name, []); }
        byGeneration.get(name).push(row);
      });

      var entries = Array.from(byGeneration.entries());
      entries.sort(function (a, b) {
        return Number(b[1][0].yearStart || 0) - Number(a[1][0].yearStart || 0);
      });

      var head = document.createElement("p");
      head.className = "model-detail-head";
      head.textContent = model + " — " + entries.length +
        (entries.length === 1 ? " generation" : " generations") + " · " +
        rows.length + (rows.length === 1 ? " engine variant" : " engine variants");
      container.appendChild(head);

      entries.forEach(function (entry) {
        var name = entry[0];
        var list = entry[1];

        var block = document.createElement("div");
        block.className = "generation";

        var title = document.createElement("div");
        title.className = "gen-title";
        var strong = document.createElement("strong");
        strong.textContent = name;
        title.appendChild(strong);

        var years = document.createElement("span");
        years.textContent = [list[0].yearStart, list[0].yearEnd].filter(Boolean).join("–") ||
          "years unknown";
        title.appendChild(years);

        if (list[0].body) {
          var body = document.createElement("span");
          body.textContent = list[0].body;
          title.appendChild(body);
        }

        block.appendChild(title);

        var ul = document.createElement("ul");
        ul.className = "engine-list";

        list.forEach(function (row) {
          var li = document.createElement("li");
          var label = document.createElement("span");
          label.textContent = row.label || "Engine";
          li.appendChild(label);

          var specs = [];
          if (row.hp) { specs.push(row.hp + " hp"); }
          if (row.torque) { specs.push(row.torque + " Nm"); }
          if (row.cc) { specs.push(row.cc + " cc"); }
          if (row.drive) { specs.push(row.drive); }
          if (row.accel) { specs.push("0–100 " + row.accel + "s"); }
          if (row.top) { specs.push(row.top + " km/h"); }

          if (specs.length) {
            var meta = document.createElement("small");
            meta.textContent = specs.join(" · ");
            li.appendChild(meta);
          }
          ul.appendChild(li);
        });

        block.appendChild(ul);
        container.appendChild(block);
      });
    }

    /* ------------------------------------------------------------------ models */
    function renderModels(container, countEl, brand) {
      container.innerHTML = "";
      if (countEl) { countEl.textContent = String(brand.models.length); }

      if (!brand.models.length) {
        var none = document.createElement("p");
        none.className = "dna-empty";
        none.textContent = "No models on record for this make.";
        container.appendChild(none);
        return;
      }

      var chips = document.createElement("div");
      chips.className = "chips";

      var detail = document.createElement("div");
      detail.className = "model-detail";
      detail.hidden = true;

      brand.models.forEach(function (model) {
        var rows = enginesFor(brand, model);
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip model-chip" + (rows && rows.length ? " has-data" : "");
        chip.textContent = model;

        if (rows && rows.length) {
          var badge = document.createElement("b");
          badge.textContent = String(rows.length);
          chip.appendChild(badge);
        }

        chip.addEventListener("click", function () {
          Array.prototype.forEach.call(
            chips.querySelectorAll(".model-chip"),
            function (other) { other.classList.toggle("is-active", other === chip); }
          );
          detail.hidden = false;
          renderModelDetail(detail, brand, model);
        });

        chips.appendChild(chip);
      });

      container.appendChild(chips);
      container.appendChild(detail);
    }

    /* ------------------------------------------------------------------ brands */
    function countryFromCodes(codes) {
      for (var i = 0; i < codes.length; i += 1) {
        var name = ISO[String(codes[i]).toLowerCase()];
        if (name) { return name; }
      }
      return "Other";
    }

    function build(rows, meta, overlay) {
      var countryByBrand = {};
      var parentByKey = {};
      (overlay || []).forEach(function (entry) {
        var key = normalise(entry.name);
        if (entry.country) { countryByBrand[key] = entry.country; }
        if (entry.parent) { parentByKey[key] = entry.parent; }
      });

      var bySlug = new Map();
      var seenModels = {};

      rows.forEach(function (row) {
        if ((row.kind || "").toLowerCase() !== "car") { return; }

        var slug = row.make_slug;
        if (!slug) { return; }

        var key = normalise(row.make_name || slug);
        var brand = bySlug.get(slug);

        if (!brand) {
          brand = {
            name: displayName(row.make_name || slug),
            slug: slug,
            country: countryByBrand[key] ||
              countryFromCodes(String(row.countries || "").split("|")),
            parent: parentByKey[key] || "",
            models: []
          };
          bySlug.set(slug, brand);
          seenModels[slug] = {};
        }

        var model = row.model_name;
        if (model && !seenModels[slug][model]) {
          seenModels[slug][model] = true;
          brand.models.push(model);
        }
      });

      var out = Array.from(bySlug.values());
      out.forEach(function (brand) { brand.models.sort(); });

      var present = {};
      out.forEach(function (brand) { present[normalise(brand.name)] = true; });

      (meta || []).forEach(function (entry) {
        if (!entry.models || !entry.models.length) { return; }
        var key = normalise(entry.name);
        if (present[key]) { return; }
        present[key] = true;
        out.push({
          name: displayName(entry.name),
          slug: entry.slug || key,
          country: countryByBrand[key] || countryFromCodes(entry.countries || []),
          parent: parentByKey[key] || "",
          models: entry.models.slice().sort()
        });
      });

      return out;
    }

    function groupByCountry(list) {
      var groups = new Map();
      list.forEach(function (brand) {
        if (!groups.has(brand.country)) { groups.set(brand.country, []); }
        groups.get(brand.country).push(brand);
      });

      var ordered = Array.from(groups.entries());
      ordered.sort(function (a, b) {
        if (b[1].length !== a[1].length) { return b[1].length - a[1].length; }
        return a[0].localeCompare(b[0]);
      });
      ordered.forEach(function (entry) {
        entry[1].sort(function (a, b) { return a.name.localeCompare(b.name); });
      });
      return ordered;
    }

    function buildBrand(brand) {
      var item = document.createElement("div");
      item.className = "brand-item";

      var row = document.createElement("button");
      row.type = "button";
      row.className = "brand-row";
      row.setAttribute("aria-expanded", "false");

      var name = document.createElement("span");
      name.className = "name";
      name.textContent = brand.name;
      row.appendChild(name);

      if (brand.parent) {
        var parent = document.createElement("span");
        parent.className = "parent";
        parent.textContent = brand.parent;
        row.appendChild(parent);
      }

      var spacer = document.createElement("span");
      spacer.className = "spacer";

      var count = document.createElement("span");
      count.className = "count";
      count.textContent = brand.models.length + (brand.models.length === 1 ? " model" : " models");

      var chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chevron.setAttribute("viewBox", "0 0 24 24");
      chevron.setAttribute("fill", "none");
      chevron.setAttribute("stroke", "currentColor");
      chevron.setAttribute("stroke-width", "2");
      chevron.setAttribute("aria-hidden", "true");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M9 6l6 6-6 6");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      chevron.appendChild(path);

      row.appendChild(spacer);
      row.appendChild(count);
      row.appendChild(chevron);

      var panel = document.createElement("div");
      panel.className = "brand-models";
      panel.hidden = true;

      row.addEventListener("click", function () {
        var open = row.getAttribute("aria-expanded") === "true";
        row.setAttribute("aria-expanded", open ? "false" : "true");
        panel.hidden = open;

        if (!open) {
          renderModels(panel, count, brand);
          if (!enginesIndex) {
            var pending = document.createElement("p");
            pending.className = "dna-empty";
            pending.textContent = "Loading generations and engines…";
            panel.appendChild(pending);
          }
          ensureEngines().then(function () {
            if (row.getAttribute("aria-expanded") === "true") {
              renderModels(panel, count, brand);
            }
          });
        }
      });

      item.appendChild(row);
      item.appendChild(panel);
      return item;
    }

    function render(list) {
      host.innerHTML = "";
      var groups = groupByCountry(list);

      if (!groups.length) {
        var empty = document.createElement("p");
        empty.className = "dna-empty";
        empty.textContent = "No brand matches that search.";
        host.appendChild(empty);
        if (metaEl) { metaEl.textContent = "0 brands"; }
        return;
      }

      groups.forEach(function (entry) {
        var country = entry[0];
        var items = entry[1];

        var section = document.createElement("section");
        section.className = "brand-group";

        var heading = document.createElement("h3");
        heading.appendChild(document.createTextNode(country));
        var count = document.createElement("span");
        count.textContent = items.length + (items.length === 1 ? " brand" : " brands");
        heading.appendChild(count);

        var listEl = document.createElement("div");
        listEl.className = "brand-list";
        items.forEach(function (brand) { listEl.appendChild(buildBrand(brand)); });

        section.appendChild(heading);
        section.appendChild(listEl);
        host.appendChild(section);
      });

      if (metaEl) {
        var models = list.reduce(function (total, brand) { return total + brand.models.length; }, 0);
        metaEl.textContent = list.length + " brands \u00b7 " + models.toLocaleString() +
          " models \u00b7 " + groups.length + (groups.length === 1 ? " country" : " countries");
      }
    }

    function filter(query) {
      var value = normalise(query);
      if (!value) { return brands; }
      return brands.filter(function (brand) {
        if (normalise(brand.name).indexOf(value) !== -1) { return true; }
        if (normalise(brand.country).indexOf(value) !== -1) { return true; }
        if (normalise(brand.parent).indexOf(value) !== -1) { return true; }
        return brand.models.some(function (model) {
          return normalise(model).indexOf(value) !== -1;
        });
      });
    }

    async function load() {
      if (metaEl) { metaEl.textContent = "Loading the car index…"; }
      try {
        var responses = await Promise.all([
          fetch(DATA_PATH),
          fetch(META_PATH).catch(function () { return null; }),
          fetch(PARENT_PATH).catch(function () { return null; })
        ]);

        if (!responses[0].ok) { throw new Error("HTTP " + responses[0].status); }

        var text = await responses[0].text();
        if (text.charCodeAt(0) === 0xfeff) { text = text.slice(1); }

        var table = parseCSV(text);
        var header = table.shift() || [];
        var index = {};
        header.forEach(function (name, position) { index[name.trim()] = position; });

        var rows = table.map(function (cells) {
          return {
            kind: cells[index.kind],
            make_slug: cells[index.make_slug],
            make_name: cells[index.make_name],
            model_name: cells[index.model_name],
            countries: cells[index.countries]
          };
        });

        var meta = responses[1] && responses[1].ok ? await responses[1].json() : [];
        var overlay = responses[2] && responses[2].ok ? await responses[2].json() : [];

        brands = build(rows, meta, overlay);

        var fromQuery = new URLSearchParams(window.location.search).get("q");
        if (fromQuery && searchEl) { searchEl.value = fromQuery; }

        render(fromQuery ? filter(searchEl.value) : brands);
      } catch (err) {
        if (metaEl) { metaEl.textContent = ""; }
        var notice = document.createElement("div");
        notice.className = "notice";
        notice.innerHTML = "<strong>The car index could not load.</strong> " +
          "Browsers block local file reads — serve this folder over http " +
          "(<code>python -m http.server</code>) rather than opening the file directly.";
        host.appendChild(notice);
      }
    }

    if (searchEl) {
      searchEl.addEventListener("input", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { render(filter(searchEl.value)); }, 120);
      });
    }

    load();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
