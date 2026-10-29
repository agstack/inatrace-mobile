const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withServerTransport(config) {
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
    const dest = path.join(result.modRequest.platformProjectRoot, 'app/src/main/java/com/sunesis/inatrace');
    fs.mkdirSync(dest, { recursive: true });
    for (const file of ['ServerTransport.kt', 'ServerTransportPackage.kt']) {
      fs.copyFileSync(path.join(__dirname, 'server-transport', file), path.join(dest, file));
    }
    return result;
  }]);
};
