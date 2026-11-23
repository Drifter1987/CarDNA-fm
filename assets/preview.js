/* CarDNA — the start icon.
   Marks a feature that is finished in the interface but not wired yet. The contract is
   instructions.md §4: going live is `flags.<id> = true` (or `CarDNAPreview.flags.<id> = true`)
   plus the function named in cardna-fm-plan.md §5 — never a restyle, never a copy rewrite.

   Markup, anywhere on a page:
     <span class="preview-flag" data-preview="payments"></span>
   Optional: data-preview-for="element-id" also sets aria-describedby on that control. */
(function () {
  "use strict";

  var LABEL = "Coming soon";

  /* One key per flagged feature in cardna-fm-plan.md §4. A feature that is live has no key. */
  var flags = {
    payments: false,    /* F-12 checkout and plan purchase */
    euDecode: false,    /* F-13 European full specification */
    overage: false,     /* F-14 per-lookup overage billing */
    parts: false,       /* F-15 licensed parts catalogue */
    recalls: true,      /* F-16 — live: NHTSA public data, wired in Turn 33 */
    bulkUpload: false,  /* F-17 bulk VIN upload */
    apiKeys: false,     /* F-18 customer API key */
    seats: false,       /* F-19 seats and invitations */
    invoices: false,    /* F-20 invoice billing and SLA */
    waitlist: false,    /* F-22 waitlist capture */
    shareReport: false, /* F-23 public shareable report */
    gdpr: false         /* F-25 self-serve export and deletion */
  };

  var STAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M12 3.4l2.7 5.5 6 .9-4.4 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.3 9.8l6-.9z"/></svg>';

  var counter = 0;

  function isOn(id) {
    return flags[id] === true;
  }

  function label(id) {
    return isOn(id) ? "" : LABEL;
  }

  function describe(badge) {
    var targetId = badge.getAttribute("data-preview-for");
    if (!targetId) { return; }

    var target = document.getElementById(targetId);
    if (!target) { return; }

    var ids = (target.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (ids.indexOf(badge.id) === -1) { ids.push(badge.id); }
    target.setAttribute("aria-describedby", ids.join(" "));
  }

  /* Fill every badge on the page. Safe to call again after a dynamic render: the flag
     attribute stays put, only the paint changes. */
  function scan() {
    var nodes = document.querySelectorAll("[data-preview]");

    Array.prototype.slice.call(nodes).forEach(function (badge) {
      var id = badge.getAttribute("data-preview");
      if (!id) { return; }

      badge.classList.add("preview-flag");

      if (isOn(id)) {
        badge.textContent = "";
        badge.hidden = true;
        return;
      }

      if (!badge.id) {
        counter += 1;
        badge.id = "preview-flag-" + counter;
      }

      badge.hidden = false;
      badge.innerHTML = STAR + "<span>" + LABEL + "</span>";
      describe(badge);
    });
  }

  window.CarDNAPreview = {
    flags: flags,
    isOn: isOn,
    label: label,
    scan: scan
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
})();
