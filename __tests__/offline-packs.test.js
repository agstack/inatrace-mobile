import {
  applyProgress,
  shouldKeepPolling,
  toPackView,
} from '@/utils/offlinePacks';

test('normalises a pack returned by getPacks', () => {
  expect(
    toPackView({
      name: 'field',
      pack: {
        state: 'complete',
        percentage: 100,
        completedResourceSize: 2048,
        expires: '2026-11-18 12:00:00',
      },
    })
  ).toEqual({
    name: 'field',
    state: 'complete',
    percentage: 100,
    completedResourceSize: 2048,
    expires: '2026-11-18 12:00:00',
  });
});

test('normalises a progress event reported at the root', () => {
  expect(
    toPackView({
      name: 'field',
      state: 'active',
      percentage: 40,
      completedResourceSize: 512,
    })
  ).toEqual({
    name: 'field',
    state: 'active',
    percentage: 40,
    completedResourceSize: 512,
    expires: 'unknown',
  });
});

test('adds a pack seen for the first time in a progress event', () => {
  const packs = applyProgress([], {
    name: 'field',
    state: 'active',
    percentage: 5,
    completedResourceSize: 64,
  });

  expect(packs).toHaveLength(1);
  expect(packs[0].name).toBe('field');
  expect(packs[0].state).toBe('active');
  expect(packs[0].percentage).toBe(5);
});

test('updates an existing pack without duplicating it', () => {
  const existing = [
    {
      name: 'field',
      state: 'active',
      percentage: 10,
      completedResourceSize: 128,
      expires: '2026-11-18 12:00:00',
    },
  ];

  const packs = applyProgress(existing, {
    name: 'field',
    state: 'complete',
    percentage: 100,
    completedResourceSize: 2048,
  });

  expect(packs).toHaveLength(1);
  expect(packs[0]).toEqual({
    name: 'field',
    state: 'complete',
    percentage: 100,
    completedResourceSize: 2048,
    expires: '2026-11-18 12:00:00',
  });
});

test('keeps polling while a download is active, even with an empty list', () => {
  expect(shouldKeepPolling([], true)).toBe(true);
});

test('stops polling on an empty list when no download is active', () => {
  expect(shouldKeepPolling([], false)).toBe(false);
});

test('keeps polling while a pack is unfinished', () => {
  const packs = [
    {
      name: 'field',
      state: 'inactive',
      percentage: 30,
      completedResourceSize: 256,
      expires: 'unknown',
    },
  ];

  expect(shouldKeepPolling(packs, false)).toBe(true);
});

test('stops polling when every pack is complete or invalid', () => {
  const packs = [
    {
      name: 'done',
      state: 'complete',
      percentage: 100,
      completedResourceSize: 2048,
      expires: '2026-11-18 12:00:00',
    },
    {
      name: 'broken',
      state: 'invalid',
      percentage: 0,
      completedResourceSize: 0,
      expires: 'unknown',
    },
  ];

  expect(shouldKeepPolling(packs, false)).toBe(false);
});
