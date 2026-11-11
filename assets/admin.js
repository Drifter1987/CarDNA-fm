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

  function joined(row) {
    if (!row.created_at) { return "—"; }
    try { return new Date(row.created_at).toISOString().slice(0, 10); }
    catch (err) { return "—"; }
  }

  function isBlocked(row) {
    return row.status === "blocked" || row.plan === "suspended";
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
    var staff = rows.filter(function (r) { return r.role === "owner" || r.role === "admin"; }).length;
    var paid = rows.filter(function (r) {
      return r.plan === "pro" || r.plan === "workshop" || r.plan === "business";
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
    document.getElementById("stat-week").textContent = String(fresh);

    var mix = {};
    rows.forEach(function (r) { mix[r.plan || "free"] = (mix[r.plan || "free"] || 0) + 1; });
    document.getElementById("plan-mix").textContent =
      PLANS.filter(function (p) { return mix[p]; })
        .map(function (p) { return auth.planLabel(p) + " " + mix[p]; }).join("  ·  ") || "no accounts yet";
  }

  /* ------------------------------------------------------------------ activity */

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

    activity.forEach(function (event) {
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
      detail.textContent = event.detail && event.detail.vin
        ? event.detail.vin
        : (event.detail && event.detail.format ? "." + event.detail.format : "");
      li.appendChild(detail);

      var when = document.createElement("span");
      when.className = "act-when";
      try {
        when.textContent = new Date(event.created_at).toLocaleString();
      } catch (err) { when.textContent = ""; }
      li.appendChild(when);

      activityEl.appendChild(li);
    });
  }

  async function loadActivity() {
    if (!activityEl) { return; }
    try {
      activity = await auth.call(
        "/rest/v1/events?select=kind,detail,created_at,user_id&order=created_at.desc&limit=40",
        { token: auth.state.session.access_token });
    } catch (err) {
      activity = [];
      activityEl.innerHTML = "<li>Activity is not available — run the events SQL once.</li>";
      return;
    }
    renderActivity();
  }

  /* ------------------------------------------------------------------ table */

  function canManage(row) {
    if (row.role === "owner") { return false; }
    if (actingRole() === "owner") { return true; }
    if (actingRole() === "admin") { return row.role === "user"; }
    return false;
  }

  function matches(row) {
    if (!query) { return true; }
    var hay = (label(row) + " " + (row.display_name || "") + " " + (row.plan || "") + " " +
      (row.role || "")).toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function renderRows() {
    var list = rows.filter(matches);
    rowsEl.innerHTML = "";

    if (!list.length) {
      var empty = document.createElement("tr");
      empty.innerHTML = '<td colspan="6" style="color:var(--dim-2)">' +
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

      var planCell = document.createElement("td");
      if (editable) {
        var planSelect = document.createElement("select");
        planSelect.className = "plan-select";
        planSelect.setAttribute("aria-label", "Plan for " + label(row));
        PLANS.forEach(function (plan) {
          var option = document.createElement("option");
          option.value = plan;
          option.textContent = auth.planLabel(plan);
          if ((row.plan || "free") === plan) { option.selected = true; }
          planSelect.appendChild(option);
        });
        planSelect.addEventListener("change", function () {
          setPlan(row, planSelect.value, planSelect);
        });
        planCell.appendChild(planSelect);
      } else {
        planCell.textContent = auth.planLabel(row.plan || "free");
      }
      tr.appendChild(planCell);

      var roleCell = document.createElement("td");
      if (actingRole() === "owner" && row.id !== (auth.state.profile && auth.state.profile.id)) {
        var roleSelect = document.createElement("select");
        roleSelect.className = "role-select";
        roleSelect.setAttribute("aria-label", "Role for " + label(row));
        ROLES.forEach(function (role) {
          var option = document.createElement("option");
          option.value = role;
          option.textContent = auth.roleLabel(role);
          if ((row.role || "user") === role) { option.selected = true; }
          roleSelect.appendChild(option);
        });
        roleSelect.addEventListener("change", function () {
          setRole(row, roleSelect.value, roleSelect);
        });
        roleCell.appendChild(roleSelect);
      } else {
        roleCell.textContent = auth.roleLabel(row.role || "user");
      }
      tr.appendChild(roleCell);

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
      if (editable) {
        var block = document.createElement("button");
        block.type = "button";
        block.className = "btn btn--ghost btn--sm";
        block.textContent = isBlocked(row) ? "Unblock" : "Block";
        block.addEventListener("click", function () { setBlocked(row, block); });
        actions.appendChild(block);
      }

      if (actingRole() === "owner" && row.id !== (auth.state.profile && auth.state.profile.id)) {
        var view = document.createElement("button");
        view.type = "button";
        view.className = "btn btn--ghost btn--sm";
        view.style.marginLeft = "6px";
        view.textContent = "View as";
        view.title = "Open the app with this role's view — read-only, no notification";
        view.addEventListener("click", function () { openSupportView(row); });
        actions.appendChild(view);
      }

      if (!actions.children.length) {
        actions.innerHTML = '<span class="mono-dim">—</span>';
      }
      tr.appendChild(actions);

      rowsEl.appendChild(tr);
    });

    metaEl.textContent = list.length + " of " + rows.length + " accounts";
  }

  /* ------------------------------------------------------------------ writes */

  async function setPlan(row, plan, control) {
    control.disabled = true;
    status("Saving " + label(row) + " → " + auth.planLabel(plan) + "…", "");
    try {
      await rpc("admin_set_plan", { target_id: row.id, new_plan: plan });
      row.plan = plan;
      status(label(row) + " is now " + auth.planLabel(plan) + ".", "ok");
      renderStats();
    } catch (err) {
      status(err.message || "That change did not save.", "error");
      control.value = row.plan || "free";
    } finally {
      control.disabled = false;
    }
  }

  async function setRole(row, role, control) {
    control.disabled = true;
    status("Setting " + label(row) + " to " + auth.roleLabel(role) + "…", "");
    try {
      await rpc("owner_set_role", { target_id: row.id, new_role: role });
      row.role = role;
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
      status(blocking ? label(row) + " is blocked." : label(row) + " can use CarDNA again.", "ok");
      renderRows();
      renderStats();
    } catch (err) {
      status(err.message || "That change did not save.", "error");
    } finally {
      button.disabled = false;
    }
  }

  /* ------------------------------------------------------------------ support view */

  function openSupportView(row) {
    try {
      window.sessionStorage.setItem("cardna.viewAs", JSON.stringify({
        id: row.id,
        email: row.email || "",
        role: row.role || "user",
        plan: row.plan || "free"
      }));
    } catch (err) { /* storage blocked */ }
    location.href = "index.html";
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

    renderStats();
    renderRows();
    loadActivity();

    var previewEl = document.getElementById("preview-role");
    if (previewEl && auth.isOwner()) {
      document.getElementById("admin-preview").hidden = false;
      previewEl.value = previewRole;
      previewEl.addEventListener("change", function () {
        previewRole = previewEl.value;
        renderRows();
        status(previewRole
          ? "Previewing the " + auth.roleLabel(previewRole) + " view — read-only."
          : "Back to the owner view.", previewRole ? "" : "ok");
      });
    }
  }

  /* ------------------------------------------------------------------ boot */

  auth.ready(function (profile) {
    if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
      appEl.hidden = true;
      deniedEl.hidden = false;
      return;
    }

    appEl.hidden = false;
    deniedEl.hidden = true;

    var kicker = document.querySelector(".page-head .kicker");
    if (kicker) { kicker.textContent = profile.role === "owner" ? "Owner console" : "Admin console"; }

    loadAccounts();
  });
})();
