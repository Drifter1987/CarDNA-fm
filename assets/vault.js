/* CarDNA — private vault
   VINs encrypted in the browser with a pass phrase. Nothing is uploaded: the cipher text
   lives in this browser's storage and in any file you download yourself. */

(function () {
  "use strict";

  var STORE_KEY = "cardna.vault";
  var FORMAT = "cardna-vault/1";
  var ITERATIONS = 210000;
  var MIN_PASS = 8;
  var LIST_CAP = 400;

  var VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/g;

  var host = document.getElementById("vault-app");
  if (!host) { return; }

  var lockedPanel = document.getElementById("vault-locked");
  var openPanel = document.getElementById("vault-open");
  var fileInput = document.getElementById("vault-file");
  var statusEl = document.getElementById("vault-status");

  var cryptoOk = Boolean(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);

  var state = { record: null, pass: "", text: "", saved: "" };

  /* ------------------------------------------------------------------ helpers */

  function setStatus(text, tone) {
    if (!statusEl) { return; }
    statusEl.textContent = text || "";
    if (tone) { statusEl.setAttribute("data-tone", tone); }
    else { statusEl.removeAttribute("data-tone"); }
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function toBase64(bytes) {
    var binary = "";
    for (var i = 0; i < bytes.length; i += 1) { binary += String.fromCharCode(bytes[i]); }
    return window.btoa(binary);
  }

  function fromBase64(value) {
    var binary = window.atob(String(value || ""));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) { bytes[i] = binary.charCodeAt(i); }
    return bytes;
  }

  function looksLikeVault(record) {
    return Boolean(record && record.cipherText && record.salt && record.iv);
  }

  /* ------------------------------------------------------------------ crypto */

  function deriveKey(passPhrase, salt, iterations) {
    var encoder = new TextEncoder();

    return window.crypto.subtle
      .importKey("raw", encoder.encode(passPhrase), "PBKDF2", false, ["deriveKey"])
      .then(function (base) {
        return window.crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: salt, iterations: iterations || ITERATIONS, hash: "SHA-256" },
          base,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"]
        );
      });
  }

  function encryptVault(text, passPhrase) {
    var salt = window.crypto.getRandomValues(new Uint8Array(16));
    var iv = window.crypto.getRandomValues(new Uint8Array(12));

    return deriveKey(passPhrase, salt, ITERATIONS)
      .then(function (key) {
        return window.crypto.subtle.encrypt(
          { name: "AES-GCM", iv: iv },
          key,
          new TextEncoder().encode(text)
        );
      })
      .then(function (buffer) {
        return {
          format: FORMAT,
          kdf: "PBKDF2-SHA256",
          iterations: ITERATIONS,
          salt: toBase64(salt),
          iv: toBase64(iv),
          cipherText: toBase64(new Uint8Array(buffer)),
          updated: new Date().toISOString()
        };
      });
  }

  function decryptVault(record, passPhrase) {
    var salt = fromBase64(record.salt);
    var iv = fromBase64(record.iv);
    var data = fromBase64(record.cipherText);

    return deriveKey(passPhrase, salt, Number(record.iterations) || ITERATIONS)
      .then(function (key) {
        return window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
      })
      .then(function (buffer) {
        return new TextDecoder().decode(buffer);
      });
  }

  /* ------------------------------------------------------------------ parsing
     Finds every valid VIN in the text, one or many per line. A line holding exactly one
     VIN keeps the rest of the line as a note. */

  function parseVins(text) {
    var items = [];
    var seen = Object.create(null);
    var skipped = 0;

    String(text || "").split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line || line.charAt(0) === "#") { return; }

      var found = line.match(VIN_RE) || [];
      if (!found.length) { skipped += 1; return; }

      var note = "";
      if (found.length === 1) {
        note = line.replace(found[0], " ")
          .replace(/^[-\s—,;|:]+/, "")
          .trim();
      }

      found.forEach(function (value) {
        var vin = value.toUpperCase();
        if (seen[vin]) { return; }
        seen[vin] = true;
        items.push({ vin: vin, note: note });
      });
    });

    return { items: items, skipped: skipped };
  }

  /* ------------------------------------------------------------------ rendering */

  function pickPass() {
    var a = document.getElementById("vault-pass");
    var b = document.getElementById("vault-pass2");
    var typed = a ? a.value : "";

    if (!typed) {
      if (!state.pass) {
        setStatus("Enter a pass phrase of at least 8 characters.", "error");
        if (a) { a.focus(); }
        return "";
      }
      return state.pass;
    }

    if (typed.length < MIN_PASS) {
      setStatus("Use at least " + MIN_PASS + " characters.", "error");
      if (a) { a.focus(); }
      return "";
    }

    if (state.pass && (!b || !b.value)) {
      setStatus("Repeat the new pass phrase to change it.", "error");
      if (b) { b.focus(); }
      return "";
    }

    if (b && b.value && b.value !== typed) {
      setStatus("The two pass phrases do not match.", "error");
      b.focus();
      return "";
    }

    return typed;
  }

  function clearPassFields() {
    ["vault-pass", "vault-pass2"].forEach(function (id) {
      var field = document.getElementById(id);
      if (field) { field.value = ""; }
    });
  }

  function renderList() {
    var listEl = document.getElementById("vault-list");
    var countEl = document.getElementById("vault-count");
    if (!listEl) { return; }

    var parsed = parseVins(state.text);
    var items = parsed.items;

    if (countEl) {
      countEl.textContent = items.length + (items.length === 1 ? " VIN" : " VINs") +
        (parsed.skipped ? " · " + parsed.skipped + " line" +
          (parsed.skipped === 1 ? "" : "s") + " skipped" : "");
    }

    listEl.innerHTML = "";

    if (!items.length) {
      var empty = document.createElement("li");
      empty.className = "vault-row";
      empty.textContent = "No VINs yet. Paste them above, one per line.";
      listEl.appendChild(empty);
      return;
    }

    var shown = items.slice(0, LIST_CAP);

    shown.forEach(function (item) {
      var row = document.createElement("li");
      row.className = "vault-row";

      var vin = document.createElement("span");
      vin.className = "vault-vin";
      vin.textContent = item.vin;
      row.appendChild(vin);

      if (item.note) {
        var note = document.createElement("span");
        note.className = "vault-note";
        note.textContent = item.note;
        row.appendChild(note);
      } else {
        var spacer = document.createElement("span");
        spacer.className = "vault-note";
        row.appendChild(spacer);
      }

      var open = document.createElement("a");
      open.className = "btn btn--ghost btn--sm";
      open.href = "decode.html?vin=" + encodeURIComponent(item.vin);
      open.textContent = "Decode";
      row.appendChild(open);

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn--ghost btn--sm";
      remove.textContent = "Remove";
      remove.addEventListener("click", function () {
        var lines = state.text.split(/\r?\n/).filter(function (line) {
          return line.indexOf(item.vin) === -1;
        });
        state.text = lines.join("\n");
        var textarea = document.getElementById("vault-text");
        if (textarea) { textarea.value = state.text; }
        renderList();
      });
      row.appendChild(remove);

      listEl.appendChild(row);
    });

    if (items.length > shown.length) {
      var rest = document.createElement("li");
      rest.className = "vault-row";
      rest.textContent = "and " + (items.length - shown.length) + " more in the list above.";
      listEl.appendChild(rest);
    }
  }

  function refresh() {
    var hasRecord = looksLikeVault(state.record);
    var open = Boolean(state.pass) || !hasRecord;

    if (lockedPanel) { lockedPanel.hidden = open; }
    if (openPanel) { openPanel.hidden = !open; }

    var textarea = document.getElementById("vault-text");
    if (textarea && textarea.value !== state.text) { textarea.value = state.text; }

    if (open) { renderList(); }
  }

  /* ------------------------------------------------------------------ actions */

  function save() {
    var pass = pickPass();
    if (!pass) { return; }

    setStatus("Encrypting…", "");
    var text = state.text;

    encryptVault(text, pass).then(function (record) {
      state.record = record;
      state.pass = pass;
      state.saved = text;
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(record));
      } catch (err) {
        setStatus("Could not write to this browser's storage: " + err.message, "error");
        return;
      }
      setStatus(parseVins(text).items.length + " VINs encrypted and saved in this browser.", "ok");
      clearPassFields();
      refresh();
    }).catch(function (err) {
      setStatus("Could not save: " + (err && err.message ? err.message : String(err)), "error");
    });
  }

  function unlock() {
    if (!state.record) { return; }

    var field = document.getElementById("vault-unlock-pass");
    var pass = field ? field.value : "";

    if (!pass) {
      setStatus("Enter the pass phrase for this vault.", "error");
      if (field) { field.focus(); }
      return;
    }

    setStatus("Unlocking…", "");

    decryptVault(state.record, pass).then(function (text) {
      state.text = text;
      state.saved = text;
      state.pass = pass;
      if (field) { field.value = ""; }
      refresh();
      setStatus("Unlocked. Only this tab holds the plain list.", "ok");
    }).catch(function () {
      setStatus("Wrong pass phrase — nothing was opened.", "error");
      if (field) { field.value = ""; field.focus(); }
    });
  }

  function lock() {
    if (state.text.trim() && state.text !== state.saved &&
      !window.confirm("You have unsaved changes. Lock the vault and discard them?")) {
      return;
    }

    state.pass = "";
    state.text = "";
    state.saved = "";
    var textarea = document.getElementById("vault-text");
    if (textarea) { textarea.value = ""; }
    refresh();
    setStatus("Locked. The encrypted copy is still in this browser.", "");
  }

  function forget() {
    if (!window.confirm("Delete the encrypted vault from this browser? " +
      "Any file you downloaded is unaffected.")) { return; }

    try { window.localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }

    state = { record: null, pass: "", text: "", saved: "" };
    var textarea = document.getElementById("vault-text");
    if (textarea) { textarea.value = ""; }
    refresh();
    setStatus("Deleted from this browser.", "");
  }

  function downloadBlob(content, type, name) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadEncrypted() {
    var pass = pickPass();
    if (!pass) { return; }

    setStatus("Encrypting…", "");

    encryptVault(state.text, pass).then(function (record) {
      downloadBlob(JSON.stringify(record, null, 2), "application/json",
        "cardna-vault-" + today() + ".json");
      setStatus("Encrypted file downloaded. It needs this pass phrase to open.", "ok");
    }).catch(function (err) {
      setStatus("Could not export: " + (err && err.message ? err.message : String(err)), "error");
    });
  }

  function exportPlain() {
    if (!window.confirm("This downloads your VINs as unencrypted text. Continue?")) { return; }
    downloadBlob(state.text, "text/plain", "cardna-vins-" + today() + ".txt");
    setStatus("Plain file downloaded — store it carefully.", "");
  }

  function loadFile(file) {
    var reader = new FileReader();

    reader.onload = function () {
      var record = null;
      try {
        record = JSON.parse(String(reader.result));
      } catch (err) {
        record = null;
      }

      if (!looksLikeVault(record)) {
        setStatus("That file is not a CarDNA vault.", "error");
        return;
      }

      state.record = record;
      state.pass = "";
      state.text = "";
      state.saved = "";
      var textarea = document.getElementById("vault-text");
      if (textarea) { textarea.value = ""; }
      refresh();
      setStatus("Loaded " + file.name + " — unlock it with its pass phrase.", "");
    };

    reader.onerror = function () {
      setStatus("That file could not be read.", "error");
    };

    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------ wiring */

  if (!cryptoOk) {
    if (openPanel) { openPanel.hidden = true; }
    if (lockedPanel) { lockedPanel.hidden = true; }
    setStatus("This vault needs Web Crypto, which browsers only expose on https " +
      "or on localhost. Open this page from the published site, or serve the folder locally.", "error");
    return;
  }

  try {
    var raw = window.localStorage.getItem(STORE_KEY);
    var stored = raw ? JSON.parse(raw) : null;
    state.record = looksLikeVault(stored) ? stored : null;
  } catch (err) {
    state.record = null;
  }

  var unlockBtn = document.getElementById("vault-unlock");
  if (unlockBtn) { unlockBtn.addEventListener("click", unlock); }

  var lockPass = document.getElementById("vault-unlock-pass");
  if (lockedPanel && lockPass) {
    lockPass.addEventListener("keydown", function (event) {
      if (event.key === "Enter") { event.preventDefault(); unlock(); }
    });
  }

  var forgetBtn = document.getElementById("vault-forget");
  if (forgetBtn) { forgetBtn.addEventListener("click", forget); }

  var saveBtn = document.getElementById("vault-save");
  if (saveBtn) { saveBtn.addEventListener("click", save); }

  var lockBtn = document.getElementById("vault-lock");
  if (lockBtn) { lockBtn.addEventListener("click", lock); }

  var downloadBtn = document.getElementById("vault-download");
  if (downloadBtn) { downloadBtn.addEventListener("click", downloadEncrypted); }

  var exportBtn = document.getElementById("vault-export");
  if (exportBtn) { exportBtn.addEventListener("click", exportPlain); }

  var forgetOpenBtn = document.getElementById("vault-forget-open");
  if (forgetOpenBtn) { forgetOpenBtn.addEventListener("click", forget); }

  var textarea = document.getElementById("vault-text");
  if (textarea) {
    textarea.addEventListener("input", function () {
      state.text = textarea.value;
      renderList();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (file) { loadFile(file); }
      fileInput.value = "";
    });
  }

  refresh();

  if (state.pass) {
    setStatus("Vault open in this tab.", "");
  } else if (state.record) {
    setStatus("Unlock the vault with its pass phrase.", "");
  } else {
    setStatus("No vault yet. Paste VINs, set a pass phrase, then save.", "");
  }
})();
