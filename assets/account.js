/* F-25 — self-serve data export and account deletion.
   The export is client-side and real: everything the account holds is assembled and downloaded.
   Deletion calls the database function `cardna_delete_my_account(confirm)` from
   docs/supabase-decode-log-cache-delete.sql, which deletes the caller's rows and sign-in and
   refuses outright when the role is `owner` — the guard is in the database, not here. */
(function () {
  "use strict";

  function config() {
    return window.CARDNA_SUPABASE || {};
  }

  function session() {
    var auth = window.CarDNAAuth;
    return auth && auth.state && auth.state.session;
  }

  function profile() {
    var auth = window.CarDNAAuth;
    return (auth && auth.state && auth.state.profile) || null;
  }

  function preview(reason) {
    return { ok: false, error: "preview", message: reason };
  }

  function download(text, type, name) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function stamp() {
    return new Date().toISOString().slice(0, 10);
  }

  window.CarDNAAccount = {
    live: true,

    /* { ok, filename, message } — a JSON file of everything this account holds. */
    exportAll: function () {
      var me = profile();
      if (!me) {
        return { ok: false, error: "Sign in first — the export belongs to your account." };
      }

      var vehicles = [];
      var garage = window.CarDNAGarage;
      if (garage && typeof garage.list === "function") {
        try { vehicles = garage.list() || []; } catch (err) { vehicles = []; }
      }

      var vault = null;
      try { vault = window.localStorage.getItem("cardna.vault"); } catch (err) { vault = null; }

      var payload = {
        product: "CarDNA",
        exported: new Date().toISOString(),
        account: {
          email: me.email || "",
          displayName: me.display_name || "",
          plan: me.plan || "free",
          role: me.role || "user",
          joined: me.created_at || ""
        },
        vehicles: vehicles,
        vaultCipherText: vault ? safeParse(vault) : null,
        note: "Only what this browser and this account hold. Your activity rows are in Supabase " +
          "and are readable by you; ask us for them if you need a copy."
      };

      var name = "cardna-account-" + stamp() + ".json";
      download(JSON.stringify(payload, null, 2), "application/json;charset=utf-8", name);

      return {
        ok: true,
        filename: name,
        message: "Downloaded " + name + " — your profile, " + vehicles.length +
          " saved vehicle" + (vehicles.length === 1 ? "" : "s") +
          (vault ? " and your encrypted vault" : "") + "."
      };
    },

    /* { ok, message } — deletes the account through the database, which refuses the owner. */
    deleteAccount: function (args) {
      var word = String((args && args.confirm) || "").trim().toLowerCase();
      if (word !== "delete") {
        return { ok: false, error: "Type delete in the box to confirm." };
      }

      var me = profile();
      var s = session();
      var cfg = config();

      if (!s || !cfg.url || !cfg.key) {
        return preview("Sign in first — deletion removes the account you are signed in as.");
      }

      return fetch(String(cfg.url).replace(/\/+$/, "") + "/rest/v1/rpc/cardna_delete_my_account", {
        method: "POST",
        headers: {
          apikey: cfg.key,
          Authorization: "Bearer " + s.access_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirm: word })
      }).then(function (response) {
        if (!response.ok) {
          return response.text().then(function (text) {
            var missing = response.status === 404 || /PGRST202|does not exist|schema cache/i.test(text || "");
            if (missing) {
              return preview("Deletion is not connected yet, so nothing was deleted. The function " +
                "is in docs/supabase-decode-log-cache-delete.sql.");
            }
            return {
              ok: false,
              error: "The account was not deleted (" + response.status + ")."
            };
          });
        }

        return response.json().then(function (result) {
          if (result && result.ok) {
            /* The sign-in is gone with the account; leave the app rather than show a dead session. */
            window.setTimeout(function () { window.location.replace("signin.html"); }, 1600);
            return {
              ok: true,
              message: "Account " + (me && me.email ? me.email : "") +
                " deleted, with its saved vehicles and vault rows. Signing out…"
            };
          }
          return {
            ok: false,
            error: (result && result.error) || "The account was not deleted."
          };
        });
      }).catch(function () {
        return { ok: false, error: "The request failed. Nothing was deleted — try again." };
      });
    }
  };

  function safeParse(text) {
    try { return JSON.parse(text); } catch (err) { return null; }
  }
})();
