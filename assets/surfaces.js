/* CarDNA — the surface runtime.
   A "surface" is a panel that is finished in the interface but whose service is not wired yet.
   The page owns the markup, a module owns the behaviour, this file owns the states:

     <div class="surface" data-surface="bulk" data-call="CarDNABulk.upload"
          data-needs="bulk" data-preview-copy="…">
       <span class="preview-flag" data-preview="bulkUpload"></span>
       …
       <input data-arg="file">
       <button type="button" data-surface-run>…</button>
       <p class="surface-status" data-surface-status aria-live="polite"></p>
     </div>

   Going live is: implement the called function in its module and set the flag in
   assets/preview.js. Nothing in this file changes — cardna-fm-plan.md §5 is the contract. */
(function () {
  "use strict";

  function auth() {
    return window.CarDNAAuth || null;
  }

  function planName() {
    var a = auth();
    return a && typeof a.effectivePlan === "function" ? a.effectivePlan() : "free";
  }

  function planLabel(plan) {
    var value = String(plan || "free");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /* Which plans include a capability. Mirrors PLAN_LIMITS in assets/auth.js. */
  function planFor(name) {
    if (name === "bulk" || name === "api" || name === "seats") { return "Workshop"; }
    return "Pro";
  }

  function capability(name) {
    var a = auth();
    if (!a || typeof a.limitsNow !== "function") { return true; }
    var lim = a.limitsNow();
    if (!lim) { return true; }                        /* staff are not on a plan */
    if (name === "seats") { return lim.seats === 0 || lim.seats > 1; }
    return Boolean(lim[name]);
  }

  function statusNode(section) {
    return section.querySelector("[data-surface-status]");
  }

  function outputNode(section) {
    return section.querySelector("[data-surface-output]");
  }

  function say(section, tone, text) {
    var node = statusNode(section);
    if (!node) { return; }
    node.textContent = text || "";
    if (tone) { node.setAttribute("data-tone", tone); }
    else { node.removeAttribute("data-tone"); }
  }

  function lockedText(name) {
    return "Included with " + planFor(name) + "; your plan is " + planLabel(planName()) +
      ". The interface is finished here on purpose — see the pricing page to move up.";
  }

  function collect(section) {
    var out = {};
    Array.prototype.slice.call(section.querySelectorAll("[data-arg]")).forEach(function (field) {
      var key = field.getAttribute("data-arg");
      if (field.type === "file") {
        out[key] = field.files && field.files[0] ? field.files[0] : null;
      } else {
        out[key] = field.value;
      }
    });
    return out;
  }

  function resolve(path) {
    var parts = String(path || "").split(".");
    if (parts.length !== 2 || !window[parts[0]]) { return null; }
    var host = window[parts[0]];
    var fn = host[parts[1]];
    return typeof fn === "function" ? function (args) { return fn.call(host, args); } : null;
  }

  function render(section, result) {
    /* A rich answer (a recall list) goes in its own region; the status line keeps the
       sentence, so a long result never replaces the explanation. */
    var out = outputNode(section);
    if (out) {
      out.innerHTML = result && result.ok && result.html ? result.html : "";
    }

    if (!result) {
      say(section, "error", "Nothing came back. Try again.");
      return;
    }
    if (result.ok) {
      say(section, "ok", result.message || "Done.");
      return;
    }
    if (result.error === "preview") {
      say(section, "note", result.message || section.getAttribute("data-preview-copy") ||
        "This is not connected yet.");
      return;
    }
    say(section, "error", result.message || result.error || "That did not work.");
  }

  function run(section, callPath, triggerNode) {
    var needs = section.getAttribute("data-needs");
    if (needs && !capability(needs)) {
      say(section, "note", lockedText(needs));
      return;
    }

    var call = resolve(callPath || section.getAttribute("data-call"));
    if (!call) {
      say(section, "error", "This panel is missing its module.");
      return;
    }

    var trigger = triggerNode || section.querySelector("[data-surface-run]");
    if (trigger) { trigger.disabled = true; }
    var previous = outputNode(section);
    if (previous) { previous.innerHTML = ""; }
    say(section, "note", section.getAttribute("data-working-copy") || "Working…");

    function done(result) {
      if (trigger) { trigger.disabled = false; }
      render(section, result);
      if (window.CarDNAPreview && typeof window.CarDNAPreview.scan === "function") {
        window.CarDNAPreview.scan();
      }
    }

    var out;
    try {
      out = call(collect(section));
    } catch (err) {
      done({ ok: false, error: (err && err.message) || "That did not work." });
      return;
    }

    if (out && typeof out.then === "function") {
      out.then(done, function (err) {
        done({ ok: false, error: (err && err.message) || "That did not work." });
      });
    } else {
      done(out);
    }
  }

  /* Show the locked state before anyone presses anything, so a lower plan is never
     presented with a control that only fails on click. Runs again once the account has
     resolved, because the plan is not known on first paint. */
  function prime() {
    Array.prototype.slice.call(document.querySelectorAll("[data-surface]")).forEach(function (section) {
      var needs = section.getAttribute("data-needs");
      if (!needs) { return; }

      if (capability(needs)) {
        if (section.getAttribute("data-locked") === "true") {
          section.removeAttribute("data-locked");
          say(section, null, "");
        }
        return;
      }

      section.setAttribute("data-locked", "true");
      say(section, "note", lockedText(needs));
    });
  }

  function bindSurfaces() {
    /* A panel may hold more than one action — "Your data" has an export and a deletion —
       so every trigger is bound, and each carries its own data-call. */
    Array.prototype.slice.call(document.querySelectorAll("[data-surface]")).forEach(function (section) {
      Array.prototype.slice.call(section.querySelectorAll("[data-surface-run]")).forEach(function (trigger) {
        trigger.addEventListener("click", function () {
          run(section, trigger.getAttribute("data-call"), trigger);
        });
      });
    });
  }

  /* A paid card's button: try the checkout, and when there is no processor yet hand the
     visitor to the waitlist underneath, with their plan already chosen. */
  function bindCheckout() {
    var note = document.getElementById("checkout-status");

    Array.prototype.slice.call(document.querySelectorAll("[data-checkout]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var plan = button.getAttribute("data-checkout");
        var interval = button.getAttribute("data-interval") || "month";
        var billing = window.CarDNABilling;
        var result = billing && typeof billing.startCheckout === "function"
          ? billing.startCheckout(plan, interval)
          : { ok: false, error: "preview" };

        if (note) {
          note.setAttribute("data-tone", result.ok ? "ok" : "note");
          note.textContent = result.ok
            ? "Checkout is open — finish in the new tab."
            : "Nothing can be charged yet: the card processor is not connected. Pick a plan below " +
              "and we will write when it opens.";
        }

        var select = document.getElementById("waitlist-plan");
        if (select && plan) {
          var option = select.querySelector('option[value="' + plan + '"]');
          if (option) { select.value = plan; }
        }

        var panel = document.getElementById("waitlist");
        if (panel && typeof panel.scrollIntoView === "function") {
          panel.scrollIntoView({ behavior: "smooth", block: "center" });
          var email = panel.querySelector('[data-arg="email"]');
          if (email) { window.setTimeout(function () { email.focus(); }, 320); }
        }
      });
    });
  }

  /* A file picker's label shows the chosen file's name, so the choice is visible before Run. */
  function bindFiles() {
    Array.prototype.slice.call(document.querySelectorAll("[data-surface] .file-pick input[type=\"file\"]")).forEach(function (field) {
      field.addEventListener("change", function () {
        var label = field.closest(".file-pick");
        var name = label && label.querySelector("[data-file-name]");
        if (name) {
          name.textContent = field.files && field.files[0] ? field.files[0].name : "No file chosen";
        }
      });
    });
  }

  function start() {
    bindSurfaces();
    bindCheckout();
    bindFiles();
    prime();

    var a = auth();
    if (a && typeof a.ready === "function") { a.ready(prime); }
  }

  window.CarDNASurfaces = { run: run, refresh: prime };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
