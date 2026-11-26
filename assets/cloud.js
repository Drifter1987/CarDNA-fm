/* CarDNA — one account's cloud storage in Supabase.
   One row per (user, kind, key) in public.cardna_cloud, readable and writable by its owner only
   (docs/supabase-user-cloud.sql). Today that is kind 'recent' key 'list' — the last six VINs —
   and kind 'vault' key 'current', the encrypted vault blob, which stays encrypted here.

   The page keeps a mirror of its own rows under `cardna.cloud.<user id>`, so a page renders
   before the request answers and keeps working offline. The server copy wins once it answers:
   it is the one that follows the account between devices. A change made without a connection is
   queued in `cardna.cloud.queue` and sent when the browser is back online. */
(function () {
  "use strict";

  var TABLE = "/rest/v1/cardna_cloud";
  var MIRROR = "cardna.cloud.";
  var QUEUE = "cardna.cloud.queue";

  /* synced | pending | local | missing | unknown */
  var tone = "";
  var detail = "";

  function config() { return window.CARDNA_SUPABASE || {}; }
  function authState() { return (window.CarDNAAuth && window.CarDNAAuth.state) || null; }

  function session() {
    var state = authState();
    return state && state.session && state.session.access_token ? state.session : null;
  }

  function base() { return String(config().url || "").replace(/\/+$/, ""); }
  function key() { return config().key || ""; }
  function uid() { var s = session(); return s ? (s.id || "") : ""; }
  function configured() { return Boolean(base() && key()); }
  function signedIn() { return Boolean(session() && session().id); }

  /* ------------------------------------------------------------------ local mirror */

  function mirrorRead() {
    var id = uid();
    if (!id) { return {}; }
    try {
      var raw = window.localStorage.getItem(MIRROR + id);
      var store = raw ? JSON.parse(raw) : {};
      return store && typeof store === "object" && !Array.isArray(store) ? store : {};
    } catch (err) { return {}; }
  }

  function mirrorWrite(store) {
    var id = uid();
    if (!id) { return; }
    try {
      if (Object.keys(store).length) { window.localStorage.setItem(MIRROR + id, JSON.stringify(store)); }
      else { window.localStorage.removeItem(MIRROR + id); }
    } catch (err) { /* full or blocked storage must not break the page */ }
  }

  function slot(kind, name) { return String(kind) + "|" + String(name); }

  function mirrorPut(kind, name, data) {
    var store = mirrorRead();
    store[slot(kind, name)] = { kind: String(kind), key: String(name), data: data, at: new Date().toISOString() };
    mirrorWrite(store);
  }

  function mirrorGet(kind, name) {
    var row = mirrorRead()[slot(kind, name)];
    return row && row.data !== undefined ? row.data : null;
  }

  function mirrorDrop(kind, name) {
    var store = mirrorRead();
    delete store[slot(kind, name)];
    mirrorWrite(store);
  }

  /* ------------------------------------------------------------------ the queue */

  function queueRead() {
    try {
      var raw = window.localStorage.getItem(QUEUE);
      var q = raw ? JSON.parse(raw) : {};
      return q && typeof q === "object" && !Array.isArray(q) ? q : {};
    } catch (err) { return {}; }
  }

  function queueWrite(q) {
    try {
      if (Object.keys(q).length) { window.localStorage.setItem(QUEUE, JSON.stringify(q)); }
      else { window.localStorage.removeItem(QUEUE); }
    } catch (err) { /* ignore */ }
    render();
  }

  function enqueue(op, kind, name, data) {
    var id = uid();
    if (!id) { return; }
    var q = queueRead();
    q[id + "|" + slot(kind, name)] = {
      op: op, uid: id, kind: String(kind), key: String(name),
      data: data === undefined ? null : data, at: new Date().toISOString()
    };
    queueWrite(q);
  }

  /* ------------------------------------------------------------------ requests */

  async function call(path, opts) {
    opts = opts || {};
    var s = session();
    if (!configured() || !s) {
      var local = new Error("not signed in");
      local.local = true;
      throw local;
    }

    var response = await fetch(base() + path, {
      method: opts.method || "GET",
      headers: {
        apikey: key(),
        Authorization: "Bearer " + s.access_token,
        "Content-Type": "application/json",
        Prefer: opts.prefer || "return=minimal"
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
    });

    if (!response.ok) {
      var text = await response.text();
      var failure = new Error("Supabase " + response.status);
      failure.status = response.status;
      failure.detail = text || "";
      throw failure;
    }

    var out = await response.text();
    return out ? JSON.parse(out) : null;
  }

  /* The table has not been created in this project yet. Nothing is retried in a loop. */
  function missingTable(err) {
    if (!err) { return false; }
    if (err.status === 404) { return true; }
    return /PGRST205|relation .* does not exist|schema cache/i.test(err.detail || "");
  }

  function transient(err) {
    return !err.status || err.status >= 500 || err.status === 401 ||
      err.status === 408 || err.status === 429;
  }

  function note(err) {
    if (missingTable(err)) { setTone("missing"); return; }
    setTone(transient(err) ? "pending" : "pending", err && err.status === 409
      ? "Your cloud storage is full for this plan." : "");
  }

  /* ------------------------------------------------------------------ status */

  function setTone(next, extra) {
    tone = next;
    detail = extra || "";
    render();
  }

  function statusText() {
    if (!configured()) {
      return "Cloud storage needs the Supabase project URL and publishable key in assets/supabase-config.js.";
    }
    if (!signedIn()) {
      return "Signed out — this is kept in this browser. Sign in to keep it in your account.";
    }
    if (tone === "missing") {
      return "Cloud storage is not set up yet: run docs/supabase-user-cloud.sql in Supabase. Nothing was uploaded.";
    }
    if (tone === "pending") {
      return "Kept in this browser. It will reach your account when the connection is back." + detail;
    }
    if (tone === "synced") {
      return "In your account, in Supabase — available on any device while you are online.";
    }
    return "Your account's storage, in Supabase.";
  }

  function render() {
    var nodes = document.querySelectorAll("[data-cloud-status]");
    if (!nodes.length) { return; }
    var text = statusText();
    for (var i = 0; i < nodes.length; i += 1) {
      nodes[i].textContent = text;
      if (tone) { nodes[i].setAttribute("data-tone", tone === "missing" ? "error" : tone); }
      else { nodes[i].removeAttribute("data-tone"); }
    }
  }

  /* ------------------------------------------------------------------ reads and writes */

  async function get(kind, name) {
    /* The owner's view of another account reads that account's rows and writes nothing. */
    if (window.CarDNAActAs && window.CarDNAActAs.active()) {
      return kind === "vault" ? window.CarDNAActAs.vault() : window.CarDNAActAs.recent();
    }
    if (!configured() || !signedIn()) { return mirrorGet(kind, name); }

    try {
      var rows = await call(TABLE + "?select=data&kind=eq." + encodeURIComponent(kind) +
        "&key=eq." + encodeURIComponent(name) + "&limit=1");
      var row = rows && rows[0];
      if (row && row.data !== undefined) {
        mirrorPut(kind, name, row.data);
        setTone("synced");
        return row.data;
      }
      return null;
    } catch (err) {
      note(err);
      return mirrorGet(kind, name);
    }
  }

  async function put(kind, name, data) {
    if (window.CarDNAActAs && window.CarDNAActAs.active()) { return { state: "readonly" }; }
    mirrorPut(kind, name, data);

    if (!configured() || !signedIn()) { setTone("local"); return { state: "local" }; }

    try {
      await call(TABLE + "?on_conflict=user_id,kind,key", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: { user_id: uid(), kind: String(kind), key: String(name), data: data }
      });
      setTone("synced");
      return { state: "synced" };
    } catch (err) {
      if (missingTable(err)) { setTone("missing"); return { state: "missing" }; }
      enqueue("put", kind, name, data);
      note(err);
      return { state: "pending" };
    }
  }

  async function drop(kind, name) {
    if (window.CarDNAActAs && window.CarDNAActAs.active()) { return { state: "readonly" }; }
    mirrorDrop(kind, name);

    if (!configured() || !signedIn()) { setTone("local"); return { state: "local" }; }

    try {
      await call(TABLE + "?kind=eq." + encodeURIComponent(kind) +
        "&key=eq." + encodeURIComponent(name), { method: "DELETE" });
      setTone("synced");
      return { state: "synced" };
    } catch (err) {
      if (missingTable(err)) { setTone("missing"); return { state: "missing" }; }
      enqueue("drop", kind, name);
      note(err);
      return { state: "pending" };
    }
  }

  /* Send whatever this device still owes the server. One pass, no loop of retries. */
  async function flush() {
    if (!configured() || !signedIn()) { render(); return; }

    var id = uid();
    var q = queueRead();
    var keys = Object.keys(q).filter(function (entry) { return q[entry].uid === id; });
    if (!keys.length) { render(); return; }

    setTone("pending");

    for (var i = 0; i < keys.length; i += 1) {
      var item = q[keys[i]];
      try {
        if (item.op === "put") {
          await call(TABLE + "?on_conflict=user_id,kind,key", {
            method: "POST",
            prefer: "resolution=merge-duplicates,return=minimal",
            body: { user_id: id, kind: item.kind, key: item.key, data: item.data }
          });
        } else {
          await call(TABLE + "?kind=eq." + encodeURIComponent(item.kind) +
            "&key=eq." + encodeURIComponent(item.key), { method: "DELETE" });
        }
        delete q[keys[i]];
        queueWrite(q);
      } catch (err) {
        if (missingTable(err)) { setTone("missing"); return; }
        if (transient(err)) { note(err); return; }
        /* The server refused it for good: stop carrying it, and say so. */
        delete q[keys[i]];
        queueWrite(q);
        setTone("pending", " One change was refused by the server.");
        return;
      }
    }

    setTone(Object.keys(queueRead()).length ? "pending" : "synced");
  }

  /* What this device holds for the signed-in account, for the export on garage.html. */
  function snapshot() {
    return {
      recent: mirrorGet("recent", "list"),
      vault: mirrorGet("vault", "current")
    };
  }

  /* After a deletion the account is gone: drop its mirror and anything still queued for it. */
  function clear() {
    var id = uid();
    mirrorWrite({});
    if (!id) { render(); return; }

    var q = queueRead();
    Object.keys(q).forEach(function (entry) { if (q[entry].uid === id) { delete q[entry]; } });
    queueWrite(q);
    tone = "";
    render();
  }

  function pending() {
    var id = uid();
    if (!id) { return 0; }
    var q = queueRead();
    return Object.keys(q).filter(function (entry) { return q[entry].uid === id; }).length;
  }

  /* One read after the session resolves, so the page says whether the account's storage is really
     there: "in your account" only once Supabase has answered, and the honest "not set up yet" line
     when the table is missing. Without this the page would sit on its neutral sentence for ever. */
  async function probe() {
    if (!configured() || !signedIn()) { render(); return; }
    try {
      await call(TABLE + "?select=kind&limit=1");
      setTone("synced");
    } catch (err) {
      note(err);
      render();
    }
  }

  window.CarDNACloud = {
    configured: configured,
    signedIn: signedIn,
    get: get,
    put: put,
    remove: drop,
    flush: flush,
    snapshot: snapshot,
    clear: clear,
    pending: pending,
    render: render
  };

  /* ------------------------------------------------------------------ wiring */

  render();

  window.addEventListener("online", function () { probe(); flush(); });

  if (window.CarDNAAuth && window.CarDNAAuth.ready) {
    window.CarDNAAuth.ready(function () {
      probe();
      flush();
    });
  }
})();
