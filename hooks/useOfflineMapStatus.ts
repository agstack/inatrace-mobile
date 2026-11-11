import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import Mapbox from '@rnmapbox/maps';

import {
  classifyOfflinePacks,
  type OfflineMapStatus,
} from '@/utils/offlineMaps';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

/**
 * Reads the Mapbox offline packs every time the screen gains focus.
 *
 * The last known status is kept while a new query runs and when the query
 * fails, so the notice neither flickers nor claims that no map exists just
 * because the SDK could not answer. Responses that arrive after the screen
 * loses focus are ignored.
 */
export function useOfflineMapStatus(): OfflineMapStatus {
  const [status, setStatus] = useState<OfflineMapStatus>('unknown');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Mapbox.offlineManager
        .getPacks()
        .then((packs) => {
          if (!active) return;
          setStatus(classifyOfflinePacks(packs));
        })
        .catch((error) => {
          if (!active) return;
          // Keep the previous status: a failed check must not report that no
          // map is available.
          console.error('Error fetching offline packs:', error);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  return status;
}
