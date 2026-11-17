jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => void store.set(key, value),
    removeItem: async (key) => void store.delete(key),
    __clear: () => store.clear(),
  };
});

import { FARMER_CACHE_MAX_AGE_MS, shouldRefreshFarmerCache } from './farmerCache';

const base = {
  online: true,
  cachedCount: 3,
  lastRefreshAt: 1_000_000,
  now: 1_000_000,
};

describe('farmer cache refresh', () => {
  it('never refreshes while offline', () => {
    expect(
      shouldRefreshFarmerCache({ ...base, online: false, cachedCount: 0 })
    ).toBe(false);
  });

  it('refreshes when the cache is empty', () => {
    expect(shouldRefreshFarmerCache({ ...base, cachedCount: 0 })).toBe(true);
  });

  it('refreshes when the cache was never filled', () => {
    expect(shouldRefreshFarmerCache({ ...base, lastRefreshAt: null })).toBe(true);
  });

  it('keeps a recent cache', () => {
    expect(
      shouldRefreshFarmerCache({ ...base, now: base.lastRefreshAt + 60_000 })
    ).toBe(false);
  });

  it('refreshes once the cache is older than the interval', () => {
    expect(
      shouldRefreshFarmerCache({
        ...base,
        now: base.lastRefreshAt + FARMER_CACHE_MAX_AGE_MS,
      })
    ).toBe(true);
  });

  it('accepts a custom interval', () => {
    expect(
      shouldRefreshFarmerCache({
        ...base,
        now: base.lastRefreshAt + 30_000,
        maxAgeMs: 10_000,
      })
    ).toBe(true);
  });
});
