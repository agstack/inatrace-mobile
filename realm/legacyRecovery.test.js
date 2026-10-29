const values = {};
const legacyRows = {
  Farmer: [{ id: '11', userId: 'old', companyId: '1', data: '{}', name: 'A', surname: 'B', synced: false }],
  Plot: [{ id: '12', farmerId: '11', userId: 'old', data: '{}', synced: false }],
};
const targetRows = { Farmer: [], Plot: [] };
let mockFailMarker = false;
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {
  getItem: async key => values[key] || null,
  setItem: async (key, value) => { if (mockFailMarker) { mockFailMarker = false; throw new Error('storage failure'); } values[key] = value; },
} }));
jest.mock('./context', () => ({ currentOfflinePath: () => 'test-context.realm' }));
jest.mock('realm', () => ({ __esModule: true, default: {
  exists: () => true,
  open: async ({ path }) => path === 'myrealm' ? {
    objects: name => ({ filtered: () => legacyRows[name] }), close: () => {},
  } : {
    objectForPrimaryKey: (name, id) => targetRows[name].find(row => row.id === id),
    create: (name, row) => targetRows[name].push(row), write: fn => fn(), close: () => {},
  },
} }));

import { legacyPendingCounts, copyLegacyPending } from './legacyRecovery';

beforeEach(() => {
  Object.keys(values).forEach(key => delete values[key]);
  targetRows.Farmer.length = 0;
  targetRows.Plot.length = 0;
  mockFailMarker = false;
});

test('copies only after explicit recovery and preserves original records', async () => {
  expect(await legacyPendingCounts()).toEqual({ farmers: 1, plots: 1 });
  expect(targetRows.Farmer).toHaveLength(0);
  await copyLegacyPending(7);
  expect(targetRows.Farmer[0].userId).toBe('7');
  expect(targetRows.Plot[0].farmerId).toBe('11');
  expect(legacyRows.Farmer[0].userId).toBe('old');
  expect(await legacyPendingCounts()).toEqual({ farmers: 0, plots: 0 });
  await expect(copyLegacyPending(7)).rejects.toThrow();
});

test('retries safely if the recovery marker cannot be saved after the copy', async () => {
  mockFailMarker = true;
  await expect(copyLegacyPending(7)).rejects.toThrow('storage failure');
  expect(targetRows.Farmer).toHaveLength(1);
  await copyLegacyPending(7);
  expect(targetRows.Farmer).toHaveLength(1);
  expect(targetRows.Plot).toHaveLength(1);
  expect(await legacyPendingCounts()).toEqual({ farmers: 0, plots: 0 });
});

test('does not overwrite a conflicting record', async () => {
  targetRows.Farmer.push({ ...legacyRows.Farmer[0], name: 'Different', userId: '7' });
  await expect(copyLegacyPending(7)).rejects.toThrow('different record');
  expect(targetRows.Farmer[0].name).toBe('Different');
});
