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
