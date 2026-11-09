/* CarDNA — garage: saved vehicles, stored only in this browser. */
(function () {
  "use strict";

  var KEY = "cardna.garage";
  var MAX = 24;

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function write(list) {
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch (err) { /* ignore */ }
  }

  function list() { return read(); }

  function has(vin) {
    return read().some(function (item) { return item.vin === vin; });
  }

  function save(entry) {
    var items = read().filter(function (item) { return item.vin !== entry.vin; });
    items.unshift({
      vin: entry.vin,
      year: entry.year || "",
      make: entry.make || "",
      model: entry.model || "",
      label: entry.label || "",
      savedAt: new Date().toISOString()
    });
    write(items.slice(0, MAX));
    return items.length;
  }

  function remove(vin) {
    var items = read().filter(function (item) { return item.vin !== vin; });
    write(items);
    return items.length;
  }

  function clear() { write([]); }

  window.CarDNAGarage = {
    list: list,
    has: has,
    save: save,
    remove: remove,
    clear: clear,
    count: function () { return read().length; }
  };

  /* ------------------------------------------------------------ garage page */
  document.addEventListener("DOMContentLoaded", function () {
    var host = document.getElementById("garage-list");
    if (!host) { return; }

    function row(item) {
      var wrap = document.createElement("div");
      wrap.className = "garage-item";

      var left = document.createElement("div");
      left.className = "garage-main";

      var title = document.createElement("strong");
      title.textContent = [item.year, item.make, item.model].filter(Boolean).join(" ") ||
        item.vin;
      left.appendChild(title);

      var meta = document.createElement("span");
      meta.className = "garage-meta";
      meta.textContent = item.vin;
      left.appendChild(meta);

      var right = document.createElement("div");
      right.className = "garage-actions";

      var open = document.createElement("a");
      open.className = "btn btn--ghost btn--sm";
      open.href = "decode.html?vin=" + encodeURIComponent(item.vin);
      open.textContent = "Open";
      right.appendChild(open);

      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn--ghost btn--sm";
      del.textContent = "Remove";
      del.addEventListener("click", function () {
        window.CarDNAGarage.remove(item.vin);
        render();
      });
      right.appendChild(del);

      wrap.appendChild(left);
      wrap.appendChild(right);
      return wrap;
    }

    function render() {
      var items = window.CarDNAGarage.list();
      var countEl = document.getElementById("garage-count");
      if (countEl) {
        countEl.textContent = items.length
          ? items.length + (items.length === 1 ? " vehicle" : " vehicles")
          : "empty";
      }

      host.innerHTML = "";
      if (!items.length) {
        var empty = document.createElement("div");
        empty.className = "notice";
        empty.innerHTML = "<strong>Nothing saved yet.</strong> Decode a VIN and press " +
          "“Save to garage” — it is kept in this browser, never on a server.";
        host.appendChild(empty);
        return;
      }

      items.forEach(function (item) { host.appendChild(row(item)); });
    }

    var clearBtn = document.getElementById("garage-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (window.confirm("Remove every saved vehicle from this browser?")) {
          window.CarDNAGarage.clear();
          render();
        }
      });
    }

    render();
  });
})();
