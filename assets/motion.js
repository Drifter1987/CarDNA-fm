/* CarDNA — motion layer
   Scroll reveals, counters, tab transitions and the 17-slot VIN scan that runs while a
   decode is in flight. All of it is optional decoration: if this file never loads, or the
   visitor prefers reduced motion, every page behaves exactly as before. */

(function () {
  "use strict";

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) { return; }

  var root = document.documentElement;
  root.classList.add("has-motion");

  var raf = window.requestAnimationFrame || function (fn) {
    return window.setTimeout(fn, 16);
  };

  /* ------------------------------------------------------------------ targets
     Elements that fade/slide in as they enter the viewport. Containers that hold other
     targets are skipped so a grid does not fade inside a fading parent. */

  var TARGETS = [
    ".panel > .container > *",
    ".section > .container > *",
    ".page-head > .container > *",
    ".hero > .container > *",
    ".grid-2 > *",
    ".grid-3 > *",
    ".grid-4 > *",
    ".tiers > .tier",
    ".stats > .stat",
    ".catalogue-grid > *",
    ".timeline > li",
    ".feature-list > li",
    ".brand-group",
    ".garage-item",
    ".card"
  ].join(",");

  var SKIP = ".grid-2, .grid-3, .grid-4, .tiers, .stats, .make-grid, " +
             ".catalogue-grid, .hero-grid, .app-scroll";

  var observer = null;

  /* One way to show an element, whichever path asked for it: the observer, a jump, or the
     safety pass. Revealing twice costs nothing. */
  function reveal(element) {
    if (!element || element.classList.contains("is-in")) { return; }
    element.classList.add("is-in");
    countInside(element);
    if (observer) { observer.unobserve(element); }
  }

  if ("IntersectionObserver" in window) {
    /* Any part of the element counts: a section taller than the viewport could never reach a
       ratio threshold, and stayed invisible. */
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        reveal(entry.target);
      });
    }, { threshold: 0, rootMargin: "0px 0px -4% 0px" });
  }

  function tag(element) {
    if (!element || element.nodeType !== 1) { return; }
    if (element.hasAttribute("data-motion-tagged")) { return; }
    if (element.matches(SKIP)) { return; }
    if (element.closest(".dna, .brand-models, .chips, #vin-result, .elsewhere ul")) { return; }

    element.setAttribute("data-motion-tagged", "");

    var parent = element.parentNode;
    var index = parent ? Array.prototype.indexOf.call(parent.children, element) : 0;
    element.style.setProperty("--motion-i", String(Math.max(0, Math.min(index, 6))));
    element.classList.add("motion-reveal");

    if (observer) {
      observer.observe(element);
    } else {
      reveal(element);
    }
  }

  function tagAll(scope) {
    var nodes = (scope || document).querySelectorAll(TARGETS);
    Array.prototype.forEach.call(nodes, tag);
  }

  /* ------------------------------------------------------------- never blank
     A page opened at its foot, or jumped there, must show what is on screen. Anything in
     view — and anything already passed — is revealed, so a jump cannot leave a section at
     opacity 0 waiting for an observer callback that already went by. */
  function sweep() {
    var nodes = document.querySelectorAll(".motion-reveal:not(.is-in)");
    if (!nodes.length) { return; }

    var height = window.innerHeight || 800;

    Array.prototype.forEach.call(nodes, function (element) {
      var rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top < height) { reveal(element); }
    });
  }

  var jump = { at: null, height: 0 };

  function onJump() {
    var offset = (document.querySelector(".app-scroll") || {}).scrollTop;
    if (offset === undefined || offset === null) { offset = window.pageYOffset || 0; }

    var height = window.innerHeight || 800;
    var moved = jump.at === null ? 0 : Math.abs(offset - jump.at);

    jump.at = offset;
    jump.height = height;

    if (jump.at === 0 || moved > height * 1.2) { sweep(); }
  }

  (document.querySelector(".app-scroll") || window)
    .addEventListener("scroll", onJump, { passive: true });

  /* ------------------------------------------------------------------ counters */

  function countInside(element) {
    if (!element || !element.querySelectorAll) { return; }
    if (element.hasAttribute("data-count")) { countUp(element); }
    Array.prototype.forEach.call(element.querySelectorAll("[data-count]"), countUp);
  }

  function countUp(element) {
    if (element.getAttribute("data-counted") === "yes") { return; }
    element.setAttribute("data-counted", "yes");

    var target = parseInt(element.getAttribute("data-count"), 10);
    if (!isFinite(target) || target <= 0) { return; }

    var finalText = element.textContent;
    var suffix = element.getAttribute("data-suffix") || "";
    var started = null;
    var duration = 1100;

    function frame(now) {
      if (started === null) { started = now; }
      var progress = Math.min(1, (now - started) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(target * eased);

      element.textContent = (value >= 1000 ? value.toLocaleString("en-US") : String(value)) + suffix;

      if (progress < 1) {
        raf(frame);
      } else {
        element.textContent = finalText;
      }
    }

    raf(frame);
  }

  /* ------------------------------------------------------------------ tabs */

  function animatePanel() {
    var panel = document.querySelector(".panel[role='tabpanel']:not([hidden])");
    if (!panel) { return; }
    panel.classList.remove("is-entering");
    void panel.offsetWidth;
    panel.classList.add("is-entering");
  }

  var tablist = document.querySelector(".tabbar-inner");
  if (tablist) {
    tablist.addEventListener("click", function (event) {
      var tab = event.target.closest ? event.target.closest("[data-tab]") : null;
      if (!tab) { return; }

      tab.classList.remove("is-popping");
      void tab.offsetWidth;
      tab.classList.add("is-popping");
      animatePanel();
    });

    window.addEventListener("hashchange", animatePanel);
  }

  /* ------------------------------------------------------------------ header */

  var scroller = document.querySelector(".app-scroll");
  var body = document.body;

  function onScroll() {
    var offset = scroller ? scroller.scrollTop : window.pageYOffset;
    body.classList.toggle("is-scrolled", (offset || 0) > 20);
  }

  (scroller || window).addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------ spotlight
     Cards and tiers get a lime glow that follows the pointer. */

  var spotlightTarget = null;
  var spotlightX = 0;
  var spotlightY = 0;
  var spotlightFrame = 0;

  document.addEventListener("pointermove", function (event) {
    var target = event.target.closest
      ? event.target.closest(".card, .tier, .diagram-frame")
      : null;

    if (!target) { return; }

    spotlightTarget = target;
    spotlightX = event.clientX;
    spotlightY = event.clientY;

    if (spotlightFrame) { return; }

    spotlightFrame = raf(function () {
      spotlightFrame = 0;
      if (!spotlightTarget) { return; }

      var rect = spotlightTarget.getBoundingClientRect();
      spotlightTarget.style.setProperty("--mx", (spotlightX - rect.left) + "px");
      spotlightTarget.style.setProperty("--my", (spotlightY - rect.top) + "px");
    });
  }, { passive: true });

  /* ------------------------------------------------------------------ VIN scan */

  function setupScan() {
    var form = document.getElementById("vin-form");
    var input = document.getElementById("vin");
    var result = document.getElementById("vin-result");

    if (!form || !input || !result) { return; }

    var host = form.closest(".decoder") || form.parentNode;
    if (!host) { return; }

    var CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
    var scan = null;

    function randomChar() {
      return CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }

    function start(vin) {
      stop();

      var element = document.createElement("div");
      element.className = "vin-scan";
      element.setAttribute("aria-hidden", "true");

      var slots = "";
      for (var i = 0; i < 17; i += 1) {
        slots += '<span class="vin-scan-char">' + randomChar() + "</span>";
      }

      element.innerHTML =
        '<div class="vin-scan-inner">' +
          '<div class="vin-scan-label">Reading VIN structure</div>' +
          '<div class="vin-scan-chars">' + slots + "</div>" +
          '<div class="vin-scan-track"><span class="vin-scan-bar"></span></div>' +
        "</div>";

      host.appendChild(element);
      void element.offsetWidth;
      element.classList.add("is-live");

      var characters = Array.prototype.slice.call(element.querySelectorAll(".vin-scan-char"));
      var timers = [];
      var locked = 0;

      var ticker = window.setInterval(function () {
        for (var i = locked; i < characters.length; i += 1) {
          characters[i].textContent = randomChar();
        }
      }, 48);

      for (var index = 0; index < characters.length; index += 1) {
        (function (position) {
          timers.push(window.setTimeout(function () {
            characters[position].textContent = vin.charAt(position) || randomChar();
            characters[position].classList.add("is-locked");
            locked = Math.max(locked, position + 1);
          }, 260 + position * 44));
        })(index);
      }

      /* never leave a scrim behind if the request hangs */
      timers.push(window.setTimeout(function () { stop(); }, 9000));

      scan = { el: element, ticker: ticker, timers: timers };
    }

    function stop() {
      if (!scan) { return; }

      var element = scan.el;
      window.clearInterval(scan.ticker);
      scan.timers.forEach(function (id) { window.clearTimeout(id); });
      scan = null;

      element.classList.remove("is-live");
      element.classList.add("is-done");

      window.setTimeout(function () {
        if (element.parentNode) { element.parentNode.removeChild(element); }
      }, 340);
    }

    function reveal() {
      var dna = result.querySelector(".dna");
      if (!dna || !dna.children.length) { return; }
      if (dna.getAttribute("data-revealed") === "yes") { return; }
      dna.setAttribute("data-revealed", "yes");

      Array.prototype.forEach.call(dna.children, function (child, index) {
        child.style.setProperty("--motion-i", String(Math.min(index, 8)));
      });

      dna.classList.remove("is-revealing");
      void dna.offsetWidth;
      dna.classList.add("is-revealing");
    }

    form.addEventListener("submit", function () {
      var vin = (input.value || "").trim().toUpperCase();
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) { return; }
      start(vin);
    });

    if (!("MutationObserver" in window)) { return; }

    var resultObserver = new MutationObserver(function () {
      var finished = result.querySelector(".dna-section") ||
        (result.querySelector(".dna-empty") && !result.querySelector(".spinner"));

      if (!finished) { return; }
      if (scan) { stop(); }
      reveal();
    });

    resultObserver.observe(result, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------ late lists
     The catalogue and the garage render after a fetch or on DOMContentLoaded, so tag
     their children as they land. */

  function watchContainer(id, selector) {
    var host = document.getElementById(id);
    if (!host || !("MutationObserver" in window)) { return; }

    var watcher = new MutationObserver(function () {
      Array.prototype.forEach.call(host.querySelectorAll(selector), tag);
    });

    watcher.observe(host, { childList: true });
  }

  function watchLists() {
    watchContainer("brand-groups", ".brand-group");
    watchContainer("garage-list", ".garage-item");
  }

  /* ------------------------------------------------------------------ boot */

  var booted = false;

  function boot() {
    if (booted) { return; }
    booted = true;

    tagAll(document);
    setupScan();
    watchLists();

    /* A deep link, an anchor, a restored scroll position or a reload that lands below the
       first screen must show what is there: sweep now, after the first frame, and once the
       page has fully loaded. */
    sweep();
    raf(sweep);
    window.addEventListener("load", sweep);
    window.addEventListener("hashchange", sweep);
    window.addEventListener("beforeprint", sweep);
    window.setTimeout(sweep, 1200);

    /* The very first scroll event must have a place to compare with, or the first jump is the
       one that measures nothing — which is exactly the jump that went blank. */
    var startOffset = document.querySelector(".app-scroll");
    jump.at = startOffset ? (startOffset.scrollTop || 0) : (window.pageYOffset || 0);
  }

  /* this file is loaded at the end of <body>, so the document is already parsed:
     tagging now keeps the first paint from flashing the final state */
  if (document.body) {
    boot();
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
