const { withAndroidManifest } = require('@expo/config-plugins');

// Local development servers may be served over plain HTTP. Keep this opt-in:
// production builds should use HTTPS unless ALLOW_CLEARTEXT=true is explicit.
module.exports = function withCleartextTraffic(config) {
  if (process.env.ALLOW_CLEARTEXT !== 'true') return config;

  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return modConfig;
  });
};
