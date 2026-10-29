let mockPath = 'a.realm';
let mockGeneration = 1;
let mockResolveOpen;
const write = jest.fn();
const close = jest.fn();
jest.mock('./context', () => ({ currentOfflinePath: () => mockPath }));
jest.mock('../utils/sessionRequests', () => ({ sessionGeneration: () => mockGeneration, isCurrentSession: value => mockGeneration === value }));
jest.mock('realm', () => ({ __esModule: true, default: {
  open: jest.fn(() => new Promise(resolve => { mockResolveOpen = resolve; })),
  UpdateMode: { Modified: 'modified' },
} }));
import store from './useRealm';

test('does not write to an old context if it changes while the Realm opens', async () => {
  mockPath = 'a.realm'; mockGeneration = 1;
  const pending = store.realmWrite({ name: 'Farmer' }, { id: '1' });
  mockPath = 'b.realm'; mockGeneration++;
  mockResolveOpen({ write, close });
  await expect(pending).rejects.toThrow('Offline context changed');
  expect(write).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalled();
});
