import { farmersListMessageKey, resolveFarmersListState } from './farmersList';

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
