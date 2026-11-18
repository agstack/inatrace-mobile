import {
  farmersListBannerKey,
  farmersListMessageKey,
  mergeFarmers,
  resolveFarmersListState,
} from './farmersList';

const base = {
  loading: false,
  failed: false,
  offline: false,
  itemCount: 0,
  fromCache: false,
};

describe('farmer list state', () => {
  it('shows loading while the first request has not answered', () => {
    expect(resolveFarmersListState({ ...base, loading: true })).toBe('loading');
  });

  it('reports the online list as ready', () => {
    expect(resolveFarmersListState({ ...base, itemCount: 3 })).toBe('ready');
  });

  it('reports cached rows while offline', () => {
    expect(
      resolveFarmersListState({ ...base, offline: true, itemCount: 3 })
    ).toBe('offline-with-cache');
  });

  it('reports cached rows when the API failed but the cache answered', () => {
    expect(
      resolveFarmersListState({ ...base, failed: true, itemCount: 2, fromCache: true })
    ).toBe('offline-with-cache');
  });

  it('distinguishes offline without cache from an empty company', () => {
    expect(resolveFarmersListState({ ...base, offline: true })).toBe(
      'offline-without-cache'
    );
  });

  it('reports an error instead of claiming there are no farmers', () => {
    expect(resolveFarmersListState({ ...base, failed: true })).toBe('error');
  });

  it('reports an empty company only when the request succeeded', () => {
    expect(resolveFarmersListState(base)).toBe('empty');
  });

  it('keeps the error state from hiding a cache that did load', () => {
    expect(
      resolveFarmersListState({ ...base, failed: true, itemCount: 1, fromCache: true })
    ).toBe('offline-with-cache');
  });
});

describe('farmer list message', () => {
  it('maps every state that needs a message', () => {
    expect(farmersListMessageKey('loading')).toBe('loading');
    expect(farmersListMessageKey('offline-with-cache')).toBe('farmers.offlineCached');
    expect(farmersListMessageKey('offline-without-cache')).toBe('farmers.offlineNoCache');
    expect(farmersListMessageKey('error')).toBe('farmers.errorFetch');
    expect(farmersListMessageKey('empty')).toBe('farmers.noData');
  });

  it('has no message when the list is ready', () => {
    expect(farmersListMessageKey('ready')).toBeNull();
  });
});

const entry = (id, synced) => ({ data: { id, name: `farmer-${id}` }, synced });

describe('mergeFarmers', () => {
  it('keeps the API order and does not duplicate a farmer present in both', () => {
    const merged = mergeFarmers(
      [entry(1, true), entry(2, true)],
      [entry(2, true), entry(3, true)]
    );

    expect(merged.map((row) => row.data.id)).toEqual([1, 2, 3]);
  });

  it('gives priority to the unsynchronized local record', () => {
    const merged = mergeFarmers(
      [entry(1, true), entry(2, true)],
      [entry(2, false)]
    );

    expect(merged.map((row) => row.data.id)).toEqual([2, 1]);
    expect(merged[0].synced).toBe(false);
    expect(merged).toHaveLength(2);
  });

  it('puts unsynchronized records first', () => {
    const merged = mergeFarmers(
      [entry(1, true), entry(2, true)],
      [entry(9, false)]
    );

    expect(merged.map((row) => row.data.id)).toEqual([9, 1, 2]);
  });

  it('accepts string and number ids as the same farmer', () => {
    const merged = mergeFarmers([entry('7', true)], [entry(7, true)]);

    expect(merged).toHaveLength(1);
  });

  it('keeps entries without an id at the end instead of dropping them', () => {
    const merged = mergeFarmers([entry(1, true)], [{ data: {}, synced: true }]);

    expect(merged).toHaveLength(2);
    expect(merged[1].data).toEqual({});
  });

  it('handles empty inputs', () => {
    expect(mergeFarmers([], [])).toEqual([]);
    expect(mergeFarmers([entry(1, true)], [])).toHaveLength(1);
    expect(mergeFarmers([], [entry(1, false)])).toHaveLength(1);
  });
});

describe('farmer list banner', () => {
  const base = {
    itemCount: 3,
    offline: false,
    failed: false,
    fromCache: false,
  };

  it('shows nothing while the list has fresh rows', () => {
    expect(farmersListBannerKey(base)).toBeNull();
  });

  it('shows nothing when the list is empty, because the empty state explains it', () => {
    expect(farmersListBannerKey({ ...base, itemCount: 0 })).toBeNull();
  });

  it('explains that the rows came from the cache', () => {
    expect(farmersListBannerKey({ ...base, fromCache: true })).toBe(
      'farmers.offlineCached'
    );
  });

  it('warns about stale rows when the update failed', () => {
    expect(farmersListBannerKey({ ...base, failed: true })).toBe(
      'farmers.staleCached'
    );
  });

  it('prefers the stale warning over the cache notice', () => {
    expect(
      farmersListBannerKey({ ...base, failed: true, fromCache: true, offline: true })
    ).toBe('farmers.staleCached');
  });

  it('explains the cache while offline', () => {
    expect(farmersListBannerKey({ ...base, offline: true })).toBe(
      'farmers.offlineCached'
    );
  });
});
