import React from 'react';
import { Alert, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import DataSync from '../app/(app)/data-sync';
import { AuthContext } from '@/context/AuthContext';
import realm from '@/realm/useRealm';
import http from 'http';

jest.mock('expo-router', () => ({ useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@/context/AuthContext', () => ({ AuthContext: require('react').createContext({}) }));
jest.mock('@/locales/i18n', () => ({ t: key => key }));
jest.mock('@/realm/useRealm', () => ({ __esModule: true, default: {
  realmRead: jest.fn(), realmUpdate: jest.fn(async () => {}), realmDeleteOne: jest.fn(async () => {}),
} }));
jest.mock('@/realm/context', () => ({ currentOfflinePath: () => 'server-b-user-1.realm' }));
jest.mock('@/utils/sessionRequests', () => ({ sessionGeneration: () => 1, isCurrentSession: () => true }));
jest.mock('@/realm/legacyRecovery', () => ({ legacyPendingCounts: async () => ({ farmers: 0, plots: 0 }), copyLegacyPending: jest.fn() }));
jest.mock('react-native-gesture-handler', () => ({ ScrollView: require('react-native').ScrollView }));
jest.mock('@/components/common/AppBottomSheet', () => ({ BottomSheetBackdrop: () => null, BottomSheetModal: () => null,
  BottomSheetScrollView: ({ children }) => children }));
jest.mock('react-native-screens', () => ({ FullWindowOverlay: ({ children }) => children }));
jest.mock('@/components/common/Selector', () => () => null);

global.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

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
  const sync = tree.root.findAll(node => typeof node.props?.onPress === 'function').find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'home.syncData'));
  await act(async () => { await sync.props.onPress(); });
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0].url).toBe('/api/company/userCustomers/add/2');
  expect(send.mock.calls[0][0].body.name).toBe('B farmer');
  expect(send.mock.calls[0][0].headers).toBeUndefined();
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
  const sync = tree.root.findAll(node => typeof node.props?.onPress === 'function').find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'home.syncData'));
  await act(async () => { await sync.props.onPress(); });
  expect(send).toHaveBeenCalledTimes(1);
  expect(realm.realmUpdate).not.toHaveBeenCalled();
  expect(realm.realmDeleteOne).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
  log.mockRestore();
});

test('marks a successful farmer and its plot when another farmer fails', async () => {
  const okFarmer = { id: 'ok-1', userId: '1', name: 'OK', surname: '', synced: false,
    data: JSON.stringify({ id: 'ok-1', name: 'OK', plots: [] }) };
  const failFarmer = { id: 'fail-1', userId: '1', name: 'Fail', surname: '', synced: false,
    data: JSON.stringify({ id: 'fail-1', name: 'Fail', plots: [] }) };
  const okPlot = { id: 'plot-ok', farmerId: 'ok-1', userId: '1', synced: false,
    data: JSON.stringify({ plotName: 'OK plot', crop: '1', size: '1 ha',
      featureInfo: { geometry: { coordinates: [[[30.1, -1.9], [30.2, -1.9], [30.2, -2.0]]] } } }) };
  const failPlot = { id: 'plot-fail', farmerId: 'fail-1', userId: '1', synced: false,
    data: JSON.stringify({ plotName: 'Fail plot', crop: '1', size: '1 ha',
      featureInfo: { geometry: { coordinates: [[[30.1, -1.9], [30.2, -1.9], [30.2, -2.0]]] } } }) };

  realm.realmRead.mockImplementation(async schema => {
    if (schema.name === 'Farmer') return [okFarmer, failFarmer];
    if (schema.name === 'Plot') return [okPlot, failPlot];
    return [];
  });
  const send = jest.fn()
    .mockResolvedValueOnce({ data: { status: 'OK' } })
    .mockRejectedValueOnce(new Error('500'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  let tree;
  try {
    await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
      isConnected: true, makeRequest: send, selectedCompany: 2, user: { id: 1 },
      guestAccess: false, instance: 'https://server-b.example', refreshFarmers: jest.fn(),
    }}><DataSync /></AuthContext.Provider>); });
    const sync = tree.root.findAll(node => typeof node.props?.onPress === 'function').find(p => p.findAllByType(Text)
      .some(t => t.props.children === 'home.syncData'));

    await act(async () => { await sync.props.onPress(); });

    expect(send).toHaveBeenCalledTimes(2);
    expect(realm.realmUpdate).toHaveBeenCalledWith(expect.anything(), 'ok-1', 'synced', true);
    expect(realm.realmUpdate).not.toHaveBeenCalledWith(expect.anything(), 'fail-1', 'synced', true);
    expect(realm.realmDeleteOne).toHaveBeenCalledWith(expect.anything(), "id == 'plot-ok'");
    expect(realm.realmDeleteOne).not.toHaveBeenCalledWith(expect.anything(), "id == 'plot-fail'");
    expect(alert).toHaveBeenCalledWith('synced.syncedTitle', 'server.syncError');
  } finally {
    if (tree) await act(async () => tree.unmount());
  }
});

test('deletes the successful standalone plot when another plot fails', async () => {
  const plotData = name => JSON.stringify({ plotName: name, crop: '1', size: '1 ha',
    featureInfo: { geometry: { coordinates: [[[30.1, -1.9], [30.2, -1.9], [30.2, -2.0]]] } } });
  const okPlot = { id: 'plot-ok', farmerId: 'farmer-1', userId: '1', synced: false, data: plotData('OK plot') };
  const failPlot = { id: 'plot-fail', farmerId: 'farmer-1', userId: '1', synced: false, data: plotData('Fail plot') };

  realm.realmRead.mockImplementation(async schema => schema.name === 'Plot' ? [okPlot, failPlot] : []);
  const send = jest.fn()
    .mockResolvedValueOnce({ data: { status: 'OK' } })
    .mockRejectedValueOnce(new Error('500'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  let tree;
  try {
    await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
      isConnected: true, makeRequest: send, selectedCompany: 2, user: { id: 1 },
      guestAccess: false, instance: 'https://server-b.example', refreshFarmers: jest.fn(),
    }}><DataSync /></AuthContext.Provider>); });
    const sync = tree.root.findAll(node => typeof node.props?.onPress === 'function').find(p => p.findAllByType(Text)
      .some(t => t.props.children === 'home.syncData'));

    await act(async () => { await sync.props.onPress(); });

    expect(send).toHaveBeenCalledTimes(2);
    expect(realm.realmUpdate).not.toHaveBeenCalled();
    expect(realm.realmDeleteOne).toHaveBeenCalledWith(expect.anything(), "id == 'plot-ok'");
    expect(realm.realmDeleteOne).not.toHaveBeenCalledWith(expect.anything(), "id == 'plot-fail'");
    expect(alert).toHaveBeenCalledWith('synced.syncedTitle', 'server.syncError');
  } finally {
    if (tree) await act(async () => tree.unmount());
  }
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
    const sync = tree.root.findAll(node => typeof node.props?.onPress === 'function').find(p => p.findAllByType(Text)
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
