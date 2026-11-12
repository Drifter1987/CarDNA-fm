/* CarDNA — garage.
   Two layers: localStorage is the always-available copy, and when a session exists the same
   rows are mirrored to public.vehicles so they follow the account across devices. Nothing is
   lost offline; the server copy wins on conflict, the local copy is uploaded if it is new. */

(function () {
  "use strict";

  var KEY = "cardna.garage";
  var MAX = 100;

  /* ------------------------------------------------------------------ local store */

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

  /* ------------------------------------------------------------------ server mirror */

  function config() { return window.CARDNA_SUPABASE || {}; }

  function session() {
    return window.CarDNAAuth && window.CarDNAAuth.state && window.CarDNAAuth.state.session;
  }

  function limits() {
    var a = window.CarDNAAuth;
    return a && a.limitsNow ? a.limitsNow() : null;
  }

  function planName() {
    var a = window.CarDNAAuth;
    return a && a.effectivePlan ? a.effectivePlan() : "free";
  }

  function serverReady() {
    var cfg = config();
    return Boolean(session() && cfg.url && cfg.key);
  }

  async function api(path, options) {
    var cfg = config();
    var opts = options || {};
    var s = session();

    var response = await fetch(String(cfg.url).replace(/\/+$/, "") + path, {
      method: opts.method || "GET",
      headers: {
        apikey: cfg.key,
        Authorization: "Bearer " + s.access_token,
        "Content-Type": "application/json",
        Prefer: opts.prefer || "return=minimal"
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
    });

    if (!response.ok) {
      var text = await response.text();
      throw new Error("Supabase " + response.status + ": " + (text || "request failed"));
    }
    if (opts.raw) { return response; }
    var body = await response.text();
    return body ? JSON.parse(body) : null;
  }

  function row(entry) {
    return {
      vin: entry.vin,
      model_year: entry.year || null,
      make: entry.make || null,
      model: entry.model || null,
      note: entry.label || null
    };
  }

  function push(entry) {
    if (!serverReady()) { return Promise.resolve(); }
    return api("/rest/v1/vehicles?on_conflict=user_id,vin", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: row(entry)
    }).catch(function () { /* offline or blocked: the local copy remains */ });
  }

  function drop(vin) {
    if (!serverReady()) { return Promise.resolve(); }
    return api("/rest/v1/vehicles?vin=eq." + encodeURIComponent(vin), { method: "DELETE" })
      .catch(function () { /* ignore */ });
  }

  /* Pull the account's rows, merge them over the local copy, and upload anything the
     server has never seen. Returns the merged list. */
  async function pull() {
    if (!serverReady()) { return read(); }

    var rows;
    try {
      rows = await api("/rest/v1/vehicles?select=vin,model_year,make,model,note,created_at" +
        "&order=created_at.desc&limit=" + MAX, { raw: false });
    } catch (err) {
      return read();
    }

    var local = read();
    var byVin = Object.create(null);
    var seen = Object.create(null);

    local.forEach(function (item) { byVin[item.vin] = item; });

    (rows || []).forEach(function (remote) {
      seen[remote.vin] = true;
      byVin[remote.vin] = {
        vin: remote.vin,
        year: remote.model_year || "",
        make: remote.make || "",
        model: remote.model || "",
        label: remote.note || "",
        savedAt: remote.created_at || ""
      };
    });

    var merged = Object.keys(byVin).map(function (vin) { return byVin[vin]; }).slice(0, MAX);
    write(merged);

    local.forEach(function (item) {
      if (!seen[item.vin]) { push(item); }
    });

    return merged;
  }

  window.CarDNAGarage = {
    list: read,
    has: function (vin) {
      return read().some(function (item) { return item.vin === vin; });
    },
    save: function (entry) {
      var current = read();
      var replacing = current.some(function (item) { return item.vin === entry.vin; });
      var lim = limits();

      /* The saved-vehicle count is the pricing page's, and it is a plan limit rather than a
         storage limit, so it is checked before anything is written. */
      if (lim && lim.vehicles && !replacing && current.length >= lim.vehicles) {
        return {
          ok: false,
          count: current.length,
          error: "The " + (window.CarDNAAuth ? window.CarDNAAuth.planLabel(planName()) : "current") +
            " plan keeps " + lim.vehicles + (lim.vehicles === 1 ? " saved vehicle" : " saved vehicles") +
            ". Remove one first, or move up a plan."
        };
      }

      var list = current.filter(function (item) { return item.vin !== entry.vin; });
      var record = {
        vin: entry.vin,
        year: entry.year || "",
        make: entry.make || "",
        model: entry.model || "",
        label: entry.label || "",
        savedAt: new Date().toISOString()
      };
      list.unshift(record);
      var capped = list.slice(0, MAX);
      write(capped);
      push(record);
      return { ok: true, count: capped.length };
    },
    remove: function (vin) {
      var list = read().filter(function (item) { return item.vin !== vin; });
      write(list);
      drop(vin);
      return list.length;
    },
    clear: function () {
      write([]);
      if (!serverReady()) { return; }
      api("/rest/v1/vehicles?user_id=eq." + encodeURIComponent(session().id),
        { method: "DELETE" }).catch(function () { /* ignore */ });
    },
    pull: pull,
    count: function () { return read().length; }
  };

  /* ------------------------------------------------------------------ garage page */

  document.addEventListener("DOMContentLoaded", function () {
    var host = document.getElementById("garage-list");
    if (!host) { return; }

    var statusEl = document.getElementById("garage-export-status");
    var selectAllEl = document.getElementById("garage-select-all");
    var menuEl = document.getElementById("garage-download");
    var selected = Object.create(null);
    var busy = false;
    var pulled = false;
    var lastRemoved = null;

    function items() { return window.CarDNAGarage.list(); }

    function status(text, tone) {
      if (!statusEl) { return; }
      statusEl.textContent = text || "";
      if (tone) { statusEl.setAttribute("data-tone", tone); }
      else { statusEl.removeAttribute("data-tone"); }
    }

    /* What this plan allows, next to what is actually saved. */
    function renderLimit(count) {
      var el = document.getElementById("garage-limit");
      if (!el) { return; }
      var a = window.CarDNAAuth;
      var lim = limits();
      if (!a || !lim) { el.textContent = ""; return; }
      el.textContent = a.planLabel(planName()) + " plan · " + count + " of " +
        (lim.vehicles ? lim.vehicles : "unlimited") + " saved vehicles";
    }

    /* Removing a car is one tap, so the last removal can be put back. */
    function renderUndo() {
      var host = document.getElementById("garage-undo-row");
      var text = document.getElementById("garage-undo-text");
      if (!host || !text) { return; }

      host.hidden = !lastRemoved;
      if (!lastRemoved) { return; }

      var name = [lastRemoved.year, lastRemoved.make, lastRemoved.model]
        .filter(Boolean).join(" ") || lastRemoved.vin;
      text.textContent = "Removed " + name + ". ";
    }

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
        lastRemoved = item;
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

      renderLimit(list.length);
      renderUndo();

      host.innerHTML = "";
      if (!list.length && serverReady() && !pulled) {
        var syncing = document.createElement("div");
        syncing.className = "notice";
        syncing.innerHTML = "<strong>Syncing your garage…</strong> Checking your account for saved vehicles.";
        host.appendChild(syncing);
        syncSelectAll();
        return;
      }
      if (!list.length) {
        var empty = document.createElement("div");
        empty.className = "notice";
        empty.innerHTML = "<strong>Nothing saved yet.</strong> Decode a VIN and press " +
          "“Save to garage” — it is mirrored to your account when you are signed in.";
        host.appendChild(empty);
        syncSelectAll();
        return;
      }

      list.forEach(function (item) { host.appendChild(row(item)); });
      syncSelectAll();
    }

    /* ------------------------------------------------------------------ export */

    /* An export format the plan does not include stays visible but disabled, with the plan
       that has it named on the row. */
    function applyExportLimits() {
      if (!menuEl) { return; }
      var a = window.CarDNAAuth;
      if (!a || !a.canExport) { return; }

      menuEl.querySelectorAll("[data-download]").forEach(function (button) {
        var format = button.getAttribute("data-download");
        var allowed = a.canExport(format);
        button.disabled = !allowed;
        button.classList.toggle("is-locked", !allowed);
        button.title = allowed ? "" : "Included from the " + a.planLabel(a.planNeededFor(format)) + " plan";

        if (!allowed && !button.querySelector("em")) {
          var tag = document.createElement("em");
          tag.className = "export-tag";
          tag.textContent = a.planLabel(a.planNeededFor(format)) + " plan";
          button.appendChild(tag);
        }
      });
    }

    async function runExport(format) {
      if (busy) { return; }
      if (!window.CarDNAExport) { status("The export module did not load.", "error"); return; }

      var a = window.CarDNAAuth;
      if (a && a.canExport && !a.canExport(format)) {
        status(a.planLabel(a.planNeededFor(format)) + " adds " + format.toUpperCase() +
          " export. Nothing was downloaded.", "error");
        return;
      }

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

        if (window.CarDNAAuth && window.CarDNAAuth.log) {
          window.CarDNAAuth.log("export", { format: format, count: vehicles.length });
        }

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
        if (window.confirm("Remove every saved vehicle from this browser and your account?")) {
          window.CarDNAGarage.clear();
          selected = Object.create(null);
          render();
          status("Garage cleared.", "");
        }
      });
    }

    render();

    var undoBtn = document.getElementById("garage-undo");
    if (undoBtn) {
      undoBtn.addEventListener("click", function () {
        if (!lastRemoved) { return; }
        var saved = window.CarDNAGarage.save(lastRemoved);
        if (saved && saved.ok === false) { status(saved.error, "error"); return; }
        lastRemoved = null;
        render();
        status("Restored.", "ok");
      });
    }

    var passwordForm = document.getElementById("password-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        var a = document.getElementById("password-new");
        var b = document.getElementById("password-new2");
        var out = document.getElementById("password-status");

        function say(text, tone) {
          out.textContent = text || "";
          if (tone) { out.setAttribute("data-tone", tone); }
          else { out.removeAttribute("data-tone"); }
        }

        if ((a.value || "").length < 8) {
          say("Use at least 8 characters.", "error");
          a.focus();
          return;
        }
        if (a.value !== b.value) {
          say("The two passwords do not match.", "error");
          b.focus();
          return;
        }

        say("Saving…", "");

        try {
          await window.CarDNAAuth.changePassword(a.value);
          a.value = "";
          b.value = "";
          say("Password changed. Use it the next time you sign in.", "ok");
          if (window.CarDNAAuth.log) { window.CarDNAAuth.log("password_change", {}); }
        } catch (err) {
          say(err.message || "The password could not be changed.", "error");
        }
      });
    }

    if (serverReady()) {
      window.CarDNAGarage.pull().then(function () {
        pulled = true;
        render();
      }).catch(function () {
        pulled = true;
        render();
      });
    } else {
      pulled = true;
    }

    /* The plan is known only once the session and profile have resolved. */
    if (window.CarDNAAuth && window.CarDNAAuth.ready) {
      window.CarDNAAuth.ready(function () {
        renderLimit(items().length);
        applyExportLimits();
      });
    }
  });
})();
