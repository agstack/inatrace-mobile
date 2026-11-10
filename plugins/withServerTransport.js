const { withMainApplication, withDangerousMod, withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withServerTransport(config) {
  const androidPackage = config.android?.package || 'com.sunesis.inatrace';
  config = withMainApplication(config, result => {
    const legacyMarker = 'packages.add(ServerTransportPackage())';
    const modernMarker = 'add(ServerTransportPackage())';
    const legacyAnchor = 'val packages = PackageList(this).packages';
    const modernAnchor = 'PackageList(this).packages.apply {';

    if (result.modResults.contents.includes(legacyMarker) || result.modResults.contents.includes(modernMarker)) {
      return result;
    }

    if (result.modResults.contents.includes(modernAnchor)) {
      result.modResults.contents = result.modResults.contents.replace(
        modernAnchor,
        `${modernAnchor}\n          ${modernMarker}`
      );
    } else if (result.modResults.contents.includes(legacyAnchor)) {
      result.modResults.contents = result.modResults.contents.replace(
        legacyAnchor,
        `${legacyAnchor}\n            ${legacyMarker}`
      );
    } else {
      throw new Error('Cannot register ServerTransportPackage');
    }
    return result;
  });
  config = withDangerousMod(config, ['android', async result => {
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
  config = withDangerousMod(config, ['ios', async result => {
    const name = IOSConfig.XcodeUtils.getProjectName(result.modRequest.projectRoot);
    const dest = path.join(result.modRequest.platformProjectRoot, name, 'ServerTransport.m');
    fs.copyFileSync(path.join(__dirname, 'server-transport', 'ServerTransport.m'), dest);
    return result;
  }]);
  return withXcodeProject(config, result => {
    const name = IOSConfig.XcodeUtils.getProjectName(result.modRequest.projectRoot);
    const filename = `${name}/ServerTransport.m`;
    if (!result.modResults.hasFile(filename)) {
      const group = result.modResults.findPBXGroupKey({ name }) || result.modResults.findPBXGroupKey({ path: name });
      if (!group) throw new Error('Cannot find iOS application group for ServerTransport');
      result.modResults.addSourceFile(filename, { target: result.modResults.getFirstTarget().uuid }, group);
    }
    return result;
  });
};
