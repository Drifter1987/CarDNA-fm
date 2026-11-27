/* CarDNA — staff console.
   Three roles: owner (everything), admin (manage users), user (the app).
   Permission is enforced in Postgres by the RPCs this page calls — the UI only mirrors it:
     admin_set_plan(target_id, new_plan)
     admin_set_status(target_id, new_status, reason)
     owner_set_role(target_id, new_role)
   A project that has not run those functions yet will get a clear error, not silent failure. */

(function () {
  "use strict";

  var auth = window.CarDNAAuth;
  var PLANS = ["free", "pro", "workshop", "business"];
  var ROLES = ["user", "admin", "owner"];

  var appEl = document.getElementById("admin-app");
  var deniedEl = document.getElementById("admin-denied");
  var rowsEl = document.getElementById("admin-rows");
  var metaEl = document.getElementById("admin-meta");
  var statusEl = document.getElementById("admin-status");
  var searchEl = document.getElementById("admin-search");
  var activityEl = document.getElementById("admin-activity");

  var rows = [];
  var activity = [];
  var query = "";
  var previewRole = "";
  var previewPlan = "free";

  /* Sample rows so an owner can SEE what the admin and user views look like before
     there is a second real account. They are displayed only; every control on them
     is disabled and no RPC is ever sent for them. */
  var DEMO_ROWS = [
    { id: "demo-admin", demo: true, email: "admin@example.com", display_name: "Sam (sample)",
      role: "admin", plan: "free", status: "active", created_at: new Date().toISOString() },
    { id: "demo-user", demo: true, email: "rider@example.com", display_name: "Rider (sample)",
      role: "user", plan: "pro", status: "active", created_at: new Date().toISOString() },
    { id: "demo-blocked", demo: true, email: "abuser@example.com", display_name: "Blocked (sample)",
      role: "user", plan: "free", status: "blocked", blocked_reason: "Abuse",
      created_at: new Date().toISOString() }
  ];

  function displayRows() {
    var base = rows.filter(matches);
    if (!previewRole) { return base; }
    return base.concat(DEMO_ROWS.filter(matches));
  }

  /* Owner sees everything; admin sees the same table but may only act on users; the user
     preview is deliberately read-only so nothing can be changed by accident. */
  function actingRole() {
    return previewRole || (auth.state.profile && auth.state.profile.role) || "user";
  }

  function status(text, tone) {
    if (!statusEl) { return; }
    statusEl.textContent = text || "";
    if (tone) { statusEl.setAttribute("data-tone", tone); }
    else { statusEl.removeAttribute("data-tone"); }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function label(row) {
    return row.email || row.display_name || (row.id ? row.id.slice(0, 8) : "account");
  }

  function isSelf(row) {
    var me = auth.state && auth.state.profile;
    return Boolean(me && me.id && row.id && me.id === row.id);
  }

  /* Rows can arrive with a role or plan that is not exactly what the console writes
     ("User", " user ", an empty string from an older migration). Every comparison goes
     through these two, so one oddly cased row cannot hide its own controls. */
  function roleOf(row) {
    var raw = String(row.role || "user").toLowerCase().trim();
    return raw === "owner" || raw === "admin" ? raw : "user";
  }

  function planOf(row) {
    var raw = String(row.plan || "free").toLowerCase().trim();
    return PLANS.indexOf(raw) === -1 ? "free" : raw;
  }

  function joined(row) {
    if (!row.created_at) { return "—"; }
    try { return new Date(row.created_at).toISOString().slice(0, 10); }
    catch (err) { return "—"; }
  }

  function isBlocked(row) {
    return String(row.status || "").toLowerCase() === "blocked" ||
      String(row.plan || "").toLowerCase() === "suspended";
  }

  async function rpc(name, body) {
    if (!auth.state.session) { throw new Error("Not signed in."); }
    return auth.call("/rest/v1/rpc/" + name, {
      method: "POST",
      token: auth.state.session.access_token,
      body: body
    });
  }

  /* ------------------------------------------------------------------ stats */

  function renderStats() {
    var staff = rows.filter(function (r) {
      var role = roleOf(r);
      return role === "owner" || role === "admin";
    }).length;
    var paid = rows.filter(function (r) {
      var plan = planOf(r);
      return plan === "pro" || plan === "workshop" || plan === "business";
    }).length;
    var blocked = rows.filter(isBlocked).length;
    var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var fresh = rows.filter(function (r) {
      return r.created_at && new Date(r.created_at).getTime() > weekAgo;
    }).length;

    document.getElementById("stat-total").textContent = String(rows.length);
    document.getElementById("stat-staff").textContent = String(staff);
    document.getElementById("stat-paid").textContent = String(paid);
    document.getElementById("stat-blocked").textContent = String(blocked);
    document.getElementById("stat-active").textContent = String(rows.length - blocked);
    document.getElementById("stat-week").textContent = String(fresh);

    var mix = {};
    rows.forEach(function (r) { mix[planOf(r)] = (mix[planOf(r)] || 0) + 1; });
    document.getElementById("plan-mix").textContent =
      PLANS.filter(function (p) { return mix[p]; })
        .map(function (p) { return auth.planLabel(p) + " " + mix[p]; }).join("  ·  ") || "no accounts yet";
  }

  /* ------------------------------------------------------------------ activity */

  /* One line of detail for any event, whatever shape it has. */
  function eventDetail(event) {
    var d = event.detail || {};
    if (d.vin) { return d.vin; }
    if (d.format) { return "." + d.format; }
    if (d.summary) {
      return d.summary +
        (d.target_label ? " · " + d.target_label : "") +
        (d.by ? " · by " + d.by : "");
    }
    if (d.path) { return d.path; }
    return "";
  }

  /* Access changes are written to the same activity table as decodes and exports, so a
     grant has a name and a time next to it instead of vanishing. */
  function noteChange(kind, row, summary) {
    if (!auth.log) { return; }
    auth.log(kind, {
      target_id: row.id,
      target_label: label(row),
      summary: summary,
      by: (auth.state.profile && auth.state.profile.email) || ""
    });
  }

  /* The Activity tab: a table, not a list, with its own period and kind filters. */
  var activityFilter = { days: 14, kind: "" };

  /* One window for both tabs: the last N calendar days, today included, so the Activity table and
     the charts can never disagree about the same period again. */
  function windowStart(days) {
    var span = Math.max(1, Number(days) || 14);
    var start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return start.getTime() - (span - 1) * 86400000;
  }

  function activityEvents() {
    var days = Number(activityFilter.days);
    var since = days > 0 ? windowStart(days) : 0;

    return activity.filter(function (event) {
      if (!event.created_at) { return false; }
      if (since) {
        var at = new Date(event.created_at).getTime();
        if (isNaN(at) || at < since) { return false; }
      }
      if (activityFilter.kind && event.kind !== activityFilter.kind) { return false; }
      return true;
    });
  }

  function renderActivity() {
    if (!activityEl) { return; }

    activityEl.innerHTML = "";

    var list = activityEvents();
    var shown = list.slice(0, 200);
    var meta = document.getElementById("activity-meta");
    if (meta) {
      meta.textContent = list.length + " of " + activity.length + " events" +
        (activityFilter.kind ? " · " + activityFilter.kind : "") +
        (Number(activityFilter.days) > 0 ? " · last " + activityFilter.days + " days" : " · all recorded") +
        (shown.length < list.length ? " · showing the newest 200" : "");
    }

    if (!shown.length) {
      activityEl.innerHTML = '<tr><td colspan="4">No activity matches these filters.</td></tr>';
      return;
    }

    var byId = {};
    rows.forEach(function (row) { byId[row.id] = label(row); });

    shown.forEach(function (event) {
      var tr = document.createElement("tr");

      var when = document.createElement("td");
      when.className = "mono-dim";
      when.textContent = stamp(event.created_at);
      tr.appendChild(when);

      var kind = document.createElement("td");
      kind.textContent = event.kind || "event";
      tr.appendChild(kind);

      var who = document.createElement("td");
      who.textContent = byId[event.user_id] || (event.user_id || "").slice(0, 8);
      tr.appendChild(who);

      var detail = document.createElement("td");
      detail.className = "mono-dim";
      detail.textContent = eventDetail(event) || "—";
      tr.appendChild(detail);

      activityEl.appendChild(tr);
    });
  }

  async function loadEvents() {
    if (!activityEl) { return; }
    try {
      activity = await auth.call(
        "/rest/v1/events?select=kind,detail,created_at,user_id&order=created_at.desc&limit=500",
        { token: auth.state.session.access_token });
    } catch (err) {
      activity = [];
      activityEl.innerHTML = "<li>Activity is not available — the events table may be missing.</li>";
      renderAnalytics();
      return;
    }
    renderActivity();
    renderAnalytics();
    renderCharts();
  }

  /* ------------------------------------------------------------------ analytics */

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) { el.textContent = value; }
  }

  function stamp(value) {
    if (!value) { return "—"; }
    try { return new Date(value).toLocaleString(); }
    catch (err) { return "—"; }
  }

  function miniRow(text, count, onClick) {
    var li = document.createElement("li");

    var name = document.createElement(onClick ? "button" : "span");
    if (onClick) { name.type = "button"; }
    name.textContent = text;
    if (onClick) { name.addEventListener("click", onClick); }
    li.appendChild(name);

    if (count != null) {
      var total = document.createElement("span");
      total.className = "mini-count";
      total.textContent = String(count);
      li.appendChild(total);
    }
    return li;
  }

  /* Everything here is derived from the events table plus the account rows — no extra
     endpoints, and it is the owner's tool only. */
  function renderAnalytics() {
    var box = document.getElementById("admin-analytics");
    if (!box) { return; }

    var owner = actingRole() === "owner";
    box.hidden = !owner;
    if (!owner) { return; }

    var now = Date.now();
    var weekAgo = now - 7 * 86400000;

    var week = activity.filter(function (event) {
      if (!event.created_at) { return false; }
      var at = new Date(event.created_at).getTime();
      return !isNaN(at) && at >= weekAgo;
    });

    function countKind(kind) {
      return week.filter(function (event) { return event.kind === kind; }).length;
    }

    var people = {};
    week.forEach(function (event) { if (event.user_id) { people[event.user_id] = true; } });

    setText("kpi-decodes", String(countKind("decode")));
    setText("kpi-exports", String(countKind("export")));
    setText("kpi-signins", String(countKind("sign_in")));
    setText("kpi-people", String(Object.keys(people).length));

    /* The daily bars live on the Charts tab now, where the filters change what is drawn. */

    /* most active accounts */
    var topEl = document.getElementById("top-accounts");
    if (topEl) {
      topEl.innerHTML = "";

      var perUser = {};
      activity.forEach(function (event) {
        if (!event.user_id) { return; }
        perUser[event.user_id] = (perUser[event.user_id] || 0) + 1;
      });

      var names = {};
      rows.forEach(function (row) { names[row.id] = label(row); });

      var top = Object.keys(perUser).map(function (id) {
        return { id: id, count: perUser[id], name: names[id] || id.slice(0, 8) };
      }).sort(function (a, b) { return b.count - a.count; }).slice(0, 6);

      if (!top.length) {
        topEl.appendChild(miniRow("No activity recorded yet.", null, null));
      } else {
        top.forEach(function (entry) {
          topEl.appendChild(miniRow(entry.name, entry.count, function () {
            loadUserActivity(entry.id, entry.name);
          }));
        });
      }
    }

    /* blocked, with the reason the account was shown */
    var blockedEl = document.getElementById("blocked-list");
    if (blockedEl) {
      blockedEl.innerHTML = "";
      var blocked = rows.filter(isBlocked);

      if (!blocked.length) {
        blockedEl.appendChild(miniRow("No blocked accounts.", null, null));
      } else {
        blocked.slice(0, 8).forEach(function (row) {
          blockedEl.appendChild(miniRow(
            label(row) + (row.blocked_reason ? " · " + row.blocked_reason : ""),
            null,
            function () { loadUserActivity(row.id, label(row)); }
          ));
        });
      }
    }
  }

  /* ------------------------------------------------------------------ charts
     Three filters — period, kind, account — decide what every chart draws, so the rendered
     numbers are the ones the filters ask for rather than a fixed fortnight. */

  var chartFilter = { days: 14, kind: "", account: "" };

  function fillAccountFilter() {
    var select = document.getElementById("f-chart-account");
    if (!select || select.getAttribute("data-filled") === "yes") { return; }
    select.setAttribute("data-filled", "yes");

    rows.forEach(function (row) {
      var option = document.createElement("option");
      option.value = row.id;
      option.textContent = label(row);
      select.appendChild(option);
    });
  }

  function chartEvents() {
    var days = Number(chartFilter.days) || 14;
    var since = windowStart(days);

    return activity.filter(function (event) {
      if (!event.created_at) { return false; }
      var at = new Date(event.created_at).getTime();
      if (isNaN(at) || at < since) { return false; }
      if (chartFilter.kind && event.kind !== chartFilter.kind) { return false; }
      if (chartFilter.account && event.user_id !== chartFilter.account) { return false; }
      return true;
    });
  }

  function drawDaily(labels, counts) {
    var host = document.getElementById("chart-daily");
    if (!host) { return 0; }

    var max = Math.max.apply(null, counts.concat([1]));
    var total = counts.reduce(function (sum, n) { return sum + n; }, 0);
    var gap = labels.length > 21 ? 1.2 : 2.4;
    var width = (100 - gap * (labels.length - 1)) / labels.length;

    var svg = '<svg class="chart-svg" viewBox="0 0 100 48" preserveAspectRatio="none" ' +
      'role="img" aria-label="Events per day">';

    counts.forEach(function (count, at) {
      var height = (count / max) * 42;
      svg += '<rect x="' + (at * (width + gap)).toFixed(2) + '" y="' + (44 - height).toFixed(2) +
        '" width="' + width.toFixed(2) + '" height="' + height.toFixed(2) + '" rx="0.6"' +
        ' class="chart-bar' + (at === counts.length - 1 ? " is-today" : "") + '">' +
        "<title>" + labels[at] + " · " + count + (count === 1 ? " event" : " events") + "</title></rect>";
    });

    svg += '<line x1="0" y1="44.4" x2="100" y2="44.4" class="chart-axis"/></svg>';

    host.innerHTML = svg +
      '<div class="chart-legend"><span>' + labels[0] + "</span><span>" +
        labels[labels.length - 1] + "</span></div>" +
      '<div class="chart-scale">0 to ' + max + " a day</div>";

    return total;
  }

  function barList(hostId, pairs) {
    var host = document.getElementById(hostId);
    if (!host) { return; }

    host.innerHTML = "";
    if (!pairs.length) {
      host.innerHTML = '<li class="mono-dim">No events match these filters.</li>';
      return;
    }

    var top = pairs[0].count || 1;
    pairs.forEach(function (pair) {
      var li = document.createElement("li");
      li.className = "bar-row";
      li.innerHTML = '<span class="bar-name">' + escapeHtml(pair.name) + "</span>" +
        '<span class="bar-track"><span class="bar-fill" style="width:' +
        Math.max(2, Math.round((pair.count / top) * 100)) + '%"></span></span>' +
        '<span class="bar-count">' + pair.count + "</span>";
      host.appendChild(li);
    });
  }

  function renderCharts() {
    var host = document.getElementById("chart-daily");
    if (!host) { return; }

    if (actingRole() !== "owner") {
      host.innerHTML = '<p class="mono-dim">The charts are the owner\u2019s view.</p>';
      return;
    }

    fillAccountFilter();

    var days = Number(chartFilter.days) || 14;
    var labels = [];
    var counts = [];
    var index = {};

    for (var i = days - 1; i >= 0; i -= 1) {
      var key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      index[key] = labels.length;
      labels.push(key);
      counts.push(0);
    }

    var picked = chartEvents();
    picked.forEach(function (event) {
      var key = String(event.created_at).slice(0, 10);
      if (index[key] !== undefined) { counts[index[key]] += 1; }
    });

    var total = drawDaily(labels, counts);

    var caption = document.getElementById("spark-caption");
    if (caption) {
      var who = chartFilter.account ? rowById(chartFilter.account) : null;
      caption.textContent = total + " events in the last " + days + " days" +
        (chartFilter.kind ? " · " + chartFilter.kind : "") +
        (who ? " · " + label(who) : "") + " · today is the bright bar";
    }

    var byKind = {};
    picked.forEach(function (event) {
      var kind = event.kind || "event";
      byKind[kind] = (byKind[kind] || 0) + 1;
    });
    barList("chart-kinds", Object.keys(byKind).map(function (kind) {
      return { name: kind, count: byKind[kind] };
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 8));

    var names = {};
    rows.forEach(function (row) { names[row.id] = label(row); });

    var byAccount = {};
    picked.forEach(function (event) {
      if (!event.user_id) { return; }
      byAccount[event.user_id] = (byAccount[event.user_id] || 0) + 1;
    });
    barList("chart-accounts", Object.keys(byAccount).map(function (id) {
      return { name: names[id] || id.slice(0, 8), count: byAccount[id] };
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 8));
  }

  /* ------------------------------------------------------------------ tabs */

  var TABS = ["overview", "accounts", "activity", "charts"];

  function showTab(name, quiet) {
    if (TABS.indexOf(name) === -1) { name = "overview"; }

    TABS.forEach(function (id) {
      var button = document.getElementById("atab-" + id);
      var panel = document.getElementById("apanel-" + id);
      var on = id === name;

      if (button) {
        button.setAttribute("aria-selected", on ? "true" : "false");
        button.tabIndex = on ? 0 : -1;
      }
      if (panel) { panel.hidden = !on; }
    });

    if (!quiet && window.history && window.history.replaceState) {
      window.history.replaceState({}, "", location.pathname + location.search +
        (name === "overview" ? "" : "#" + name));
    }

    if (name === "charts") { renderCharts(); }
    if (name === "activity") { renderActivity(); }
  }

  function bindTabs() {
    var bar = document.getElementById("admin-tabs");
    if (!bar || bar.getAttribute("data-bound") === "yes") { return; }
    bar.setAttribute("data-bound", "yes");

    bar.addEventListener("click", function (event) {
      var button = event.target && event.target.closest ? event.target.closest("[data-admin-tab]") : null;
      if (!button) { return; }
      showTab(button.getAttribute("data-admin-tab"));
    });

    /* Arrow keys move between tabs, as the app's other tab strip already does. */
    bar.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") { return; }
      var current = document.activeElement;
      if (!current || !current.getAttribute("data-admin-tab")) { return; }
      event.preventDefault();

      var at = TABS.indexOf(current.getAttribute("data-admin-tab"));
      var next = TABS[(at + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
      var button = document.getElementById("atab-" + next);
      if (button) { button.focus(); showTab(next); }
    });

    document.querySelectorAll("[data-goto]").forEach(function (button) {
      button.addEventListener("click", function () { showTab(button.getAttribute("data-goto")); });
    });

    var hash = String(location.hash || "").replace(/^#/, "");
    showTab(TABS.indexOf(hash) === -1 ? "overview" : hash, true);
  }

  function bindCharts() {
    function on(id, handler) {
      var select = document.getElementById(id);
      if (!select || select.getAttribute("data-bound") === "yes") { return; }
      select.setAttribute("data-bound", "yes");
      select.addEventListener("change", handler);
    }

    on("f-chart-days", function () { chartFilter.days = Number(document.getElementById("f-chart-days").value) || 14; renderCharts(); });
    on("f-chart-kind", function () { chartFilter.kind = document.getElementById("f-chart-kind").value; renderCharts(); });
    on("f-chart-account", function () { chartFilter.account = document.getElementById("f-chart-account").value; renderCharts(); });

    on("f-activity-days", function () { activityFilter.days = Number(document.getElementById("f-activity-days").value); renderActivity(); });
    on("f-activity-kind", function () { activityFilter.kind = document.getElementById("f-activity-kind").value; renderActivity(); });
  }

  /* ------------------------------------------------------------------ one account's activity */

  function rowById(id) {
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].id === id) { return rows[i]; }
    }
    return null;
  }

  function facts(row) {
    if (!row) { return ""; }
    return "Role " + auth.roleLabel(roleOf(row)) +
      " · plan " + auth.planLabel(planOf(row)) +
      " · joined " + joined(row) +
      " · " + (isBlocked(row)
        ? "blocked" + (row.blocked_reason ? ": " + row.blocked_reason : "")
        : "active");
  }

  async function loadUserActivity(id, who) {
    var panel = document.getElementById("admin-user-activity");
    var list = document.getElementById("user-activity-list");
    if (!panel || !list) { return; }

    var row = rowById(id);
    panel.hidden = false;
    setText("user-activity-title", "Activity · " + who);
    setText("user-activity-facts", facts(row));
    setText("user-activity-meta", "");
    list.innerHTML = "<li>Loading…</li>";

    var token = auth.state.session.access_token;
    var mine = [];
    var about = [];

    /* What they did themselves… */
    try {
      mine = await auth.call(
        "/rest/v1/events?select=kind,detail,created_at&user_id=eq." +
          encodeURIComponent(id) + "&order=created_at.desc&limit=25",
        { token: token }) || [];
    } catch (err) { mine = []; }

    /* …and what was done to them: plan grants, role changes, blocks. */
    try {
      about = await auth.call(
        "/rest/v1/events?select=kind,detail,created_at&detail->>target_id=eq." +
          encodeURIComponent(id) + "&order=created_at.desc&limit=25",
        { token: token }) || [];
    } catch (err) { about = []; }

    var seen = {};
    var events = mine.concat(about).filter(function (event) {
      var key = String(event.created_at || "") + "|" + String(event.kind || "");
      if (seen[key]) { return false; }
      seen[key] = true;
      return true;
    }).sort(function (a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }).slice(0, 25);

    list.innerHTML = "";
    if (!events.length) {
      list.innerHTML = "<li>Nothing readable for this account. If it has used CarDNA, the " +
        "staff read policy on <code>events</code> is the missing piece.</li>";
      return;
    }

    events.forEach(function (event) {
      var li = document.createElement("li");

      var kind = document.createElement("span");
      kind.className = "act-kind";
      kind.textContent = event.kind || "event";
      li.appendChild(kind);

      var detail = document.createElement("span");
      detail.className = "act-who";
      detail.textContent = eventDetail(event);
      li.appendChild(detail);

      var at = document.createElement("span");
      at.className = "act-when";
      at.textContent = stamp(event.created_at);
      li.appendChild(at);

      list.appendChild(li);
    });

    if (panel.scrollIntoView) {
      try { panel.scrollIntoView({ block: "nearest" }); } catch (err) { /* old browsers */ }
    }
  }

  /* ------------------------------------------------------------------ table */

  function canManage(row) {
    var role = roleOf(row);
    if (role === "owner") { return false; }
    if (actingRole() === "owner") { return true; }
    if (actingRole() === "admin") { return role === "user"; }
    return false;
  }

  function matches(row) {
    if (!query) { return true; }
    var hay = (label(row) + " " + (row.display_name || "") + " " + planOf(row) + " " +
      roleOf(row)).toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function renderRows() {
    var list = displayRows();
    rowsEl.innerHTML = "";

    if (!list.length) {
      var empty = document.createElement("tr");
      empty.innerHTML = '<td colspan="5" style="color:var(--dim-2)">' +
        (rows.length ? "No account matches that search." : "No accounts yet.") + "</td>";
      rowsEl.appendChild(empty);
      metaEl.textContent = rows.length + " accounts";
      return;
    }

    list.forEach(function (row) {
      var editable = canManage(row);
      var tr = document.createElement("tr");

      var who = document.createElement("td");
      who.innerHTML = "<strong>" + escapeHtml(label(row)) + "</strong>" +
        (row.display_name && row.email
          ? '<div class="mono-dim">' + escapeHtml(row.display_name) + "</div>" : "");
      tr.appendChild(who);

      var cell = document.createElement("td");
      var box = document.createElement("div");
      box.className = "access-stack";

      var rowRole = roleOf(row);
      var rowPlan = planOf(row);
      var ownerView = actingRole() === "owner";

      /* Only the owner changes roles. An admin grants plans, not permissions. */
      var canEditRole = ownerView && editable && !row.demo &&
        row.id !== (auth.state.profile && auth.state.profile.id);

      if (canEditRole) {
        var roleWrap = document.createElement("label");
        roleWrap.className = "access-field";
        var roleLab = document.createElement("span");
        roleLab.className = "access-label";
        roleLab.textContent = "Role";

        var roleSelect = document.createElement("select");
        roleSelect.className = "role-select";
        roleSelect.setAttribute("aria-label", "Role for " + label(row));

        ["user", "admin", "owner"].forEach(function (role) {
          var option = document.createElement("option");
          option.value = role;
          option.textContent = auth.roleLabel(role);
          if (rowRole === role) { option.selected = true; }
          roleSelect.appendChild(option);
        });

        roleWrap.appendChild(roleLab);
        roleWrap.appendChild(roleSelect);
        box.appendChild(roleWrap);

        roleSelect.addEventListener("change", function () {
          setRole(row, roleSelect.value, roleSelect);
        });
      } else {
        var roleText = document.createElement("span");
        roleText.className = "access-static";
        roleText.textContent = auth.roleLabel(rowRole);
        box.appendChild(roleText);
      }

      /* The plan only means something for a normal user, so it appears under the
         role and only when the role is user. */
      if (rowRole === "user" && editable && !row.demo) {
        /* An admin may grant Free, Pro and Workshop. Business is the owner's alone, and an
           account already on it is shown rather than offered — a select that did not contain
           the current value would silently downgrade the account on the next change. */
        var adminCeiling = !ownerView && rowPlan === "business";

        if (adminCeiling) {
          var ceilingText = document.createElement("span");
          ceilingText.className = "access-static";
          ceilingText.textContent = "Business · owner only";
          box.appendChild(ceilingText);
        } else {
          var planOptions = ownerView ? PLANS.slice() : PLANS.filter(function (plan) {
            return plan !== "business";
          });

          var planWrap = document.createElement("label");
          planWrap.className = "access-field";
          var planLab = document.createElement("span");
          planLab.className = "access-label";
          planLab.textContent = ownerView ? "Plan" : "Plan · up to Workshop";

          var planSelect = document.createElement("select");
          planSelect.className = "plan-select";
          planSelect.setAttribute("aria-label", "Plan for " + label(row));

          planOptions.forEach(function (id) {
            var option = document.createElement("option");
            option.value = id;
            option.textContent = auth.planLabel(id);
            if (rowPlan === id) { option.selected = true; }
            planSelect.appendChild(option);
          });

          planWrap.appendChild(planLab);
          planWrap.appendChild(planSelect);
          box.appendChild(planWrap);

          planSelect.addEventListener("change", function () {
            setPlan(row, planSelect.value, planSelect);
          });
        }
      } else if (rowRole === "user") {
        var planText = document.createElement("span");
        planText.className = "access-static";
        planText.textContent = auth.planLabel(rowPlan);
        box.appendChild(planText);
      }

      cell.appendChild(box);
      tr.appendChild(cell);

      var statusCell = document.createElement("td");
      var pill = document.createElement("span");
      pill.className = "status-pill " + (isBlocked(row) ? "is-blocked" : "is-active");
      pill.textContent = isBlocked(row) ? "Blocked" : "Active";
      statusCell.appendChild(pill);
      tr.appendChild(statusCell);

      var date = document.createElement("td");
      date.textContent = joined(row);
      tr.appendChild(date);

      var actions = document.createElement("td");
      if (editable && !row.demo) {
        var block = document.createElement("button");
        block.type = "button";
        block.className = "btn btn--ghost btn--sm";
        block.textContent = isBlocked(row) ? "Unblock" : "Block";
        block.addEventListener("click", function () { setBlocked(row, block); });
        actions.appendChild(block);
      }

      if (actingRole() === "owner" && !row.demo) {
        var history = document.createElement("button");
        history.type = "button";
        history.className = "btn btn--ghost btn--sm";
        history.style.marginLeft = "6px";
        history.textContent = "Activity";
        history.title = "Open this account's recent activity";
        history.addEventListener("click", function () { loadUserActivity(row.id, label(row)); });
        actions.appendChild(history);
      }

      /* "Log in as" exists for the owner role only, and the database refuses every other address
         (docs/supabase-owner-act-as.sql). It opens that account's view read-only, and every use is
         written to the activity log. */
      if (window.CarDNAActAs && window.CarDNAActAs.ownerOnly() &&
          !window.CarDNAActAs.active() && row.id && !row.demo && !isSelf(row)) {
        var enter = document.createElement("button");
        enter.type = "button";
        enter.className = "btn btn--ghost btn--sm";
        enter.style.marginLeft = "6px";
        enter.textContent = "Log in as";
        enter.title = "Open this account's view, read-only — owner only, and recorded";
        /* Two steps, in the page: no native dialog (which a browser may accept silently), and
           nothing is opened until the second press says so. */
        var armed = false;
        var calm = null;

        enter.addEventListener("click", function () {
          if (!armed) {
            armed = true;
            enter.textContent = "Confirm view";
            enter.classList.add("is-armed");
            status("Open " + label(row) + "\u2019s view, read-only? Press Confirm view. " +
              "Nothing of theirs is changed.", "");
            calm = window.setTimeout(function () {
              armed = false;
              enter.textContent = "Log in as";
              enter.classList.remove("is-armed");
              /* The prompt goes with the arming: one that outlives it would ask for a press
                 that no longer means anything. */
              status("Nothing was opened.", "");
            }, 6000);
            return;
          }

          window.clearTimeout(calm);
          enter.disabled = true;
          enter.textContent = "Opening\u2026";
          window.CarDNAActAs.start(row.id).then(function (result) {
            if (result && !result.ok) {
              status(result.error || "That view could not be opened.", "error");
              enter.disabled = false;
              enter.textContent = "Log in as";
              enter.classList.remove("is-armed");
            }
          });
        });
        actions.appendChild(enter);
      }

      if (!actions.children.length) {
        actions.innerHTML = '<span class="mono-dim">—</span>';
      }
      tr.appendChild(actions);

      rowsEl.appendChild(tr);
    });

    /* Sample rows are display-only, so they must not inflate the real account count. */
    metaEl.textContent = previewRole
      ? list.length + " shown · " + rows.length + " real + " + DEMO_ROWS.length + " sample"
      : list.length + " of " + rows.length + " accounts";
  }

  /* ------------------------------------------------------------------ writes */

  async function setPlan(row, plan, control) {
    /* Mirrors the database trigger: the console is not the last line of defence. */
    if (plan === "business" && actingRole() !== "owner") {
      status("Only the owner can grant the Business plan.", "error");
      control.value = planOf(row);
      return;
    }

    control.disabled = true;
    var from = planOf(row);
    status("Saving " + label(row) + " → " + auth.planLabel(plan) + "…", "");
    try {
      await rpc("admin_set_plan", { target_id: row.id, new_plan: plan });
      row.plan = plan;
      noteChange("plan_change", row, auth.planLabel(from) + " → " + auth.planLabel(plan));
      status(label(row) + " is now " + auth.planLabel(plan) + ".", "ok");
      renderStats();
    } catch (err) {
      status(err.message || "That change did not save.", "error");
      control.value = planOf(row);
    } finally {
      control.disabled = false;
    }
  }

  async function setRole(row, role, control) {
    if (actingRole() !== "owner") {
      status("Only the owner can change a role.", "error");
      control.value = roleOf(row);
      return;
    }

    control.disabled = true;
    var from = roleOf(row);
    status("Setting " + label(row) + " to " + auth.roleLabel(role) + "…", "");
    try {
      await rpc("owner_set_role", { target_id: row.id, new_role: role });
      row.role = role;
      noteChange("role_change", row, auth.roleLabel(from) + " → " + auth.roleLabel(role));
      status(label(row) + " is now " + auth.roleLabel(role) + ".", "ok");
      renderRows();
      renderStats();
    } catch (err) {
      status(err.message || "That change did not save.", "error");
      control.value = row.role || "user";
    } finally {
      control.disabled = false;
    }
  }

  async function setBlocked(row, button) {
    var blocking = !isBlocked(row);
    var reason = "";

    if (blocking) {
      reason = window.prompt("Reason for blocking " + label(row) + "? (shown to them)", "");
      if (reason === null) { return; }
    } else if (!window.confirm("Restore access for " + label(row) + "?")) {
      return;
    }

    button.disabled = true;
    status(blocking ? "Blocking…" : "Restoring…", "");

    try {
      await rpc("admin_set_status", {
        target_id: row.id,
        new_status: blocking ? "blocked" : "active",
        reason: reason || null
      });
      row.status = blocking ? "blocked" : "active";
      row.blocked_reason = blocking ? reason : null;
      noteChange("status_change", row, blocking
        ? "Blocked" + (reason ? ": " + reason : "")
        : "Unblocked");
      status(blocking ? label(row) + " is blocked." : label(row) + " can use CarDNA again.", "ok");
      renderRows();
      renderStats();
    } catch (err) {
      status(err.message || "That change did not save.", "error");
    } finally {
      button.disabled = false;
    }
  }

  /* ------------------------------------------------------------------ load */

  async function loadAccounts() {
    metaEl.textContent = "Loading accounts…";

    try {
      rows = await auth.call("/rest/v1/profiles?select=*&order=created_at.desc",
        { token: auth.state.session.access_token });
    } catch (err) {
      metaEl.textContent = "";
      status("Could not read accounts: " + (err.message || "unknown error"), "error");
      return;
    }

    if (searchEl && !searchEl.getAttribute("data-bound")) {
      searchEl.setAttribute("data-bound", "yes");
      searchEl.addEventListener("input", function () {
        query = (searchEl.value || "").toLowerCase().trim();
        renderRows();
      });
    }

    /* A view stored by an earlier visit is picked up here, so the console always shows the
       role the app was last left in. */
    var savedView = auth.viewAsProfile();
    if (savedView && savedView.role && savedView.role !== "owner") {
      previewRole = savedView.role;
      previewPlan = savedView.plan || "free";
    }

    renderStats();
    renderRows();
    loadEvents();

    var closeActivity = document.getElementById("user-activity-close");

    if (closeActivity && !closeActivity.getAttribute("data-bound")) {
      closeActivity.setAttribute("data-bound", "yes");
      closeActivity.addEventListener("click", function () {
        var panel = document.getElementById("admin-user-activity");
        if (panel) { panel.hidden = true; }
      });
    }

    bindTabs();
    bindCharts();
    renderCharts();
    renderActivity();
  }

  /* ------------------------------------------------------------------ boot */

  auth.ready(function (profile) {
    var loadingEl = document.getElementById("admin-loading");
    if (loadingEl) { loadingEl.hidden = true; }

    var noConsoleEl = document.getElementById("admin-noconsole");
    var currentRole = auth.effectiveRole();
    var kicker = document.getElementById("admin-kicker");
    var footerLabel = document.getElementById("admin-footer-label");

    if (kicker) {
      kicker.textContent = currentRole === "owner" ? "Owner console"
        : (currentRole === "admin" ? "Admin console" : "User view");
    }
    if (footerLabel) {
      footerLabel.textContent = currentRole === "owner" ? "Owner console · actions are written to profiles"
        : (currentRole === "admin" ? "Admin console · actions are written to profiles"
          : "User view · no console access");
    }

    /* The page head promises controls, so it has to match the view that is actually showing. */
    var introEl = document.getElementById("admin-intro");
    if (introEl) {
      if (currentRole === "owner") {
        introEl.textContent = "Every account starts on Free. Grant a tier here, or suspend an " +
          "account to cut off access immediately — the gate is enforced by the database, not by this " +
          "page. The role and plan the app is showing are chosen from the badge in the top-right " +
          "corner, on every page.";
      } else if (currentRole === "admin") {
        introEl.textContent = "Every account starts on Free. An admin grants any tier up to " +
          "Workshop, and suspends an account to cut off access immediately — the gate is enforced by " +
          "the database, not by this page. Roles are changed by the owner alone. The role and plan the " +
          "app is showing are chosen from the badge in the top-right corner, on every page.";
      } else {
        introEl.textContent = "You are looking at CarDNA as an ordinary account sees it: no account " +
          "list, no role control and no plan grants. Pick Owner or Admin in the role badge at the top " +
          "right to come back to the console.";
      }    }

    /* An owner looking at another account must read as a read-only view, not as "you are not an
       owner" with a migration snippet — the console belongs to the owner either way. The notice is
       one block of markup with no inner paragraphs, so it is replaced whole. */
    if (window.CarDNAActAs && window.CarDNAActAs.active()) {
      var viewing = window.CarDNAActAs.profile();
      var who = (viewing && viewing.email) || "another account";
      var copy = document.getElementById("admin-denied-copy");
      if (copy) {
        copy.innerHTML = "<strong>You are in " + escapeHtml(who) + "\u2019s view.</strong> " +
          "Their data is read-only here, and the console belongs to the owner. Use " +
          "<em>Return to the owner console</em> in the bar at the top of the page to come back.";
      }
    }

    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
      appEl.hidden = true;
      deniedEl.hidden = false;
      return;
    }

    /* A user view has no console; say so instead of showing a read-only one. */
    if (currentRole === "user") {
      appEl.hidden = true;
      deniedEl.hidden = true;
      if (noConsoleEl) { noConsoleEl.hidden = false; }
      return;
    }

    appEl.hidden = false;
    deniedEl.hidden = true;

    loadAccounts();
  });
})();
