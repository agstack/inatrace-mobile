# INATrace Mobile App

INATrace is a digital open-source solution designed to enhance the economic conditions of smallholder farmers by improving the traceability of global supply chains. Funded by the German Federal Ministry for Economic Cooperation and Development (BMZ) and implemented by GIZ, INATrace provides an efficient internal management system for cooperatives, digitally stores supply chain data, and supports compliance with regulations like the EU Deforestation Regulation (EUDR).

[Learn more on Google Play](https://play.google.com/store/apps/details?hl=en-US&id=com.sunesis.inatrace)  
[Learn more on App Store](https://apps.apple.com/us/app/inatrace/id6572305162)

INATrace project is composed of 4 parts:

* [Angular frontend](https://github.com/INATrace/fe/tree/main)
* [Mobile app](https://github.com/INATrace/mobile/tree/main)
* [Java backend](https://github.com/INATrace/backend/tree/main)
* [Coffee network](https://github.com/INATrace/coffee-network/tree/main)

## Key Features

- **Polygon Mapping & Farmer Profiles**: Create detailed profiles for farmers and map field boundaries using GPS data, ensuring accurate records of cooperative members.

- **Offline Functionality**: Designed for remote areas with limited internet access, the app allows data collection offline, including farmer profiles and GPS data, with automatic synchronization once an internet connection is available.

## Running the App Locally

To run the INATrace app locally, follow these steps:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/INATrace/mobile.git
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
   ```

4. **Start the Development Server**: Launch the Expo development server.

```bash
npx expo run:android
```

or

```bash
npx expo run:ios
```

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

- **Support**: For assistance, please contact our support team at support@inatrace.org.

By following these instructions, you can effectively run and build the INATrace app locally, contributing to a more transparent and equitable global supply chain.

## License

Copyright (c) 2023 Antje ECG d.o.o., GIZ - Deutsche Gesellschaft für Internationale Zusammenarbeit GmbH, Sunesis ltd.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
