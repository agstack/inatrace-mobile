# Multiple backend servers on Android

The login screen keeps the configured default and any locally added server URLs. New URLs use HTTPS in production. Server validation makes credential-free requests with redirects and cookies disabled: it checks OpenAPI where available and otherwise checks both the public global-settings envelope and the login endpoint's expected method-error response. These checks are compatibility heuristics and can be imitated; they do not prove the server is INATrace or certify its operator. The server address is displayed before login.

To change servers, log out first. Logout cancels tracked requests, clears the Android cookie store and session state, and preserves offline files. Farmer and plot data use separate Realm files for each server and user ID. Server identity is stored locally and is not derived from an email address. Image directories are also separated by context.

Existing offline data in `myrealm` is retained and is not automatically assigned or synchronized. The sync screen offers explicit recovery after confirmation that all legacy pending records belong to the current server and account. Recovery copies records without overwriting an existing ID and retains the original file. If the origin is uncertain, do not confirm recovery until it is established.

The server validation and cookie cleanup use an Android native module installed through the Expo config plugin. A native rebuild is required; updating the JavaScript bundle alone is insufficient. Existing deployments may leave OpenAPI behind the frontend gateway; the public endpoint fallback supports that setup without a backend change.
