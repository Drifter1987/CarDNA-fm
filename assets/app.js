/* CarDNA — shared UI behaviour */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- theme
     Dark by default; light when the visitor picks it, remembered per browser.
     The toggle sits in the header actions so it is reachable on every page. */
  var THEME_KEY = "cardna.theme";
  var root = document.documentElement;

  function applyTheme(theme) {
    if (theme === "light") { root.setAttribute("data-theme", "light"); }
    else { root.removeAttribute("data-theme"); }
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.textContent = theme === "light" ? "Dark" : "Light";
      button.setAttribute("aria-label",
        theme === "light" ? "Switch to dark mode" : "Switch to light mode");
    });
  }

  function currentTheme() {
    try { return window.localStorage.getItem(THEME_KEY) || "dark"; }
    catch (err) { return "dark"; }
  }

  applyTheme(currentTheme());

  function addToggle() {
    var host = document.querySelector(".header-actions") || document.querySelector(".nav");
    if (!host || host.querySelector("[data-theme-toggle]")) { return; }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.setAttribute("data-theme-toggle", "");
    if (host.classList.contains("nav")) { button.style.marginLeft = "6px"; }
    button.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      try { window.localStorage.setItem(THEME_KEY, next); } catch (err) { /* ignore */ }
      applyTheme(next);
    });
    host.appendChild(button);
    applyTheme(currentTheme());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addToggle);
  } else {
    addToggle();
  }

  /* mobile navigation */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.tagName === "A") {
        nav.setAttribute("data-open", "false");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* current year */
  var year = document.getElementById("year");
  if (year) { year.textContent = String(new Date().getFullYear()); }

  /* copy-to-clipboard buttons (delegated, so results rendered later work too) */
  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest ? event.target.closest("[data-copy]") : null;
    if (!button) { return; }

    var value = button.getAttribute("data-copy");
    if (!value) { return; }

    var done = function () {
      var original = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(function () { button.textContent = original; }, 1600);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done, function () { /* ignore */ });
    }
  });

  /* ---------------------------------------------------------------- tabs */
  var tablist = document.querySelector(".tabbar-inner");
  if (!tablist) { return; }

  var tabs = Array.prototype.slice.call(tablist.querySelectorAll("[data-tab]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel[role='tabpanel']"));

  function activate(name, updateHash) {
    var found = false;

    tabs.forEach(function (tab) {
      var selected = tab.getAttribute("data-tab") === name;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      if (selected) { found = true; }
    });

    if (!found) { return false; }

    panels.forEach(function (panel) {
      panel.hidden = panel.id !== "panel-" + name;
    });

    var scroller = document.querySelector(".app-scroll");
    if (scroller) { scroller.scrollTop = 0; }

    if (updateHash !== false && window.history.replaceState) {
      window.history.replaceState({}, "", "#" + name);
    }
    return true;
  }

  tablist.addEventListener("click", function (event) {
    var tab = event.target.closest ? event.target.closest("[data-tab]") : null;
    if (!tab) { return; }
    activate(tab.getAttribute("data-tab"), true);
  });

  tablist.addEventListener("keydown", function (event) {
    var keys = { ArrowRight: 1, ArrowLeft: -1 };
    if (!(event.key in keys)) { return; }
    event.preventDefault();

    var current = tabs.findIndex(function (tab) {
      return tab.getAttribute("aria-selected") === "true";
    });
    var next = (current + keys[event.key] + tabs.length) % tabs.length;
    activate(tabs[next].getAttribute("data-tab"), true);
    tabs[next].focus();
  });

  /* deep links: index.html#catalogue → open that tab */
  var fromHash = (window.location.hash || "").replace("#", "");
  if (!activate(fromHash, false)) { activate("overview", false); }

  window.addEventListener("hashchange", function () {
    activate((window.location.hash || "").replace("#", ""), false);
  });

  /* links on this page that point at a tab */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    if (link.closest(".tabbar")) { return; }
    link.addEventListener("click", function () {
      activate(link.getAttribute("href").slice(1), true);
    });
  });
})();
