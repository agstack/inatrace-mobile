import appConfig from '../app.config';

describe('iOS bundle identifier configuration', () => {
  const originalBundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER;

  afterEach(() => {
    if (originalBundleIdentifier === undefined) {
      delete process.env.IOS_BUNDLE_IDENTIFIER;
    } else {
      process.env.IOS_BUNDLE_IDENTIFIER = originalBundleIdentifier;
    }
  });

  it('uses the configured identifier without changing the Android package', () => {
    process.env.IOS_BUNDLE_IDENTIFIER = 'org.example.inatrace';
    const { expo } = appConfig({ config: {} });

    expect(expo.ios.bundleIdentifier).toBe('org.example.inatrace');
    expect(expo.android.package).toBe('com.sunesis.inatrace');
  });

  it.each([undefined, ''])('preserves the existing identifier when the override is %s', (value) => {
    if (value === undefined) delete process.env.IOS_BUNDLE_IDENTIFIER;
    else process.env.IOS_BUNDLE_IDENTIFIER = value;

    expect(appConfig({ config: {} }).expo.ios.bundleIdentifier).toBe('com.sunesis.inatracemobile');
  });
});
