/* CarDNA — shared site header and footer. Each page supplies only mount points. */
(function () {
  "use strict";

  var ROOT_PAGES = [
    { key: "home", label: "Overview", path: "index.html" },
    { key: "decode", label: "Decode VIN", path: "decode.html" },
    { key: "brands", label: "Brands", path: "makes.html" },
    { key: "catalogue", label: "Catalogue", path: "index.html#catalogue" },
    { key: "pricing", label: "Pricing", path: "pricing.html" },
    { key: "garage", label: "Garage", path: "garage.html" },
    { key: "vault", label: "Vault", path: "vault.html" },
    { key: "company", label: "Company", path: "about.html" },
    { key: "admin", label: "Admin", path: "admin.html" }
  ];

  function currentPageKey() {
    var page = window.location.pathname.split("/").pop() || "index.html";
    var pages = {
      "index.html": "home",
      "decode.html": "decode",
      "makes.html": "brands",
      "pricing.html": "pricing",
      "garage.html": "garage",
      "vault.html": "vault",
      "about.html": "company",
      "admin.html": "admin"
    };
    var tabs = {
      "overview": "home",
      "decode": "decode",
      "brands": "brands",
      "catalogue": "catalogue",
      "pricing": "pricing"
    };
    var hash = (window.location.hash || "").slice(1);
    return page === "index.html" && tabs[hash] ? tabs[hash] : pages[page] || "";
  }

  function renderHeader(mount) {
    var root = mount.getAttribute("data-site-root") || "";
    var header = document.createElement("header");
    header.className = "site-header";
    header.setAttribute("data-site-root", root);
    header.innerHTML =
      '<div class="container header-inner">' +
        '<a class="logo" href="' + root + 'index.html" aria-label="CarDNA home">' +
          '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
            '<path d="M8 2c0 5 8 5 8 10s-8 5-8 10" stroke="#c6f24e" stroke-width="1.6" stroke-linecap="round"/>' +
            '<path d="M16 2c0 5-8 5-8 10s8 5 8 10" stroke="#c6f24e" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>' +
            '<path d="M9.4 6.2h5.2M9.1 12h5.8M9.4 17.8h5.2" stroke="#c6f24e" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>' +
          '</svg>' +
          '<span><span class="logo-word">CarDNA</span><span class="logo-sub">by GMOttomotive</span></span>' +
        '</a>' +
        '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
        '</button>' +
        '<nav class="nav" id="site-nav" aria-label="Primary navigation" data-open="false"></nav>' +
        '<div class="header-actions" aria-label="Display options"></div>' +
      '</div>';

    var nav = header.querySelector(".nav");
    var current = currentPageKey();
    ROOT_PAGES.forEach(function (item) {
      var link = document.createElement("a");
      link.href = root + item.path;
      link.textContent = item.label;
      link.setAttribute("data-nav", item.key);
      if (item.key === "admin") {
        link.setAttribute("data-admin-link", "");
        link.hidden = true;
      }
      if (item.key === current) { link.setAttribute("aria-current", "page"); }
      nav.appendChild(link);
    });

    mount.parentNode.replaceChild(header, mount);
  }

  function renderFooter() {
    var mount = document.querySelector("[data-site-footer]");
    if (!mount) { return false; }

    var root = mount.getAttribute("data-site-root") || "";
    var footer = document.createElement("footer");
    footer.className = "site-footer shared-footer";
    footer.innerHTML =
      '<div class="container">' +
        '<div class="footer-bottom">' +
          '<span>© ' + new Date().getFullYear() + ' GMOttomotive · CarDNA · <a href="' + root + 'legal.html">Legal</a></span>' +
          '<span><a href="' + root + 'legal.html#sources">Data sources</a></span>' +
        '</div>' +
      '</div>';

    mount.parentNode.replaceChild(footer, mount);
    return true;
  }

  var headerMount = document.querySelector("[data-site-header]");
  if (headerMount) { renderHeader(headerMount); }

  if (!renderFooter()) {
    if (window.MutationObserver) {
      var footerObserver = new MutationObserver(function () {
        if (renderFooter()) { footerObserver.disconnect(); }
      });
      footerObserver.observe(document.documentElement, { childList: true, subtree: true });
    } else {
      document.addEventListener("DOMContentLoaded", renderFooter);
    }
  }
})();
