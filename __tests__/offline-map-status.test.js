import React from 'react';
import renderer, { act } from 'react-test-renderer';

import Mapbox from '@rnmapbox/maps';
import { useOfflineMapStatus } from '@/hooks/useOfflineMapStatus';

const mockFocusCallbacks = [];

jest.mock('expo-router', () => ({
  useFocusEffect: (callback) => {
    mockFocusCallbacks.push(callback);
  },
}));

jest.mock('@rnmapbox/maps', () => ({
  __esModule: true,
  default: {
    setAccessToken: jest.fn(),
    offlineManager: { getPacks: jest.fn() },
  },
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  jest.clearAllMocks();
  mockFocusCallbacks.length = 0;
});

const statuses = [];
function Host() {
  statuses.push(useOfflineMapStatus());
  return null;
}

function latestStatus() {
  return statuses[statuses.length - 1];
}

async function renderHost() {
  let tree;
  await act(async () => {
    tree = renderer.create(<Host />);
  });
  return tree;
}

async function focus() {
  await act(async () => {
    mockFocusCallbacks[mockFocusCallbacks.length - 1]();
  });
}

test('does not claim that no map exists before the first check', async () => {
  Mapbox.offlineManager.getPacks.mockResolvedValue([]);
  await renderHost();
  expect(latestStatus()).toBe('unknown');
});

test('classifies the packs read on focus', async () => {
  Mapbox.offlineManager.getPacks.mockResolvedValue([
    { pack: { state: 'downloading' } },
  ]);
  await renderHost();
  await focus();
  expect(latestStatus()).toBe('downloading');
});

test('re-reads the packs when the screen regains focus', async () => {
  Mapbox.offlineManager.getPacks.mockResolvedValue([]);
  await renderHost();
  await focus();
  expect(latestStatus()).toBe('none');

  Mapbox.offlineManager.getPacks.mockResolvedValue([
    { pack: { state: 'complete' } },
  ]);
  await focus();
  expect(latestStatus()).toBe('ready');
});

test('keeps the previous status when the query fails', async () => {
  Mapbox.offlineManager.getPacks.mockResolvedValue([]);
  await renderHost();
  await focus();
  expect(latestStatus()).toBe('none');

  Mapbox.offlineManager.getPacks.mockRejectedValue(new Error('offline'));
  await focus();
  expect(latestStatus()).toBe('none');
});

test('ignores a response that arrives after the screen lost focus', async () => {
  Mapbox.offlineManager.getPacks.mockResolvedValue([]);
  await renderHost();
  await focus();
  expect(latestStatus()).toBe('none');

  let resolvePacks;
  Mapbox.offlineManager.getPacks.mockReturnValue(
    new Promise((resolve) => {
      resolvePacks = resolve;
    })
  );

  let cleanup;
  await act(async () => {
    cleanup = mockFocusCallbacks[mockFocusCallbacks.length - 1]();
  });
  await act(async () => {
    cleanup();
    resolvePacks([{ pack: { state: 'complete' } }]);
  });

  expect(latestStatus()).toBe('none');
});
