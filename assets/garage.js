/* CarDNA — garage: saved vehicles, selection and full-record export. */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var host = document.getElementById("garage-list");
    if (!host) { return; }

    var statusEl = document.getElementById("garage-export-status");
    var selectAllEl = document.getElementById("garage-select-all");
    var menuEl = document.getElementById("garage-download");
    var selected = Object.create(null);
    var busy = false;

    function items() {
      return window.CarDNAGarage ? window.CarDNAGarage.list() : [];
    }

    function status(text, tone) {
      if (!statusEl) { return; }
      statusEl.textContent = text || "";
      if (tone) { statusEl.setAttribute("data-tone", tone); }
      else { statusEl.removeAttribute("data-tone"); }
    }

    /* No tick means "everything": one car, or all of them, is one click either way. */
    function chosen() {
      var all = items();
      var picked = all.filter(function (item) { return selected[item.vin]; });
      return picked.length ? picked : all;
    }

    /* ------------------------------------------------------------------ rows */

    function row(item) {
      var wrap = document.createElement("div");
      wrap.className = "garage-item" + (selected[item.vin] ? " is-selected" : "");

      var check = document.createElement("label");
      check.className = "garage-check";
      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = Boolean(selected[item.vin]);
      box.setAttribute("aria-label", "Select " + item.vin);
      box.addEventListener("change", function () {
        if (box.checked) { selected[item.vin] = true; }
        else { delete selected[item.vin]; }
        wrap.classList.toggle("is-selected", box.checked);
        syncSelectAll();
      });
      check.appendChild(box);
      wrap.appendChild(check);

      var left = document.createElement("div");
      left.className = "garage-main";

      var title = document.createElement("strong");
      title.textContent = [item.year, item.make, item.model].filter(Boolean).join(" ") || item.vin;
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
        delete selected[item.vin];
        render();
      });
      right.appendChild(del);

      wrap.appendChild(left);
      wrap.appendChild(right);
      return wrap;
    }

    function syncSelectAll() {
      if (!selectAllEl) { return; }
      var all = items();
      var count = all.filter(function (item) { return selected[item.vin]; }).length;
      selectAllEl.checked = all.length > 0 && count === all.length;
      selectAllEl.indeterminate = count > 0 && count < all.length;
    }

    function render() {
      var list = items();
      var countEl = document.getElementById("garage-count");
      var picked = list.filter(function (item) { return selected[item.vin]; }).length;

      if (countEl) {
        countEl.textContent = list.length
          ? list.length + (list.length === 1 ? " vehicle" : " vehicles") +
            (picked ? " · " + picked + " selected" : "")
          : "empty";
      }

      host.innerHTML = "";
      if (!list.length) {
        var empty = document.createElement("div");
        empty.className = "notice";
        empty.innerHTML = "<strong>Nothing saved yet.</strong> Decode a VIN and press " +
          "“Save to garage” — it is kept in this browser, never on a server.";
        host.appendChild(empty);
        syncSelectAll();
        return;
      }

      list.forEach(function (item) { host.appendChild(row(item)); });
      syncSelectAll();
    }

    /* ------------------------------------------------------------------ export */

    async function runExport(format) {
      if (busy) { return; }
      if (!window.CarDNAExport) { status("The export module did not load.", "error"); return; }

      var vehicles = chosen();
      if (!vehicles.length) { status("Nothing saved to export yet.", "error"); return; }

      busy = true;
      status("Decoding " + vehicles.length + (vehicles.length === 1 ? " vehicle" : " vehicles") + "…", "");

      try {
        var fieldsByVin = await window.CarDNAExport.prepare(vehicles, function (done, total, vehicle) {
          status(vehicle
            ? "Decoding " + vehicle.vin + " (" + (done + 1) + " of " + total + ")…"
            : "Building the file…", "");
        });

        window.CarDNAExport.save(format, vehicles, fieldsByVin);
        status(vehicles.length + (vehicles.length === 1 ? " vehicle" : " vehicles") +
          " exported as " + format.toUpperCase() +
          (format === "pdf" ? " — choose “Save as PDF” in the print dialog." : "."), "ok");
      } catch (err) {
        status(err.message || "The export did not finish.", "error");
      } finally {
        busy = false;
      }
    }

    /* ------------------------------------------------------------------ wiring */

    if (selectAllEl) {
      selectAllEl.addEventListener("change", function () {
        var list = items();
        selected = Object.create(null);
        if (selectAllEl.checked) {
          list.forEach(function (item) { selected[item.vin] = true; });
        }
        render();
      });
    }

    if (menuEl) {
      menuEl.addEventListener("click", function (event) {
        var button = event.target.closest ? event.target.closest("[data-download]") : null;
        if (!button) { return; }
        event.preventDefault();
        menuEl.open = false;
        runExport(button.getAttribute("data-download"));
      });
    }

    var clearBtn = document.getElementById("garage-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (window.confirm("Remove every saved vehicle from this browser?")) {
          window.CarDNAGarage.clear();
          selected = Object.create(null);
          render();
          status("Garage cleared.", "");
        }
      });
    }

    render();
  });
})();
