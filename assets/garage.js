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
      var failure = new Error("Supabase " + response.status + ": " + (text || "request failed"));
      failure.status = response.status;
      failure.detail = text || "";
      throw failure;
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
      note: entry.label || null,
      /* Re-saving a car that was removed clears the soft delete. */
      deleted_at: null
    };
  }

  async function send(entry) {
    var url = "/rest/v1/vehicles?on_conflict=user_id,vin";
    try {
      await api(url, {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: row(entry)
      });
    } catch (err) {
      /* The deleted_at column may not be in the database yet; anything else is a real answer. */
      if (err.status === 400 && /deleted_at/i.test(err.detail || "")) {
        var plain = row(entry);
        delete plain.deleted_at;
        await api(url, {
          method: "POST",
          prefer: "resolution=merge-duplicates,return=minimal",
          body: plain
        });
      } else {
        throw err;
      }
    }
  }

  /* A removal is a soft delete once the column exists, so the row — and its audit trail —
     survives. Without the column it falls back to the old hard delete. */
  async function dropRemote(vin) {
    var url = "/rest/v1/vehicles?vin=eq." + encodeURIComponent(vin);
    try {
      await api(url, {
        method: "PATCH",
        body: { deleted_at: new Date().toISOString() }
      });
    } catch (err) {
      if (err.status === 400 && /deleted_at/i.test(err.detail || "")) {
        await api(url, { method: "DELETE" });
      } else {
        throw err;
      }
    }
  }

  async function clearRemote(uid) {
    await api("/rest/v1/vehicles?user_id=eq." + encodeURIComponent(uid), { method: "DELETE" });
  }

  /* ------------------------------------------------------------------ sync queue
     Every change to the server copy goes through a small queue in localStorage, so a save
     made offline lands later and a refusal is reported instead of swallowed. An entry is
     "pending" (will be retried, with backoff, when the browser is back online or the tab
     is shown again) or "rejected" (the server answered no — only retried by hand). */

  var QUEUE_KEY = "cardna.garage.queue";
  var CLEAR = "*";
  var seq = 0;
  var flushing = null;
  var retryTimer = null;
  var retryDelay = 15000;

  function queueRead() {
    try {
      var raw = window.localStorage.getItem(QUEUE_KEY);
      var q = raw ? JSON.parse(raw) : {};
      return q && typeof q === "object" && !Array.isArray(q) ? q : {};
    } catch (err) {
      return {};
    }
  }

  function queueWrite(q) {
    try {
      if (Object.keys(q).length) { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
      else { window.localStorage.removeItem(QUEUE_KEY); }
    } catch (err) { /* ignore */ }
    try { document.dispatchEvent(new CustomEvent("cardna:garage-sync")); } catch (err) { /* older browsers */ }
  }

  /* Only this account's entries: the queue lives per device, not per user. */
  function mine() {
    var s = session();
    var q = queueRead();
    var out = {};
    if (!s) { return out; }
    Object.keys(q).forEach(function (key) {
      if (q[key] && q[key].uid === s.id) { out[key] = q[key]; }
    });
    return out;
  }

  function enqueue(op, key, entry) {
    var q = queueRead();
    q[key] = {
      op: op,
      uid: session().id,
      entry: entry || null,
      at: Date.now() * 1000 + (seq++ % 1000),
      state: "pending",
      message: "",
      tries: 0
    };
    queueWrite(q);
  }

  /* Offline, a server fault, an expired token or throttling: try again later. */
  function transient(err) {
    return !err.status || err.status >= 500 || err.status === 401 ||
      err.status === 408 || err.status === 429;
  }

  function reason(err) {
    var text = "";
    try {
      var body = JSON.parse(err.detail || "{}");
      text = body.message || body.hint || "";
    } catch (parseError) { text = ""; }
    if (/row-level security/i.test(text) || /row-level security/i.test(err.detail || "")) {
      return "Your account cannot save vehicles right now.";
    }
    return text || "The server did not accept it.";
  }

  function scheduleRetry() {
    if (retryTimer) { return; }
    retryTimer = window.setTimeout(function () {
      retryTimer = null;
      flush();
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 300000);
  }

  function summary() {
    var q = mine();
    var out = { pending: 0, rejected: 0, message: "" };
    Object.keys(q).forEach(function (key) {
      if (q[key].state === "rejected") {
        out.rejected += 1;
        if (!out.message) { out.message = q[key].message || ""; }
      } else {
        out.pending += 1;
      }
    });
    return out;
  }

  /* What the server copy of one car is doing: synced, pending, rejected, or local when no
     account is signed in. */
  function statusInfo(vin) {
    if (!serverReady()) { return { state: "local", message: "" }; }
    var item = mine()[vin];
    if (!item) { return { state: "synced", message: "" }; }
    return { state: item.state, message: item.message || "" };
  }

  function flush() {
    if (flushing) { return flushing; }
    if (!serverReady()) { return Promise.resolve(summary()); }

    flushing = (async function () {
      var uid = session().id;
      var stop = false;

      while (!stop) {
        var q = mine();
        var keys = Object.keys(q).filter(function (key) { return q[key].state === "pending"; });
        if (!keys.length) { break; }
        keys.sort(function (a, b) { return q[a].at - q[b].at; });

        for (var i = 0; i < keys.length && !stop; i += 1) {
          var key = keys[i];
          var item = q[key];

          try {
            if (item.op === "save") { await send(item.entry); }
            else if (item.op === "drop") { await dropRemote(key); }
            else { await clearRemote(uid); }

            var done = queueRead();
            if (done[key] && done[key].at === item.at) {
              delete done[key];
              queueWrite(done);
            }
          } catch (err) {
            var now = queueRead();
            /* A newer change to the same car replaced this one while it was in flight. */
            if (now[key] && now[key].at === item.at) {
              if (transient(err)) {
                now[key].tries = (now[key].tries || 0) + 1;
                stop = true;
              } else {
                now[key].state = "rejected";
                now[key].message = reason(err);
              }
              queueWrite(now);
            } else if (transient(err)) {
              stop = true;
            }
          }
        }
      }

      if (summary().pending) { scheduleRetry(); }
      else { retryDelay = 15000; }
      return summary();
    })().then(function (result) {
      flushing = null;
      /* A change queued in the instant between the last pass and here would otherwise wait. */
      if (result.pending && !retryTimer) { flush(); }
      return result;
    }, function (err) {
      flushing = null;
      throw err;
    });

    return flushing;
  }

  /* Queue a change and report how that car ended up. */
  function submit(op, key, entry) {
    if (!serverReady()) { return Promise.resolve({ state: "local", message: "" }); }
    enqueue(op, key, entry);
    return flush().then(function () { return statusInfo(key); });
  }

  /* Try again now: also gives refused changes another chance, for after a plan change. */
  function retry() {
    if (!serverReady()) { return Promise.resolve(summary()); }
    var q = queueRead();
    var uid = session().id;
    Object.keys(q).forEach(function (key) {
      if (q[key].uid === uid && q[key].state === "rejected") {
        q[key].state = "pending";
        q[key].message = "";
      }
    });
    queueWrite(q);
    retryDelay = 15000;
    return flush();
  }

  /* Pull the account's rows, merge them over the local copy, and upload anything the
     server has never seen. Returns the merged list. */
  async function pull() {
    if (!serverReady()) { return read(); }

    /* Settle what this device still owes the server first, so a car removed offline is not
       read back as present. */
    await flush();
    var queued = mine();
    if (queued[CLEAR]) { return read(); }

    var rows;
    try {
      rows = await api("/rest/v1/vehicles?select=vin,model_year,make,model,note,created_at" +
        "&deleted_at=is.null&order=created_at.desc&limit=" + MAX);
    } catch (err) {
      /* No deleted_at column yet: read the same rows without the filter. */
      try {
        rows = await api("/rest/v1/vehicles?select=vin,model_year,make,model,note,created_at" +
          "&order=created_at.desc&limit=" + MAX);
      } catch (err2) {
        return read();
      }
    }

    var local = read();
    var byVin = Object.create(null);
    var seen = Object.create(null);

    local.forEach(function (item) { byVin[item.vin] = item; });

    (rows || []).forEach(function (remote) {
      seen[remote.vin] = true;
      if (queued[remote.vin] && queued[remote.vin].op === "drop") { return; }
      /* A change this device has not delivered yet is newer than the server's copy. */
      if (queued[remote.vin] && queued[remote.vin].op === "save" && byVin[remote.vin]) { return; }
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

    /* A car the server has never seen is queued — unless the server already refused it, which
       is shown to the user rather than asked again on every load. */
    var added = false;
    local.forEach(function (item) {
      if (!seen[item.vin] && !queued[item.vin]) {
        enqueue("save", item.vin, item);
        added = true;
      }
    });
    if (added) { flush(); }

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
      /* sync resolves to { state, message } once the server has answered or the attempt is
         parked for a retry: synced, pending, rejected, or local when signed out. */
      var synced = submit("save", record.vin, record);
      return { ok: true, count: capped.length, sync: synced };
    },
    remove: function (vin) {
      var list = read().filter(function (item) { return item.vin !== vin; });
      write(list);
      submit("drop", vin, null);
      return list.length;
    },
    clear: function () {
      write([]);
      if (!serverReady()) { return; }

      /* Anything still queued for this account is moot once the whole garage is gone. */
      var q = queueRead();
      var uid = session().id;
      Object.keys(q).forEach(function (key) {
        if (q[key].uid === uid) { delete q[key]; }
      });
      queueWrite(q);
      submit("clear", CLEAR, null);
    },
    pull: pull,
    status: statusInfo,
    syncSummary: summary,
    retry: retry,
    flush: flush,
    count: function () { return read().length; }
  };

  /* Deliver whatever is waiting when the connection comes back, the tab is shown again, or
     the session has resolved after a page load. */
  window.addEventListener("online", function () { retryDelay = 15000; flush(); });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { flush(); }
  });
  if (window.CarDNAAuth && window.CarDNAAuth.ready) {
    window.CarDNAAuth.ready(function () { flush(); });
  }

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
      var cap = lim.vehicles
        ? lim.vehicles + (lim.vehicles === 1 ? " saved vehicle" : " saved vehicles")
        : "unlimited saved vehicles";
      el.textContent = a.planLabel(planName()) + " plan · " + count + " of " + cap +
        (lim.vehicles && count > lim.vehicles ? " · over the limit, remove one to save another" : "");
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

      /* Whether this car is on the account yet. Signed-out visitors see nothing here. */
      var sync = window.CarDNAGarage.status(item.vin);
      if (sync.state === "pending" || sync.state === "rejected") {
        var flag = document.createElement("span");
        flag.className = "sync-flag is-" + sync.state;
        flag.textContent = sync.state === "pending"
          ? "Saved on this device · waiting to reach your account"
          : "Not saved to your account · " + (sync.message || "the server refused it");
        left.appendChild(flag);
      }

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

    /* One line for the whole garage: everything is on the account, or what is not and why.
       The retry button is the only way to re-ask for changes the server refused. */
    function renderSync() {
      var el = document.getElementById("garage-sync");
      var text = document.getElementById("garage-sync-text");
      if (!el || !text) { return; }

      var s = serverReady() ? window.CarDNAGarage.syncSummary() : { pending: 0, rejected: 0 };
      var waiting = s.pending + s.rejected;
      el.hidden = !waiting;
      if (!waiting) { return; }

      var parts = [];
      if (s.pending) {
        parts.push(s.pending + (s.pending === 1 ? " change is" : " changes are") +
          " saved on this device and waiting to reach your account");
      }
      if (s.rejected) {
        parts.push(s.rejected + (s.rejected === 1 ? " change was" : " changes were") +
          " refused by your account" + (s.message ? " (" + s.message + ")" : ""));
      }
      text.textContent = parts.join("; ") + ". ";
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
      renderSync();

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

    /* The queue changes in the background: redraw when it does. */
    document.addEventListener("cardna:garage-sync", function () { render(); });

    var syncRetry = document.getElementById("garage-sync-retry");
    if (syncRetry) {
      syncRetry.addEventListener("click", function () {
        status("Trying again…", "");
        window.CarDNAGarage.retry().then(function (s) {
          render();
          status(s.pending || s.rejected ? "Some changes are still not on your account." : "Your garage is up to date.",
            s.pending || s.rejected ? "error" : "ok");
        });
      });
    }

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

    /* A plan granted in the console lands here without a reload. */
    document.addEventListener("cardna:profile", function () {
      renderLimit(items().length);
      applyExportLimits();
      window.CarDNAGarage.pull().then(function () { render(); }).catch(function () { /* ignore */ });
    });
  });
})();
