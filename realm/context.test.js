jest.mock('@react-native-async-storage/async-storage', () => {
  const values = {};
  return { __esModule: true, default: {
    getItem: jest.fn(async key => values[key] || null),
    setItem: jest.fn(async (key, value) => { values[key] = value; }),
  } };
});
jest.mock('expo-modules-core', () => {
  let sequence = 0;
  return { uuid: { v4: () => `server-${++sequence}` } };
});

import { clearOfflineContext, currentOfflinePath, selectOfflineContext } from './context';

test('isolates equal user IDs across servers and separates accounts on one server', async () => {
  const a1 = await selectOfflineContext('https://a.example', 1);
  const b1 = await selectOfflineContext('https://b.example', 1);
  const a2 = await selectOfflineContext('https://a.example', 2);
  expect(new Set([a1, b1, a2]).size).toBe(3);
  expect(await selectOfflineContext('https://a.example/', 1)).toBe(a1);
  clearOfflineContext();
  expect(() => currentOfflinePath()).toThrow();
});

test('does not accept an invalid account identifier', async () => {
  await expect(selectOfflineContext('https://a.example', '../1')).rejects.toThrow();
});
