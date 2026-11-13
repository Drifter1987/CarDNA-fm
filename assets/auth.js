/* CarDNA — accounts against the Supabase REST API, no client library.
   Session lives in localStorage under cardna.session. The publishable key comes from
   assets/supabase-config.js; a secret key must never appear in this file. */

(function () {
  "use strict";

  var CONFIG = window.CARDNA_SUPABASE || {};
  var BASE = String(CONFIG.url || "").replace(/\/+$/, "");
  var KEY = String(CONFIG.key || "").trim();
  var SESSION_KEY = "cardna.session";
  /* Pages reachable without a session. reset.html handles its own recovery token,
     so it must never be bounced to the sign-in gate. */
  var PUBLIC_PAGES = {
    "about.html": 1,
    "legal.html": 1,
    "pricing.html": 1,
    "signin.html": 1,
    "reset.html": 1
  };

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
        return { id: session.id, email: session.email, plan: "free", role: "user" };
      }
    }

    var row = (rows && rows[0]) || {};
    return {
      id: row.id || session.id,
      display_name: row.display_name || "",
      plan: row.plan || "free",
      role: row.role || "user",
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

  /* ------------------------------------------------------------------ recovery */

  function hashParams() {
    var out = {};
    var raw = String(location.hash || "").replace(/^#/, "");
    if (!raw) { return out; }
    raw.split("&").forEach(function (pair) {
      var at = pair.indexOf("=");
      if (at === -1) { return; }
      out[decodeURIComponent(pair.slice(0, at))] = decodeURIComponent(pair.slice(at + 1));
    });
    return out;
  }

  function clearHash() {
    if (!location.hash) { return; }
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", location.pathname + location.search);
    }
  }

  /* Supabase puts the recovery / magic-link tokens in the URL fragment. */
  function tokensFromHash() {
    var p = hashParams();
    if (!p.access_token) { return null; }
    var session = {
      access_token: p.access_token,
      refresh_token: p.refresh_token || "",
      expires_at: p.expires_in ? Math.floor(Date.now() / 1000) + Number(p.expires_in) : 0,
      email: "",
      id: ""
    };
    return { type: p.type || "", session: session, error: p.error_description || "" };
  }

  async function hydrateSession(session) {
    if (!session || !session.access_token) { return null; }
    try {
      var me = await call("/auth/v1/user", { token: session.access_token });
      session.email = (me && me.email) || "";
      session.id = (me && me.id) || "";
    } catch (err) { return null; }
    writeSession(session);
    state.session = session;
    return session;
  }

  /* Ask Supabase to email a recovery link that comes back to this site.
     redirect_to is a query parameter on GoTrue for this endpoint. */
  function recoverPassword(email) {
    var dir = location.origin + location.pathname.replace(/[^/]*$/, "");
    return call("/auth/v1/recover?redirect_to=" + encodeURIComponent(dir + "reset.html"), {
      method: "POST",
      body: { email: email }
    });
  }

  /* Change the password of the signed-in account. The live session is proof of identity,
     so no email round-trip is needed — which matters when the mailer is rate limited. */
  async function changePassword(password) {
    if (!state.session) { throw new Error("Sign in first."); }
    await call("/auth/v1/user", {
      method: "PUT",
      token: state.session.access_token,
      body: { password: password }
    });
    return true;
  }

  /* Requires a signed-in session — either a normal one or the recovery token. */
  async function updatePassword(password, sessionOverride) {
    var session = sessionOverride || state.session;
    if (!session) { throw new Error("Open the recovery link again."); }
    await call("/auth/v1/user", {
      method: "PUT",
      token: session.access_token,
      body: { password: password }
    });
    writeSession(null);
    state.session = null;
    state.profile = null;
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

  /* Plan names must read exactly as the Pricing page lists them. */
  var PLANS = [
    { id: "free", label: "Free" },
    { id: "pro", label: "Pro" },
    { id: "workshop", label: "Workshop" },
    { id: "business", label: "Business" }
  ];

  function planLabel(plan) {
    if (plan === "suspended") { return "Suspended"; }
    var found = PLANS.filter(function (p) { return p.id === plan; })[0];
    return found ? found.label : (plan || "Free");
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

  /* ------------------------------------------------------------------ plan limits
     These numbers are the pricing page's, nothing invented — keep the two in step.
     vehicles: 0 means unlimited. exports lists the formats the garage offers. */
  var PLAN_LIMITS = {
    free:     { vehicles: 1,  eu: 3,   exports: ["md"],                       seats: 1, bulk: false, api: false },
    pro:      { vehicles: 5,  eu: 10,  exports: ["md", "csv", "pdf"],         seats: 1, bulk: false, api: false },
    workshop: { vehicles: 25, eu: 40,  exports: ["md", "csv", "pdf", "xlsx"], seats: 3, bulk: true,  api: true },
    business: { vehicles: 0,  eu: 450, exports: ["md", "csv", "pdf", "xlsx"], seats: 0, bulk: true,  api: true }
  };

  function limits(plan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  }

  /* The cheapest plan that includes an export format. */
  function planNeededFor(format) {
    var order = ["free", "pro", "workshop", "business"];
    for (var i = 0; i < order.length; i += 1) {
      if (PLAN_LIMITS[order[i]].exports.indexOf(format) !== -1) { return order[i]; }
    }
    return "business";
  }

  /* ------------------------------------------------------------------ support view
     An owner can open the app as an admin, or as a user on any plan, and can also open it
     "as" one real account to see what that person sees. Either way it is a read-only view
     inside the owner's own session — it is not a session for that user, and it writes
     nothing on their behalf. */

  function viewAsProfile() {
    if (!isOwner()) { return null; }
    try {
      var raw = window.sessionStorage.getItem("cardna.viewAs");
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  /* What the app should show right now: the signed-in account, or the owner's preview. */
  function effective(profile) {
    var me = profile || state.profile;
    var view = viewAsProfile();

    if (!me) { return { role: "user", plan: "free", preview: false, email: "", id: "" }; }

    if (view && view.role) {
      return {
        role: view.role,
        plan: view.plan || "free",
        preview: true,
        email: view.email || me.email || "",
        id: view.id || me.id || ""
      };
    }

    return {
      role: me.role || "user",
      plan: me.plan || "free",
      preview: false,
      email: me.email || "",
      id: me.id || ""
    };
  }

  function effectiveRole() { return effective().role; }
  function effectivePlan() { return effective().plan; }

  /* null means no plan limits apply — staff are not on a plan. */
  function limitsNow() {
    var view = effective();
    if (view.role !== "user") { return null; }
    return limits(view.plan);
  }

  function canExport(format) {
    var lim = limitsNow();
    return !lim || lim.exports.indexOf(format) !== -1;
  }

  /* Stored by the owner console's "View as" switcher. Read-only by construction: no
     token is minted, so nothing can be written as the account being previewed. */
  function setViewAs(role, plan) {
    if (!isOwner()) { return false; }
    try {
      window.sessionStorage.setItem("cardna.viewAs", JSON.stringify({
        role: role || "user",
        plan: plan || "free",
        preview: true
      }));
    } catch (err) {
      return false;
    }
    return true;
  }

  function clearViewAs() {
    try { window.sessionStorage.removeItem("cardna.viewAs"); } catch (err) { /* ignore */ }
  }

  /* Hide the console from a view that does not have one. */
  function applyNavGate() {
    var view = effective();
    var staff = view.role === "owner" || view.role === "admin";

    document.querySelectorAll('a[href="admin.html"]').forEach(function (link) {
      link.hidden = !staff;
    });

    document.body.classList.toggle("is-preview", view.preview);
    document.body.setAttribute("data-view-role", view.role);
    document.body.setAttribute("data-view-plan", view.plan);
  }

  /* The badge is the only place the current role and plan are shown, so there is no second
     banner to collide with it. An account-level support view (the console's "View as") is
     someone else's data, so the forms on that page are kept out of reach. */
  function applySupportMode(target) {
    if (!target || !(target.id && target.email)) { return; }

    document.body.classList.add("is-support-view");

    document.querySelectorAll("form, #garage-download, #vault-app, #garage-clear").forEach(function (node) {
      node.setAttribute("aria-disabled", "true");
      node.style.pointerEvents = "none";
      node.style.opacity = ".55";
    });
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

  /* The badge's home is the header's inner row, so it lands in the top-right corner. */
  function chipHost() {
    return document.querySelector(".header-inner") ||
      document.querySelector(".site-header") ||
      document.body;
  }

  /* Switching the view reloads: every gate, cap and table then reflects the new role. */
  function switchView(role, plan) {
    if (!isOwner()) { return false; }
    if (!role || role === "owner") { clearViewAs(); }
    else { setViewAs(role, plan); }
    location.reload();
    return true;
  }

  function closeRoleMenus(except) {
    document.querySelectorAll(".role-menu[open]").forEach(function (menu) {
      if (menu !== except) { menu.open = false; }
    });
  }

  var menusBound = false;

  function bindMenus() {
    if (menusBound) { return; }
    menusBound = true;

    document.addEventListener("click", function (event) {
      if (event.target.closest && event.target.closest(".role-menu")) { return; }
      closeRoleMenus(null);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeRoleMenus(null); }
    });
  }

  function roleMenu(view) {
    var menu = document.createElement("details");
    menu.className = "role-menu";

    var summary = document.createElement("summary");
    summary.className = "account-chip-plan" + (view.preview ? " is-preview" : "");
    summary.textContent = view.preview
      ? roleLabel(view.role) + (view.role === "user" ? " · " + planLabel(view.plan) : "")
      : (view.role === "owner" ? "Owner"
        : (view.role === "admin" ? "Admin" : planLabel(view.plan)));
    summary.setAttribute("aria-label", "View the app as — currently " + summary.textContent);
    menu.appendChild(summary);

    var list = document.createElement("div");
    list.className = "role-menu-list";

    function choice(role, plan, text, note) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = text;

      var current = view.role === role &&
        (role !== "user" || planLabel(view.plan) === planLabel(plan));
      if (current) {
        button.className = "is-current";
        button.setAttribute("aria-current", "true");
      }

      if (note) {
        var span = document.createElement("span");
        span.textContent = (current ? "current · " : "") + note;
        button.appendChild(span);
      }

      button.addEventListener("click", function () {
        menu.open = false;
        switchView(role, plan);
      });
      list.appendChild(button);
    }

    choice("owner", "", "Owner", "everything, Business included");
    choice("admin", "", "Admin", "manage users, plans up to Workshop");
    choice("user", "free", "User · Free", "1 saved vehicle, Markdown export");
    choice("user", "pro", "User · Pro", "5 saved vehicles, CSV and PDF");
    choice("user", "workshop", "User · Workshop", "25 saved vehicles, Excel");
    choice("user", "business", "User · Business", "unlimited vehicles");

    if (view.role === "owner" || view.role === "admin") {
      var consoleLink = document.createElement("a");
      consoleLink.href = "admin.html";
      consoleLink.textContent = "Console";
      list.appendChild(consoleLink);
    }

    menu.appendChild(list);

    menu.addEventListener("toggle", function () {
      if (menu.open) { closeRoleMenus(menu); }
    });

    return menu;
  }

  function renderChip() {
    document.querySelectorAll("[data-account-chip]").forEach(function (node) { node.remove(); });

    var chip = document.createElement("div");
    chip.setAttribute("data-account-chip", "");
    chip.className = "account-chip";

    if (state.session && state.profile) {
      var who = document.createElement("span");
      who.className = "account-chip-who";
      who.textContent = state.profile.email || state.profile.display_name || "account";
      chip.appendChild(who);

      var view = effective();

      /* Owners get the view switcher; everyone else gets the same pill as a plain badge. */
      if (isOwner()) {
        chip.appendChild(roleMenu(view));
      } else {
        var badge = document.createElement("span");
        badge.className = "account-chip-plan";
        badge.textContent = view.role === "admin" ? "Admin" : planLabel(view.plan);
        chip.appendChild(badge);
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

    chipHost().appendChild(chip);
    bindMenus();
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

  /* ------------------------------------------------------------------ profile watch
     A plan granted in the console should reach the account without a reload. Polling the
     profile is cheap and needs no client library; when the plan, role or status moves, the
     chip, the gates and the garage are rebuilt and a cardna:profile event is fired. */
  var PROFILE_POLL = 60000;
  var pollTimer = null;

  function sameGrant(a, b) {
    return Boolean(a && b) &&
      a.plan === b.plan && a.role === b.role && a.status === b.status;
  }

  async function refreshProfile() {
    if (!state.session || document.hidden) { return null; }

    var fresh;
    try { fresh = await fetchProfile(state.session); }
    catch (err) { return null; }
    if (!fresh) { return null; }

    if (!sameGrant(state.profile, fresh)) {
      state.profile = fresh;

      var suspended = document.getElementById("access-suspended");
      if (suspended && !isBlocked()) { suspended.remove(); }

      renderChip();
      applyNavGate();
      renderSuspended();

      try {
        document.dispatchEvent(new CustomEvent("cardna:profile", { detail: fresh }));
      } catch (err) { /* older browsers */ }
    }

    return fresh;
  }

  function startProfileWatch() {
    if (pollTimer || !state.session) { return; }
    pollTimer = window.setInterval(refreshProfile, PROFILE_POLL);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { refreshProfile(); }
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

    /* A recovery or magic link lands with its tokens in the fragment. */
    var page = location.pathname.split("/").pop() || "index.html";
    var fromLink = tokensFromHash();
    if (fromLink && fromLink.session) {
      if (fromLink.type === "recovery") {
        /* reset.html reads these tokens itself — redirecting from there would loop. */
        if (page !== "reset.html") {
          location.replace("reset.html" + location.hash);
          return;
        }
      } else {
        var hydrated = await hydrateSession(fromLink.session);
        if (hydrated) {
          state.session = hydrated;
          state.profile = await fetchProfile(hydrated);
          clearHash();
          log("sign_in", { via: fromLink.type || "link" });
        }
      }
    }

    if (state.session && !state.profile) { state.profile = await fetchProfile(state.session); }

    state.ready = true;
    waiters.splice(0).forEach(function (fn) { fn(state.profile); });

    gate();
    renderChip();
    applyNavGate();
    if (state.session) {
      log("page_view", { path: location.pathname.split("/").pop() || "index.html" });
      renderSuspended();
      applySupportMode(viewAsProfile());
      startProfileWatch();
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
    recoverPassword: recoverPassword,
    updatePassword: updatePassword,
    changePassword: changePassword,
    tokensFromHash: tokensFromHash,
    hydrateSession: hydrateSession,
    clearHash: clearHash,
    updateProfile: updateProfile,
    planLabel: planLabel,
    plans: function () { return PLANS.slice(); },
    limits: limits,
    limitsNow: limitsNow,
    canExport: canExport,
    planNeededFor: planNeededFor,
    effective: effective,
    effectiveRole: effectiveRole,
    effectivePlan: effectivePlan,
    setViewAs: setViewAs,
    clearViewAs: clearViewAs,
    applyNavGate: applyNavGate,
    roleLabel: roleLabel,
    isOwner: isOwner,
    isStaff: isStaff,
    isBlocked: isBlocked,
    viewAsProfile: viewAsProfile,
    refreshProfile: refreshProfile,
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
