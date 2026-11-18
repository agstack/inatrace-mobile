import { mergeFarmers, type FarmerEntry } from './farmersList';

/**
 * One page of the farmer list, loaded from the API, the Realm cache or both.
 *
 * The screen used to choose between the API and the Realm by connectivity and
 * never went back to the cache when the request failed. This loader always
 * reads the cache on a reset, merges it with the API when the request works
 * and keeps it on screen when the request fails.
 */

export type FarmerPageArgs = {
  limit: number;
  offset: number;
  /** `[field, field, direction]`, as the screen splits the sort value. */
  sort: string[];
  search: string;
  searchBy: string;
  companyId: string;
  userId: string;
};

export type FarmerPage = {
  entries: FarmerEntry[];
  fromCache: boolean;
  failed: boolean;
};

export type FarmerLoaderDeps = {
  /** False while offline, in guest mode or after the API failed. */
  online: boolean;
  readCache: (args: FarmerPageArgs) => Promise<FarmerEntry[]>;
  fetchApi: (
    args: FarmerPageArgs
  ) => Promise<{ entries: FarmerEntry[] }>;
};

/**
 * Loads a page of farmers.
 *
 * On a reset, the cache is read first and used as the fallback. When online,
 * the API page is merged with the unsynchronized cached records. When the
 * request fails, the full cached page is returned with `failed: true` so the
 * screen can show the saved rows plus a warning.
 *
 * Pagination (reset false) is API-only when online and cache-only when
 * offline, so a failed page never duplicates the rows already on screen.
 */
export async function loadFarmersPage(
  { online, readCache, fetchApi }: FarmerLoaderDeps,
  args: FarmerPageArgs,
  {
    reset,
    onCache,
  }: { reset: boolean; onCache?: (entries: FarmerEntry[]) => void }
): Promise<FarmerPage> {
  const cached = reset
    ? await readCache(args).catch(() => [])
    : [];

  // The screen renders the cache before the request finishes, so a slow API
  // does not leave the list on a loading spinner when the rows are already on
  // the device.
  if (reset) onCache?.(cached);

  if (!online) {
    const entries = reset
      ? cached
      : await readCache(args).catch(() => []);
    return { entries, fromCache: true, failed: false };
  }

  try {
    const { entries: apiEntries } = await fetchApi(args);
    const entries = reset
      ? mergeFarmers(
          apiEntries,
          cached.filter((entry) => !entry.synced)
        )
      : apiEntries;

    return { entries, fromCache: false, failed: false };
  } catch {
    return {
      entries: reset ? cached : [],
      fromCache: reset && cached.length > 0,
      failed: true,
    };
  }
}
