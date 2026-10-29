import React from 'react';
import { Pressable, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import DataSync from '../app/(app)/data-sync';
import { AuthContext } from '@/context/AuthContext';
import realm from '@/realm/useRealm';
import http from 'http';

jest.mock('expo-router', () => ({ useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }) }));
jest.mock('@/context/AuthContext', () => ({ AuthContext: require('react').createContext({}) }));
jest.mock('@/locales/i18n', () => ({ t: key => key }));
jest.mock('@/realm/useRealm', () => ({ __esModule: true, default: {
  realmRead: jest.fn(), realmUpdate: jest.fn(async () => {}), realmDeleteOne: jest.fn(async () => {}),
} }));
jest.mock('@/realm/context', () => ({ currentOfflinePath: () => 'server-b-user-1.realm' }));
jest.mock('@/utils/sessionRequests', () => ({ sessionGeneration: () => 1, isCurrentSession: () => true }));
jest.mock('@/realm/legacyRecovery', () => ({ legacyPendingCounts: async () => ({ farmers: 0, plots: 0 }), copyLegacyPending: jest.fn() }));
jest.mock('react-native-gesture-handler', () => ({ ScrollView: require('react-native').ScrollView }));
jest.mock('@gorhom/bottom-sheet', () => ({ BottomSheetBackdrop: () => null, BottomSheetModal: () => null,
  BottomSheetScrollView: ({ children }) => children }));
jest.mock('react-native-screens', () => ({ FullWindowOverlay: ({ children }) => children }));
jest.mock('@/components/common/Selector', () => () => null);

global.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => jest.clearAllMocks());

test('synchronizes only pending records read from the active context', async () => {
  const pendingB = { id: 'b-1', userId: '1', name: 'B farmer', surname: '', synced: false,
    data: JSON.stringify({ id: 'b-1', name: 'B farmer', plots: [] }) };
  realm.realmRead.mockImplementation(async schema => schema.name === 'Farmer' ? [pendingB] : []);
  const send = jest.fn(async () => ({ data: { status: 'OK' } }));
  let tree;
  await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
    isConnected: true, makeRequest: send, selectedCompany: 2, user: { id: 1 },
    guestAccess: false, instance: 'https://server-b.example', refreshFarmers: jest.fn(),
  }}><DataSync /></AuthContext.Provider>); });
  const sync = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'home.syncData'));
  await act(async () => { await sync.props.onPress(); });
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0].url).toBe('/api/company/userCustomers/add/2');
  expect(send.mock.calls[0][0].body.name).toBe('B farmer');
  expect(realm.realmUpdate).toHaveBeenCalledWith(expect.anything(), 'b-1', 'synced', true);
  await act(async () => tree.unmount());
});

test('keeps the pending record when the request fails', async () => {
  const pending = { id: 'b-2', userId: '1', name: 'Pending', surname: '', synced: false,
    data: JSON.stringify({ id: 'b-2', name: 'Pending', plots: [] }) };
  realm.realmRead.mockImplementation(async schema => schema.name === 'Farmer' ? [pending] : []);
  const send = jest.fn(async () => { throw new Error('offline'); });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  let tree;
  await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
    isConnected: true, makeRequest: send, selectedCompany: 2, user: { id: 1 },
    guestAccess: false, instance: 'https://server-b.example', refreshFarmers: jest.fn(),
  }}><DataSync /></AuthContext.Provider>); });
  const sync = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'home.syncData'));
  await act(async () => { await sync.props.onPress(); });
  expect(send).toHaveBeenCalledTimes(1);
  expect(realm.realmUpdate).not.toHaveBeenCalled();
  expect(realm.realmDeleteOne).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
  log.mockRestore();
});

test('sends active-context data to a local HTTP fixture', async () => {
  const received = [];
  const fixture = http.createServer((req, res) => {
    let body = '';
    req.on('data', part => { body += part; });
    req.on('end', () => {
      received.push({ path: req.url, body: JSON.parse(body) });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'OK' }));
    });
  });
  await new Promise((resolve, reject) => {
    fixture.once('error', reject);
    fixture.listen(0, '127.0.0.1', resolve);
  });
  const pendingB = { id: 'b-http', userId: '1', name: 'B only', surname: '', synced: false,
    data: JSON.stringify({ id: 'b-http', name: 'B only', plots: [] }) };
  realm.realmRead.mockImplementation(async schema => schema.name === 'Farmer' ? [pendingB] : []);
  const send = ({ url, body }) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: fixture.address().port, path: url, method: 'POST',
      headers: { 'Content-Type': 'application/json' } }, res => {
      let data = ''; res.on('data', part => { data += part; });
      res.on('end', () => resolve({ data: JSON.parse(data) }));
    });
    req.on('error', reject); req.end(JSON.stringify(body));
  });
  let tree;
  try {
    await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
      isConnected: true, makeRequest: send, selectedCompany: 2, user: { id: 1 },
      guestAccess: false, instance: 'http://127.0.0.1', refreshFarmers: jest.fn(),
    }}><DataSync /></AuthContext.Provider>); });
    const sync = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
      .some(t => t.props.children === 'home.syncData'));
    await act(async () => { await sync.props.onPress(); });
    expect(received).toHaveLength(1);
    expect(received[0].path).toBe('/api/company/userCustomers/add/2');
    expect(received[0].body.name).toBe('B only');
    expect(realm.realmUpdate).toHaveBeenCalledWith(expect.anything(), 'b-http', 'synced', true);
  } finally {
    if (tree) await act(async () => tree.unmount());
    await new Promise(resolve => fixture.close(resolve));
  }
});
