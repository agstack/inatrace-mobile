import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { SessionProvider } from '@/context/AuthContext';
import i18n from '@/locales/i18n';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DocumentationModal from '@/components/documentation-modal/DocumentationModal';
import '../global.css';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [locale, setLocale] = useState(i18n.locale);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const unsubscribe = i18n.onChange(() => {
      setLocale(i18n.locale);
    });

    return unsubscribe;
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <SessionProvider>
      <GestureHandlerRootView style={{ height: '100%' }}>
        <BottomSheetModalProvider>
          <Slot />
          <DocumentationModal />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SessionProvider>
  );
}
