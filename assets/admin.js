/* CarDNA — owner console: stats and per-account plan control.
   Owner-only reads and writes are enforced by row-level security in Postgres; this page only
   hides the UI when the signed-in profile is not an owner. */

(function () {
  "use strict";

  var auth = window.CarDNAAuth;
  var PLANS = ["free", "pro", "workshop", "business", "suspended"];

  var appEl = document.getElementById("admin-app");
  var deniedEl = document.getElementById("admin-denied");
  var rowsEl = document.getElementById("admin-rows");
  var metaEl = document.getElementById("admin-meta");
  var statusEl = document.getElementById("admin-status");
  var searchEl = document.getElementById("admin-search");

  var rows = [];
  var query = "";

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
    try {
      return new Date(row.created_at).toISOString().slice(0, 10);
    } catch (err) {
      return "—";
    }
  }

  /* ------------------------------------------------------------------ stats */

  function renderStats() {
    var paid = rows.filter(function (r) {
      return r.plan === "pro" || r.plan === "workshop" || r.plan === "business";
    }).length;
    var suspended = rows.filter(function (r) { return r.plan === "suspended"; }).length;
    var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var fresh = rows.filter(function (r) {
      return r.created_at && new Date(r.created_at).getTime() > weekAgo;
    }).length;

    document.getElementById("stat-total").textContent = String(rows.length);
    document.getElementById("stat-paid").textContent = String(paid);
    document.getElementById("stat-suspended").textContent = String(suspended);
    document.getElementById("stat-week").textContent = String(fresh);

    var mix = {};
    rows.forEach(function (r) { mix[r.plan || "free"] = (mix[r.plan || "free"] || 0) + 1; });
    document.getElementById("plan-mix").textContent = PLANS.filter(function (p) { return mix[p]; })
      .map(function (p) { return auth.planLabel(p) + " " + mix[p]; }).join("  ·  ") || "no accounts yet";
  }

  /* ------------------------------------------------------------------ table */

  function matches(row) {
    if (!query) { return true; }
    var hay = (label(row) + " " + (row.display_name || "") + " " + (row.plan || "")).toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function renderRows() {
    var list = rows.filter(matches);
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
      var tr = document.createElement("tr");

      var who = document.createElement("td");
      who.innerHTML = "<strong>" + escapeHtml(label(row)) + "</strong>" +
        (row.display_name && row.email ? '<div class="mono-dim">' + escapeHtml(row.display_name) + "</div>" : "");
      tr.appendChild(who);

      var planCell = document.createElement("td");
      var select = document.createElement("select");
      select.className = "plan-select";
      select.setAttribute("aria-label", "Plan for " + label(row));
      PLANS.forEach(function (plan) {
        var option = document.createElement("option");
        option.value = plan;
        option.textContent = auth.planLabel(plan);
        if ((row.plan || "free") === plan) { option.selected = true; }
        select.appendChild(option);
      });
      planCell.appendChild(select);
      tr.appendChild(planCell);

      var role = document.createElement("td");
      role.textContent = row.role || "member";
      tr.appendChild(role);

      var date = document.createElement("td");
      date.textContent = joined(row);
      tr.appendChild(date);

      var actions = document.createElement("td");
      var save = document.createElement("button");
      save.type = "button";
      save.className = "btn btn--sm";
      save.textContent = "Save";
      save.addEventListener("click", function () {
        setPlan(row, select.value, save);
      });
      actions.appendChild(save);

      var suspend = document.createElement("button");
      suspend.type = "button";
      suspend.className = "btn btn--ghost btn--sm";
      suspend.style.marginLeft = "6px";
      var isOut = (row.plan || "free") === "suspended";
      suspend.textContent = isOut ? "Restore" : "Suspend";
      suspend.addEventListener("click", function () {
        setPlan(row, isOut ? "free" : "suspended", suspend);
      });
      actions.appendChild(suspend);

      tr.appendChild(actions);
      rowsEl.appendChild(tr);
    });

    metaEl.textContent = list.length + " of " + rows.length + " accounts";
  }

  /* ------------------------------------------------------------------ write */

  async function setPlan(row, plan, button) {
    if (!auth.state.session) { return; }

    var previous = row.plan;
    button.disabled = true;
    status("Saving " + label(row) + " → " + auth.planLabel(plan) + "…", "");

    try {
      await auth.call("/rest/v1/profiles?id=eq." + encodeURIComponent(row.id), {
        method: "PATCH",
        token: auth.state.session.access_token,
        headers: { Prefer: "return=minimal" },
        body: { plan: plan }
      });
      row.plan = plan;
      status(label(row) + " is now " + auth.planLabel(plan) + ".", "ok");
      renderStats();
      renderRows();
    } catch (err) {
      row.plan = previous;
      status(err.message || "That change did not save.", "error");
    } finally {
      button.disabled = false;
    }
  }

  /* ------------------------------------------------------------------ load */

  async function loadAccounts() {
    if (!auth.state.session) { return; }

    metaEl.textContent = "Loading accounts…";

    try {
      rows = await auth.call("/rest/v1/profiles?select=*&order=created_at.desc", {
        token: auth.state.session.access_token
      });
    } catch (err) {
      try {
        rows = await auth.call("/rest/v1/profiles?select=id,display_name,created_at&order=created_at.desc",
          { token: auth.state.session.access_token });
        status("The role and plan columns are missing. Run the owner SQL once, then reload.", "error");
      } catch (err2) {
        metaEl.textContent = "";
        status(err2.message || "Could not read accounts.", "error");
        return;
      }
    }

    if (searchEl) {
      searchEl.addEventListener("input", function () {
        query = (searchEl.value || "").toLowerCase().trim();
        renderRows();
      });
    }

    renderStats();
    renderRows();
  }

  /* ------------------------------------------------------------------ boot */

  auth.ready(function (profile) {
    if (!profile) {
      appEl.hidden = true;
      deniedEl.hidden = false;
      deniedEl.querySelector(".notice").innerHTML =
        "<strong>No owner account yet.</strong> Sign in, then run this once in the Supabase SQL " +
        "Editor to make that account the owner:<br><br>" +
        "<code>update public.profiles set role = 'owner' where email = 'you@example.com';</code>";
      return;
    }

    if (profile.role !== "owner") {
      appEl.hidden = true;
      deniedEl.hidden = false;
      return;
    }

    appEl.hidden = false;
    deniedEl.hidden = true;
    loadAccounts();
  });
})();
