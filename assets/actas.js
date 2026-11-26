/* CarDNA — the owner's "log in as" view of one account.
   Only drifter_87@live.com sees the button (assets/admin.js), and the database refuses anyone else
   (docs/supabase-owner-act-as.sql). What it does honestly: the console shows that account as the app
   would, in reading only — its profile, plan and role in the chip, its saved vehicles, its recent
   lookups, its encrypted vault and its decode count — with a banner saying so and a way back. Nothing
   is written on their behalf, and it is never silent: the database records each use.

   What it is not, and cannot be from a page: a Supabase session for that account. That needs the
   service_role key, which belongs on a server, so a real sign-in needs a server function. */
(function () {
  "use strict";

  var KEY = "cardna.actas";
  var OWNER = "drifter_87@live.com";
  var state = { target: null, at: "" };

  function readState() {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.target && parsed.target.id ? parsed : null;
    } catch (err) { return null; }
  }

  function writeState(value) {
    try {
      if (value) { window.sessionStorage.setItem(KEY, JSON.stringify(value)); }
      else { window.sessionStorage.removeItem(KEY); }
    } catch (err) { /* ignore */ }
  }

  function owner() {
    var auth = window.CarDNAAuth;
    var me = auth && auth.state && auth.state.profile;
    if (!me) { return false; }
    var mail = String(me.email || "").toLowerCase();
    var role = String(me.role || "").toLowerCase();
    return role === "owner" && mail === OWNER;
  }

  function active() { return Boolean(state.target && state.target.id); }

  function vehicles() {
    return state.target && Array.isArray(state.target.vehicles) ? state.target.vehicles : [];
  }

  function rpc(name, body) {
    var auth = window.CarDNAAuth;
    if (!auth || !auth.state || !auth.state.session) {
      return Promise.reject(new Error("Not signed in."));
    }
    return auth.call("/rest/v1/rpc/" + name, {
      method: "POST",
      token: auth.state.session.access_token,
      body: body
    });
  }

  function start(id) {
    if (!active() && !owner()) {
      return Promise.resolve({ ok: false, error: "Only the owner may open another account's view." });
    }

    return rpc("cardna_act_as", { target: id, ending: false }).then(function (result) {
      if (!result || !result.ok) {
        return { ok: false, error: (result && result.error) || "That view could not be opened." };
      }
      state.target = result;
      state.at = new Date().toISOString();
      writeState(state);
      window.location.href = "garage.html";
      return { ok: true };
    }).catch(function (err) {
      var missing = err && err.status === 404;
      return {
        ok: false,
        error: missing
          ? "The owner view needs docs/supabase-owner-act-as.sql, which has not been run in Supabase."
          : (err && err.message) || "That view could not be opened."
      };
    });
  }

  function stop() {
    var target = state.target;
    state.target = null;
    state.at = "";
    writeState(null);
    poster.remove();

    if (!target) { return Promise.resolve({ ok: true }); }
    return rpc("cardna_act_as", { target: target.profile.id, ending: true })
      .catch(function () { /* the audit row is best effort; leaving is not blocked */ })
      .then(function () {
        window.location.href = "admin.html";
        return { ok: true };
      });
  }

  /* ------------------------------------------------------------------ the banner */

  var poster = {
    node: null,
    remove: function () {
      if (this.node) { this.node.remove(); this.node = null; }
    }
  };

  function renderBanner() {
    if (!active()) { return; }
    poster.remove();

    var mail = state.target.profile.email || "that account";
    var bar = document.createElement("div");
    bar.className = "actas-bar";
    bar.setAttribute("role", "status");
    bar.innerHTML = '<strong>Viewing as ' + mail + "</strong>" +
      "<span>Read-only, as the owner. Nothing you do here changes their account.</span>" +
      '<button type="button" class="btn btn--sm btn--ghost">Return to the owner console</button>';

    bar.querySelector("button").addEventListener("click", function () { stop(); });
    document.body.appendChild(bar);
    poster.node = bar;
  }

  /* The chip, the plan limits and the nav gate read CarDNAAuth.state.profile, so the view is the
     same place the account lives — replaced for as long as you are looking, then restored. */
  function applyProfile() {
    var auth = window.CarDNAAuth;
    if (!auth || !auth.state || !active()) { return; }

    var before = auth.state.profile;
    state.before = before;

    auth.state.profile = {
      id: state.target.profile.id,
      email: state.target.profile.email,
      display_name: state.target.profile.display_name,
      plan: state.target.profile.plan,
      role: state.target.profile.role,
      status: "active",
      created_at: state.target.profile.created_at
    };

    auth.state.acting = {
      ownerId: before && before.id ? before.id : "",
      ownerEmail: before && before.email ? before.email : "",
      targetId: state.target.profile.id,
      targetEmail: state.target.profile.email || ""
    };

    if (typeof auth.renderChip === "function") { auth.renderChip(); }
    if (typeof auth.applyNavGate === "function") { auth.applyNavGate(); }
  }

  function refuseWrite() {
    return {
      ok: false,
      error: "You are looking at " + (state.target.profile.email || "another account") +
        " as the owner. Their data is read-only here; leave the view to change your own."
    };
  }

  window.CarDNAActAs = {
    ownerOnly: function () { return owner(); },
    ownerEmail: OWNER,
    active: active,
    profile: function () { return state.target ? state.target.profile : null; },
    vehicles: vehicles,
    recent: function () { return state.target ? state.target.recent : null; },
    vault: function () { return state.target ? state.target.vault : null; },
    decodes: function () { return state.target ? (state.target.decodes || 0) : 0; },
    refused: refuseWrite,
    start: start,
    stop: stop
  };

  state = readState() || state;

  if (!active()) { return; }

  var auth = window.CarDNAAuth;
  if (!auth || !auth.ready) { return; }

  auth.ready(function () {
    /* Signed out, or no longer the owner: the view ends rather than lingering. */
    if (!owner()) {
      state.target = null;
      writeState(null);
      return;
    }
    applyProfile();
    renderBanner();
  });
})();
