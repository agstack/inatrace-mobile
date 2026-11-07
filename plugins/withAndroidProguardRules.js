const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAndroidProguardRules(config) {
  const androidPackage = config.android?.package || 'com.sunesis.inatrace';
  const rules = [
    '# Realm uses reflection and native bindings that R8 cannot detect.',
    '-keep class io.realm.** { *; }',
    '-keep class io.realm.react.** { *; }',
    '-dontwarn io.realm.**',
    '-keep class com.henninghall.date_picker.** { *; }',
    '-dontwarn com.henninghall.date_picker.**',
    '# Time4J loads this class reflectively; R8 must retain its no-argument constructor.',
    '-keep class net.time4j.android.spi.AndroidResourceLoader { <init>(); }',
    '-dontwarn net.time4j.android.**',
    `-keep class ${androidPackage}.ServerTransport { *; }`,
    `-keep class ${androidPackage}.ServerTransportPackage { *; }`,
  ];

  return withDangerousMod(config, [
    'android',
    async (result) => {
      const file = path.join(
        result.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      let contents = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      for (const rule of rules) {
        if (!contents.includes(rule)) contents += `\n${rule}`;
      }
      fs.writeFileSync(file, `${contents.trimEnd()}\n`);
      return result;
    },
  ]);
};
