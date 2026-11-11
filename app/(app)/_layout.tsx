import { Stack, router, useSegments } from 'expo-router';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { AuthContext } from '@/context/AuthContext';
import i18n from '@/locales/i18n';
import HeaderBackButton from '@/components/common/HeaderBackButton';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function AppLayout() {
  const { checkAuth, accessToken, guestAccess, logInGuest } =
    useContext(AuthContext);

  const segments = useSegments();

  const hasNavigatedToDefaultFarmer = useRef(false);

  const prevAccessToken = useRef(accessToken);
  const prevSegments = useRef(segments);

  useEffect(() => {
    if (
      prevAccessToken.current !== accessToken ||
      JSON.stringify(prevSegments.current) !== JSON.stringify(segments)
    ) {
      handleAuthCheck();
      prevAccessToken.current = accessToken;
      prevSegments.current = segments;
    }
  }, [segments, accessToken]);

  const handleAuthCheck = useCallback(async () => {
    if (guestAccess) {
      return;
    }

    if (accessToken === 'none') {
      await handleLoginGuest();
    } else if (accessToken) {
      const isAuth = await checkAuth();

      if (!isAuth) {
        // An expired stored session must not silently become guest access.
        router.replace('/login');
      } else {
        await checkForOfflineMaps();
      }
    }
  }, [accessToken, guestAccess]);

  const handleLoginGuest = async () => {
    await logInGuest();
    if (!hasNavigatedToDefaultFarmer.current) {
      hasNavigatedToDefaultFarmer.current = true;
      router.push('/(app)/(farmers)/info/0');
    }
  };

  return (
    <Stack
      screenOptions={{
        headerTransparent: { ios: false },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="data-sync"
        options={{
          presentation: 'modal',
          title: i18n.t('home.syncData'),
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Stack.Screen name="(farmers)" options={{ headerShown: false }} />
      <Stack.Screen
        name="user-settings"
        options={{
          presentation: 'modal',
          title: i18n.t('userSettings.title'),
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Stack.Screen
        name="map-download"
        options={{
          presentation: 'modal',
          title: i18n.t('plots.mapDownload'),
          headerLeft: () => <HeaderBackButton />,
        }}
      />
    </Stack>
  );
}
