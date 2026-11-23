/* F-25 — self-serve data export and account deletion.
   Both are ours to build and cost nothing, so both are specified here to the final shape:
   exportAll() → { ok, url, filename } and deleteAccount({ confirm }) → { ok, deleted }.
   Until they are wired they refuse honestly and say what would happen. */
(function () {
  "use strict";

  window.CarDNAAccount = {
    live: false,

    exportAll: function () {
      return {
        ok: false,
        error: "preview",
        message: "The download is not connected yet. What it will contain: your profile, your saved " +
          "vehicles with their full 104-field records, your vault cipher text and your activity rows."
      };
    },

    deleteAccount: function (args) {
      var word = String((args && args.confirm) || "").trim().toLowerCase();
      if (word !== "delete") {
        return { ok: false, error: "Type delete in the box to confirm." };
      }
      return {
        ok: false,
        error: "preview",
        message: "Nothing was deleted. Deletion needs a server-side function with a token, so your " +
          "account stays untouched until it exists."
      };
    }
  };
})();
