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

  function renderActivity() {
    if (!activityEl) { return; }
    activityEl.innerHTML = "";

    if (!activity.length) {
      var empty = document.createElement("li");
      empty.textContent = "No activity recorded yet.";
      activityEl.appendChild(empty);
      return;
    }

    var byId = {};
    rows.forEach(function (row) { byId[row.id] = label(row); });

    activity.slice(0, 40).forEach(function (event) {
      var li = document.createElement("li");

      var kind = document.createElement("span");
      kind.className = "act-kind";
      kind.textContent = event.kind || "event";
      li.appendChild(kind);

      var who = document.createElement("span");
      who.className = "act-who";
      who.textContent = byId[event.user_id] || (event.user_id || "").slice(0, 8);
      li.appendChild(who);

      var detail = document.createElement("span");
      detail.className = "act-when";
      detail.textContent = eventDetail(event);
      li.appendChild(detail);

      var when = document.createElement("span");
      when.className = "act-when";
      when.textContent = stamp(event.created_at);
      li.appendChild(when);

      activityEl.appendChild(li);
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

    /* fourteen day bars */
    var spark = document.getElementById("spark");
    if (spark) {
      spark.innerHTML = "";

      var labels = [];
      var counts = [];
      for (var i = 13; i >= 0; i -= 1) {
        labels.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
        counts.push(0);
      }

      var index = {};
      labels.forEach(function (key, at) { index[key] = at; });

      activity.forEach(function (event) {
        if (!event.created_at) { return; }
        var key = String(event.created_at).slice(0, 10);
        if (index[key] !== undefined) { counts[index[key]] += 1; }
      });

      var max = 1;
      counts.forEach(function (n) { if (n > max) { max = n; } });

      var total = 0;
      counts.forEach(function (n, at) {
        total += n;
        var bar = document.createElement("div");
        bar.className = "spark-bar" + (at === counts.length - 1 ? " is-today" : "");
        bar.style.height = Math.max(3, Math.round((n / max) * 100)) + "%";
        bar.title = labels[at] + " · " + n + (n === 1 ? " event" : " events");
        spark.appendChild(bar);
      });

      setText("spark-caption", total + " events in the last 14 days · today is the bright bar");
    }

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
