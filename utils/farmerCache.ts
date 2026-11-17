import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Decides when the farmer cache should be refreshed from the API, and keeps the
 * timestamp of the last refresh.
 *
 * The cache was only filled after login and on a manual refresh, so a device
 * that stayed signed in kept a stale list. Refreshing on every screen open
 * would rewrite the whole Realm on each navigation, which is expensive and can
 * race with a read. The timestamp lives in AsyncStorage because a `useRef`
 * would restart with the component and refresh on every navigation.
 */

// Five minutes keeps the list reasonably fresh without rewriting the Realm on
// every navigation. EXPO_PUBLIC_ overrides it so a tester can shorten the
// interval instead of waiting for the real one.
export const FARMER_CACHE_MAX_AGE_MS = Number(
  process.env.EXPO_PUBLIC_FARMER_CACHE_MAX_AGE_MS ?? 5 * 60 * 1000
);
const LAST_REFRESH_KEY = 'farmer_cache_last_refresh_v1';

type ShouldRefreshInput = {
  /** True when the device may reach the API. */
  online: boolean;
  /** Rows currently in the cache. */
  cachedCount: number;
  /** When the cache was last refreshed, in epoch milliseconds. */
  lastRefreshAt: number | null;
  now?: number;
  maxAgeMs?: number;
};

export function shouldRefreshFarmerCache({
  online,
  cachedCount,
  lastRefreshAt,
  now = Date.now(),
  maxAgeMs = FARMER_CACHE_MAX_AGE_MS,
}: ShouldRefreshInput): boolean {
  if (!online) return false;
  if (cachedCount === 0) return true;
  if (lastRefreshAt === null) return true;
  return now - lastRefreshAt >= maxAgeMs;
}

export async function readLastFarmerCacheRefresh(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_REFRESH_KEY).catch(() => null);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
}

export async function writeLastFarmerCacheRefresh(value: number | null): Promise<void> {
  await (value === null
    ? AsyncStorage.removeItem(LAST_REFRESH_KEY)
    : AsyncStorage.setItem(LAST_REFRESH_KEY, String(value))
  ).catch(() => undefined);
}
