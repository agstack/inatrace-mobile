import 'dotenv/config';

export default ({ config }) => ({
  expo: {
    ...config.expo,
    name: 'INATrace',
    slug: 'inatrace-mobile',
    version: '1.20.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.sunesis.inatracemobile',
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType:
              'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
        ],
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.sunesis.inatrace',
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      './plugins/withServerTransport',
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsImpl: 'mapbox',
          RNMapboxMapsDownloadToken: process.env.RN_MAPBOX_MAPS_DOWNLOAD_TOKEN,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Show current location on map.',
        },
      ],
      'expo-localization',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: '92b692fc-0be1-40d1-9c1d-bd10d94be7d0',
      },
      EXPO_PUBLIC_API_URI: process.env.EXPO_PUBLIC_API_URI,
      EXPO_PUBLIC_API_TEST_URI: process.env.EXPO_PUBLIC_API_TEST_URI,
      EXPO_PUBLIC_API_RW_URI: process.env.EXPO_PUBLIC_API_RW_URI,
      EXPO_PUBLIC_DOCUMENTATION_URI: process.env.EXPO_PUBLIC_DOCUMENTATION_URI,
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN:
        process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
      RN_MAPBOX_MAPS_DOWNLOAD_TOKEN: process.env.RN_MAPBOX_MAPS_DOWNLOAD_TOKEN,
    },
  },
});
