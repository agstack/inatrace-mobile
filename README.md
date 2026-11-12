# INATrace Mobile App

INATrace is a digital open-source solution designed to enhance the economic conditions of smallholder farmers by improving the traceability of global supply chains. Funded by the German Federal Ministry for Economic Cooperation and Development (BMZ) and implemented by GIZ, INATrace provides an efficient internal management system for cooperatives, digitally stores supply chain data, and supports compliance with regulations like the EU Deforestation Regulation (EUDR).

[Learn more on Google Play](https://play.google.com/store/apps/details?hl=en-US&id=com.sunesis.inatrace)  
[Learn more on App Store](https://apps.apple.com/us/app/inatrace/id6572305162)

Project is composed of 4 parts, coordinated from the [INATrace project hub](https://github.com/agstack/inatrace) (project-wide documentation and governance):

* [Frontend application](https://github.com/agstack/inatrace-frontend)
* [Mobile app](https://github.com/agstack/inatrace-mobile)
* [Java backend](https://github.com/agstack/inatrace-backend)
* [Coffee network](https://github.com/agstack/inatrace-coffee-network)

## Technical Documentation
For detailed technical documentation, please refer to [TECHNICAL_DOCUMENTATION.md](https://github.com/agstack/inatrace-backend/blob/main/TECHNICAL_DOCUMENTATION.md).

## Key Features

- **Polygon Mapping & Farmer Profiles**: Create detailed profiles for farmers and map field boundaries using GPS data, ensuring accurate records of cooperative members.

- **Offline Functionality**: Designed for remote areas with limited internet access, the app allows data collection offline, including farmer profiles and GPS data, with automatic synchronization once an internet connection is available.

## Running the App Locally

To run the INATrace app locally, follow these steps:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/agstack/inatrace-mobile.git
   ```

2. **Install Dependencies**: Ensure you have [Node.js](https://nodejs.org/) installed, then install the project dependencies.

   ```bash
   npm install
   ```

3. **Configure Environment Variables**: Create a `.env` file in the project root directory and add the following environment variables:

   ```env
    EXPO_PUBLIC_API_URI=
    EXPO_PUBLIC_API_TEST_URI=
    EXPO_PUBLIC_API_RW_URI=
    EXPO_PUBLIC_DOCUMENTATION_URI=
    EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
    RN_MAPBOX_MAPS_DOWNLOAD_TOKEN=
    IOS_BUNDLE_IDENTIFIER=
   ```

   `IOS_BUNDLE_IDENTIFIER` is optional and selects the iOS bundle identifier
   during Expo configuration and native project generation. If omitted, it
   defaults to `com.sunesis.inatracemobile`. For Codemagic, configure it as an
   environment variable, for example `org.example.inatrace`, and ensure it
   matches the App ID and signing profile in the target Apple account. If an
   iOS native project already exists, regenerate or update it before building
   so its bundle identifier matches the selected value.

   A different bundle identifier is a different App Store identity; it does
   not update an existing app or automatically transfer its local data.

4. **Start the Development Server**: Launch the Expo development server.

```bash
npx expo run:android
```

or

```bash
npx expo run:ios
```

## iOS builds with Codemagic and TestFlight

The `ios-testflight` workflow in `codemagic.yaml` builds and uploads an IPA to
App Store Connect. Each operator configures their own Apple account and app:

1. Register the app and explicit bundle identifier in Apple Developer and App
   Store Connect. Create an App Store distribution provisioning profile and
   ensure the corresponding distribution certificate and private key are
   available to Codemagic.
2. In Codemagic account or team settings, register the App Store Connect API
   integration with the reference name `inatrace_app_store_connect`. Add the
   App Store profile under Code signing identities as
   `inatrace_app_store_profile`, and the matching certificate as
   `inatrace_distribution_certificate`. These names are references in this
   workflow; each account supplies its own credentials and signing files.
3. Create the application environment variable group `inatrace_ios`. Set
   `IOS_BUNDLE_IDENTIFIER` to the profile's exact bundle identifier and
   `IOS_BUILD_NUMBER` to an unused positive integer for the app version.
   Configure `EXPO_PUBLIC_API_URI`, optional `EXPO_PUBLIC_API_TEST_URI` and
   `EXPO_PUBLIC_API_RW_URI`, `EXPO_PUBLIC_DOCUMENTATION_URI`, and
   `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` for the target deployment. Public Expo
   variables are embedded in the app and must not contain secrets. If needed
   for native SDK downloads, configure `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` as a
   secret in the same group; it is not the public Mapbox token.
4. Run the workflow. The signing profile must match the configured bundle ID;
   increment the build number before each subsequent upload. Once Apple has
   processed the build, add it to a TestFlight group in App Store Connect.
   The workflow does not submit the app for App Store release or automatically
   add testers to a TestFlight group.

See [Codemagic iOS signing](https://docs.codemagic.io/yaml-code-signing/signing-ios/)
for managing certificates and provisioning profiles. Do not commit Apple keys,
signing certificates, credentials, or private tokens.

## Checks

The same checks run in CI (`.github/workflows/ci.yml`) for every pull request and every push to `main`:

```bash
npm run lint       # ESLint (Expo's universe/native rules with Prettier)
npm run typecheck  # tsc --noEmit
npm run test:ci    # Jest, single run (`npm test` watches)
```

CI uses the Node version in `.nvmrc`.

## Building the App with EAS Build

To create production-ready builds using Expo Application Services (EAS), follow these steps:

1. **Install EAS CLI**: If you haven't already, install the EAS CLI globally.

   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**: Navigate to your project directory and configure EAS.

   ```bash
   eas build:configure
   ```

3. **Create a Build**: Initiate the build process for your desired platform (iOS or Android).

   ```bash
   eas build --platform all
   ```

   Follow the prompts to authenticate and select your build profile.

4. **Monitor Build Status**: After initiating the build, monitor its status through the EAS dashboard or the terminal output.

5. **Download the Build**: Once the build completes, download the installation file (APK for Android or IPA for iOS) from the link provided in the terminal or EAS dashboard.

For detailed instructions and troubleshooting, refer to the [official EAS Build documentation](https://docs.expo.dev/build/introduction/).

## Additional Resources

- **Documentation**: Comprehensive guides and tutorials are available on the [INATrace Documentation Site](https://inatrace-docs.vercel.app/).

- **Questions and discussion**: [INATrace mailing list](https://lists.agstack.org/g/inatrace).

By following these instructions, you can effectively run and build the INATrace app locally, contributing to a more transparent and equitable global supply chain.

## License

Copyright (c) 2023 Antje ECG d.o.o., GIZ - Deutsche Gesellschaft für Internationale Zusammenarbeit GmbH, Sunesis ltd.

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, you can obtain one at
https://mozilla.org/MPL/2.0/. The full text is in [LICENSE](LICENSE).
