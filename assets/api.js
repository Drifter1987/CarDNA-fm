/* F-18 — the customer API key.
   Contract: key() → { ok, key, created, lastUsed }.
   A key is only ever shown once it exists in the database, so until `api_keys` and the
   gateway are built this answers with the preview shape and shows nothing. */
(function () {
  "use strict";

  window.CarDNAApi = {
    live: false,

    key: function () {
      return {
        ok: false,
        error: "preview",
        message: "No key exists yet: the API is not switched on, so there is nothing to show. " +
          "The endpoint and the scopes are already specified in the plan."
      };
    },

    /* { ok, endpoints:[{ method, path, note }] } — what the key will unlock. */
    endpoints: function () {
      return {
        ok: true,
        endpoints: [
          { method: "GET", path: "/v1/vin/{vin}", note: "The 104-field decode, same schema as the app." },
          { method: "GET", path: "/v1/vehicles", note: "Your saved vehicles, paginated." },
          { method: "POST", path: "/v1/vin/batch", note: "Up to 50 VINs per call." }
        ]
      };
    }
  };
})();
