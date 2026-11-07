const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withServerTransport(config) {
  const androidPackage = config.android?.package || 'com.sunesis.inatrace';
  config = withMainApplication(config, result => {
    const marker = 'packages.add(ServerTransportPackage())';
    if (!result.modResults.contents.includes(marker)) {
      const anchor = 'val packages = PackageList(this).packages';
      if (!result.modResults.contents.includes(anchor)) throw new Error('Cannot register ServerTransportPackage');
      result.modResults.contents = result.modResults.contents.replace(anchor, `${anchor}\n            ${marker}`);
    }
    return result;
  });
  return withDangerousMod(config, ['android', async result => {
    const packagePath = androidPackage.replace(/\./g, path.sep);
    const dest = path.join(result.modRequest.platformProjectRoot, 'app/src/main/java', packagePath);
    fs.mkdirSync(dest, { recursive: true });
    for (const file of ['ServerTransport.kt', 'ServerTransportPackage.kt']) {
      const source = fs.readFileSync(path.join(__dirname, 'server-transport', file), 'utf8');
      const namespacedSource = source.replace(/^package\s+[\w.]+/m, `package ${androidPackage}`);
      fs.writeFileSync(path.join(dest, file), namespacedSource);
    }
    return result;
  }]);
};
