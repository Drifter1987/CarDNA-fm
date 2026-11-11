/* CarDNA — accounts against the Supabase REST API, no client library.
   Session lives in localStorage under cardna.session. The publishable key comes from
   assets/supabase-config.js; a secret key must never appear in this file. */

(function () {
  "use strict";

  var CONFIG = window.CARDNA_SUPABASE || {};
  var BASE = String(CONFIG.url || "").replace(/\/+$/, "");
  var KEY = String(CONFIG.key || "").trim();
  var SESSION_KEY = "cardna.session";
  var PUBLIC_PAGES = { "about.html": 1, "legal.html": 1, "pricing.html": 1, "signin.html": 1 };

  var state = { session: null, profile: null, ready: false };
  var waiters = [];

  /* ------------------------------------------------------------------ plumbing */

  function configured() { return Boolean(BASE && KEY); }

  function readSession() {
    try {
      var raw = window.localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeSession(session) {
    try {
      if (session) { window.localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
      else { window.localStorage.removeItem(SESSION_KEY); }
    } catch (err) { /* storage blocked; session lives in memory */ }
  }

  async function call(path, options) {
    var opts = options || {};
    var headers = { apikey: KEY, "Content-Type": "application/json" };
    if (opts.headers) {
      Object.keys(opts.headers).forEach(function (name) { headers[name] = opts.headers[name]; });
    }
    if (opts.token) { headers.Authorization = "Bearer " + opts.token; }

    var response = await fetch(BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
    });

    var text = await response.text();
    var data = null;
    if (text) { try { data = JSON.parse(text); } catch (err) { data = null; } }

    if (!response.ok) {
      var message = (data && (data.msg || data.message || data.error_description || data.error)) ||
        ("HTTP " + response.status);
      var error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function adopt(payload) {
    if (!payload || !payload.access_token) { return null; }
    var session = {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: payload.expires_at ||
        Math.floor(Date.now() / 1000) + (payload.expires_in || 3600),
      email: (payload.user && payload.user.email) || (state.session && state.session.email) || "",
      id: (payload.user && payload.user.id) || ""
    };
    writeSession(session);
    state.session = session;
    return session;
  }

  async function ensureFresh(session) {
    if (!session) { return null; }
    if (!session.expires_at || Date.now() / 1000 < session.expires_at - 60) { return session; }
    if (!session.refresh_token) { return null; }
    try {
      var data = await call("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: session.refresh_token }
      });
      return adopt(data);
    } catch (err) {
      writeSession(null);
      return null;
    }
  }

  /* ------------------------------------------------------------------ profile */

  async function fetchProfile(session) {
    if (!session) { return null; }

    var rows;
    try {
      rows = await call("/rest/v1/profiles?select=*&limit=1", { token: session.access_token });
    } catch (err) {
      /* role / plan columns may not exist yet — fall back to the guaranteed columns */
      try {
        rows = await call("/rest/v1/profiles?select=id,display_name,created_at&limit=1",
          { token: session.access_token });
      } catch (err2) {
        return { id: session.id, email: session.email, plan: "free", role: "member" };
      }
    }

    var row = (rows && rows[0]) || {};
    return {
      id: row.id || session.id,
      display_name: row.display_name || "",
      plan: row.plan || "free",
      role: row.role || "member",
      created_at: row.created_at || "",
      email: session.email
    };
  }

  /* ------------------------------------------------------------------ actions */

  async function signIn(email, password) {
    var data = await call("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email: email, password: password }
    });
    adopt(data);
    state.profile = await fetchProfile(state.session);
    log("sign_in", { plan: state.profile && state.profile.plan });
    return state.profile;
  }

  async function signUp(email, password) {
    var data = await call("/auth/v1/signup", {
      method: "POST",
      body: { email: email, password: password }
    });
    var session = adopt(data);
    if (!session) { return null; }        /* email confirmation is on */
    state.profile = await fetchProfile(state.session);
    return state.profile;
  }

  async function signOut() {
    var session = state.session;
    state.session = null;
    state.profile = null;
    writeSession(null);
    if (session && session.access_token) {
      try { await call("/auth/v1/logout", { method: "POST", token: session.access_token }); }
      catch (err) { /* token already dropped locally */ }
    }
  }

  async function updateProfile(patch) {
    if (!state.session) { throw new Error("Not signed in."); }
    await call("/rest/v1/profiles?id=eq." + encodeURIComponent(state.session.id), {
      method: "PATCH",
      token: state.session.access_token,
      headers: { Prefer: "return=minimal" },
      body: patch
    });
    state.profile = await fetchProfile(state.session);
    return state.profile;
  }

  /* ------------------------------------------------------------------ helpers */

  function planLabel(plan) {
    return { free: "Free", pro: "Pro", workshop: "Workshop", business: "Business", suspended: "Suspended" }[plan] || plan;
  }

  function roleLabel(role) {
    return { owner: "Owner", admin: "Admin", user: "User" }[role] || "User";
  }

  function isBlocked() {
    return Boolean(state.profile &&
      (state.profile.status === "blocked" || state.profile.plan === "suspended"));
  }

  function isOwner() {
    return Boolean(state.profile && state.profile.role === "owner");
  }

  function isStaff() {
    return Boolean(state.profile && (state.profile.role === "owner" || state.profile.role === "admin"));
  }

  /* Fire-and-forget activity record. The row is owned by the signed-in user, so the insert
     policy only ever allows writing your own events. */
  function log(kind, detail) {
    if (!configured() || !state.session) { return; }
    call("/rest/v1/events", {
      method: "POST",
      token: state.session.access_token,
      headers: { Prefer: "return=minimal" },
      body: { user_id: state.session.id, kind: kind, detail: detail || null }
    }).catch(function () { /* activity is best-effort */ });
  }

  function gate() {
    if (!configured()) { return; }                       /* not set up yet: stay public */
    if (state.session) { return; }
    if (PUBLIC_PAGES[location.pathname.split("/").pop() || "index.html"]) { return; }

    var next = location.pathname.split("/").pop() + location.search + location.hash;
    location.replace("signin.html?next=" + encodeURIComponent(next));
  }

  function renderChip() {
    var host = document.querySelector(".header-actions");
    if (!host) { return; }

    var existing = host.querySelector("[data-account-chip]");
    if (existing) { existing.remove(); }

    var chip = document.createElement("span");
    chip.setAttribute("data-account-chip", "");
    chip.className = "account-chip";

    if (state.session && state.profile) {
      var who = document.createElement("span");
      who.className = "account-chip-who";
      who.textContent = state.profile.email || state.profile.display_name || "account";
      chip.appendChild(who);

      var plan = document.createElement("span");
      plan.className = "account-chip-plan";
      plan.textContent = planLabel(state.profile.plan);
      chip.appendChild(plan);

      if (isOwner()) {
        var admin = document.createElement("a");
        admin.className = "account-chip-link";
        admin.href = "admin.html";
        admin.textContent = "Admin";
        chip.appendChild(admin);
      }

      var out = document.createElement("button");
      out.type = "button";
      out.className = "account-chip-out";
      out.textContent = "Sign out";
      out.addEventListener("click", function () {
        signOut().then(function () { location.href = "signin.html"; });
      });
      chip.appendChild(out);
    } else if (configured()) {
      var link = document.createElement("a");
      link.className = "account-chip-link";
      link.href = "signin.html";
      link.textContent = "Sign in";
      chip.appendChild(link);
    }

    host.appendChild(chip);
  }

  function renderSuspended() {
    if (!isBlocked() || document.getElementById("access-suspended")) { return; }
    var box = document.createElement("div");
    box.id = "access-suspended";
    box.className = "decode-warning";
    box.style.margin = "0 0 18px";
    box.innerHTML = "<strong>Access blocked.</strong> This account cannot use CarDNA. " +
      (state.profile && state.profile.blocked_reason
        ? "Reason: " + state.profile.blocked_reason + ". "
        : "") +
      "Contact GMOttomotive if you believe this is a mistake.";
    var main = document.querySelector("main");
    if (main) { main.insertBefore(box, main.firstChild); }

    document.querySelectorAll("form, #vin-result, #garage-list, #vault-app").forEach(function (node) {
      node.setAttribute("aria-disabled", "true");
      node.style.pointerEvents = "none";
      node.style.opacity = ".5";
    });
  }

  /* ------------------------------------------------------------------ boot */

  async function boot() {
    if (!configured()) {
      state.ready = true;
      waiters.splice(0).forEach(function (fn) { fn(null); });
      renderChip();
      if (document.body.hasAttribute("data-require-auth") && !PUBLIC_PAGES[
        location.pathname.split("/").pop() || "index.html"]) {
        var banner = document.createElement("div");
        banner.className = "notice";
        banner.style.margin = "18px auto";
        banner.style.maxWidth = "760px";
        banner.innerHTML = "<strong>Accounts are not configured.</strong> Paste the publishable key " +
          "into <code>assets/supabase-config.js</code> to switch sign-in on.";
        var main = document.querySelector("main");
        if (main) { main.insertBefore(banner, main.firstChild); }
      }
      return;
    }

    state.session = readSession();
    state.session = await ensureFresh(state.session);
    if (state.session) { state.profile = await fetchProfile(state.session); }

    state.ready = true;
    waiters.splice(0).forEach(function (fn) { fn(state.profile); });

    gate();
    renderChip();
    if (state.session) {
      log("page_view", { path: location.pathname.split("/").pop() || "index.html" });
      renderSuspended();
    }
  }

  function ready(callback) {
    if (state.ready) { callback(state.profile); }
    else { waiters.push(callback); }
  }

  window.CarDNAAuth = {
    configured: configured,
    ready: ready,
    state: state,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    updateProfile: updateProfile,
    planLabel: planLabel,
    roleLabel: roleLabel,
    isOwner: isOwner,
    isStaff: isStaff,
    isBlocked: isBlocked,
    log: log,
    renderChip: renderChip,
    fetchProfile: fetchProfile,
    call: call
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
