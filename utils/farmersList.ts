import type { Farmer } from '@/types/farmer';

/**
 * Which message the farmer list should show when it has no rows.
 *
 * Before this, a failed request and a company without farmers produced the
 * same "No farmers found", and the error string was stored but never rendered.
 * The state below keeps the cases apart so the screen can explain what
 * happened instead of claiming there are no farmers.
 */

export type FarmersListState =
  | 'loading'
  | 'offline-with-cache'
  | 'offline-without-cache'
  | 'error'
  | 'empty'
  | 'ready';

type ResolveInput = {
  loading: boolean;
  /** True when the last API request failed. */
  failed: boolean;
  /** True when the device is known to be offline. */
  offline: boolean;
  /** Rows available to show, from the API or the cache. */
  itemCount: number;
  /** True when the rows shown came from the offline cache. */
  fromCache: boolean;
};

export function resolveFarmersListState(input: ResolveInput): FarmersListState {
  const { loading, failed, offline, itemCount, fromCache } = input;

  if (loading && itemCount === 0) return 'loading';

  if (itemCount > 0) {
    return offline || fromCache ? 'offline-with-cache' : 'ready';
  }

  if (offline) return 'offline-without-cache';
  if (failed) return 'error';

  return 'empty';
}

/** i18n key for each state that needs a message. `ready` returns null. */
export function farmersListMessageKey(state: FarmersListState): string | null {
  switch (state) {
    case 'loading':
      return 'loading';
    case 'offline-with-cache':
      return 'farmers.offlineCached';
    case 'offline-without-cache':
      return 'farmers.offlineNoCache';
    case 'error':
      return 'farmers.errorFetch';
    case 'empty':
      return 'farmers.noData';
    default:
      return null;
  }
}

/**
 * A row as it comes from the API or from the Realm cache.
 *
 * `synced` is false for a record created or edited on the device and not sent
 * to the server yet. Those records are the local truth and must win over the
 * server copy of the same farmer.
 */
export type FarmerEntry = {
  data: Farmer;
  synced: boolean;
};

function entryId(entry: FarmerEntry): string {
  const id = entry.data?.id;
  return id === undefined || id === null ? '' : String(id);
}

/**
 * Combines an API page with the cached rows so the same farmer never appears
 * twice. Unsynchronized local records come first and win over the server copy
 * of the same `id`; the rest keeps the API order. Entries without an `id`
 * cannot be compared and are kept at the end instead of being dropped.
 */
export function mergeFarmers(
  apiEntries: FarmerEntry[],
  cachedEntries: FarmerEntry[]
): FarmerEntry[] {
  const best = new Map<string, FarmerEntry>();
  const cachedWithoutId: FarmerEntry[] = [];
  const apiWithoutId: FarmerEntry[] = [];

  for (const entry of cachedEntries) {
    const id = entryId(entry);
    if (!id) {
      cachedWithoutId.push(entry);
      continue;
    }
    const current = best.get(id);
    if (!current || (!entry.synced && current.synced)) {
      best.set(id, entry);
    }
  }

  for (const entry of apiEntries) {
    const id = entryId(entry);
    if (!id) {
      apiWithoutId.push(entry);
      continue;
    }
    const current = best.get(id);
    // The API does not know about local edits, so it only wins among synced
    // records, where it is fresher than the cache.
    if (!current || current.synced) {
      best.set(id, entry);
    }
  }

  const seen = new Set<string>();
  const merged: FarmerEntry[] = [];

  // Local records first, in cache order, so a farmer created offline stays on
  // top of the list.
  for (const entry of cachedEntries) {
    const id = entryId(entry);
    if (!id || seen.has(id)) continue;
    const chosen = best.get(id);
    if (chosen && !chosen.synced) {
      merged.push(chosen);
      seen.add(id);
    }
  }

  // Then the API page, which is what the server considers current.
  for (const entry of apiEntries) {
    const id = entryId(entry);
    if (!id || seen.has(id)) continue;
    const chosen = best.get(id);
    if (chosen) {
      merged.push(chosen);
      seen.add(id);
    }
  }

  // Cached rows that are not part of this API page stay available.
  for (const entry of cachedEntries) {
    const id = entryId(entry);
    if (!id || seen.has(id)) continue;
    const chosen = best.get(id);
    if (chosen) {
      merged.push(chosen);
      seen.add(id);
    }
  }

  return [...merged, ...cachedWithoutId, ...apiWithoutId];
}

/** i18n key for the banner shown above a list that already has rows. */
export type FarmersBannerKey =
  | 'farmers.offlineCached'
  | 'farmers.staleCached';

type FarmersBannerInput = {
  itemCount: number;
  offline: boolean;
  failed: boolean;
  fromCache: boolean;
};

/**
 * The empty component only runs when there are no rows, so the messages for a
 * list that is showing cached or stale data have to live above it. A failed
 * update takes precedence: the user needs to know the rows may be outdated.
 */
export function farmersListBannerKey({
  itemCount,
  offline,
  failed,
  fromCache,
}: FarmersBannerInput): FarmersBannerKey | null {
  if (itemCount === 0) return null;
  if (failed) return 'farmers.staleCached';
  if (offline || fromCache) return 'farmers.offlineCached';
  return null;
}
