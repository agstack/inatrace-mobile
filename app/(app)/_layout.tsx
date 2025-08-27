import { Stack, router, useSegments } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { AuthContext } from '@/context/AuthContext';
import i18n from '@/locales/i18n';

import Mapbox from '@rnmapbox/maps';
import OfflinePack from '@rnmapbox/maps/lib/typescript/src/modules/offline/OfflinePack';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function AppLayout() {
  const { checkAuth, accessToken, guestAccess, logInGuest } =
    useContext(AuthContext);

  const segments = useSegments();

  const hasNavigatedToMapDownload = useRef(false);
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
      await checkForOfflineMaps();
      return;
    }

    if (accessToken === 'none') {
      await handleLoginGuest();
    } else if (accessToken) {
      const isAuth = await checkAuth();

      if (!isAuth) {
        await handleLoginGuest();
      } else {
        await checkForOfflineMaps();
      }
    }
  }, [accessToken, segments]);

  const handleLoginGuest = async () => {
    await logInGuest();
    if (!hasNavigatedToDefaultFarmer.current) {
      hasNavigatedToDefaultFarmer.current = true;
      router.push('/(app)/(farmers)/info/0');
    }
  };

  const checkForOfflineMaps = async () => {
    try {
      const packs: OfflinePack[] = await Mapbox.offlineManager.getPacks();
      if (packs.length === 0 && !hasNavigatedToMapDownload.current) {
        hasNavigatedToMapDownload.current = true;
        router.push('/map-download');
      }
    } catch (error) {
      console.error('Error fetching offline packs:', error);
    }
  };

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="data-sync"
        options={{
          presentation: 'modal',
          title: i18n.t('home.syncData'),
          headerLeft: () => <LeftHeader />,
        }}
      />
      <Stack.Screen name="(farmers)" options={{ headerShown: false }} />
      <Stack.Screen
        name="user-settings"
        options={{
          presentation: 'modal',
          title: i18n.t('userSettings.title'),
          headerLeft: () => <LeftHeader />,
        }}
      />
      <Stack.Screen
        name="map-download"
        options={{
          presentation: 'modal',
          title: i18n.t('plots.mapDownload'),
          headerLeft: () => <LeftHeader />,
        }}
      />
    </Stack>
  );
}

const LeftHeader = () => (
  <Pressable className="flex flex-row justify-center items-center mr-3">
    <ChevronLeft color={Colors.orange} />
    <Text className="font-medium text-Orange text-[18px]">Back</Text>
  </Pressable>
);
