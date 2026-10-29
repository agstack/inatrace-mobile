import React from 'react';
import { NativeModules, Pressable, Text, TextInput } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Login from '../app/login';
import { AuthContext } from '@/context/AuthContext';
import { router } from 'expo-router';

jest.mock('react-native-modalbox', () => ({ children }) => children);
jest.mock('@/components/svg/LoginLowerBlob', () => () => null);
jest.mock('@/components/svg/LoginUpperBlob', () => () => null);
jest.mock('@/components/settings/LanguageSwitcher', () => () => null);
jest.mock('@/components/common/Input', () => ({ Input: () => null, InputPassword: () => null }));
jest.mock('@/locales/i18n', () => ({ t: key => key }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}),
} }));
jest.mock('@/context/AuthContext', () => ({ AuthContext: require('react').createContext({}) }));

global.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => jest.clearAllMocks());

test('adding a compatible server validates it, persists it and selects it', async () => {
  const select = jest.fn();
  NativeModules.ServerTransport = { discover: jest.fn(async url =>
    url.endsWith('/v3/api-docs') ? { status: 200, body: '<html>frontend</html>' } :
    url.endsWith('/api/user/login') ? { status: 405, body: JSON.stringify({ status: 'ERROR', errorMessage: "Request method 'GET' is not supported" }) } :
    { status: 200, body: JSON.stringify({ status: 'OK', data: {} }) }) };
  let tree;
  await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
    instance: 'https://default.example', setInstance: select, logIn: jest.fn(), logInGuest: jest.fn(),
  }}><Login /></AuthContext.Provider>); });
  const open = tree.root.findAllByType(Pressable).find(p => p.props.accessibilityLabel === 'server.label');
  await act(async () => { open.props.onPress(); });
  const addOption = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'server.add'));
  await act(async () => { addOption.props.onPress(); });
  const input = tree.root.findByType(TextInput);
  await act(async () => { input.props.onChangeText('https://server.example/'); });
  const add = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'server.save'));
  await act(async () => { await add.props.onPress(); });
  expect(NativeModules.ServerTransport.discover).toHaveBeenCalledTimes(3);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('saved_server_urls_v1', JSON.stringify(['https://server.example']));
  expect(select).toHaveBeenCalledWith('https://server.example');
  await act(async () => tree.unmount());
});

test('invalid and incompatible addresses are not saved or selected', async () => {
  const select = jest.fn();
  NativeModules.ServerTransport = { discover: jest.fn(async () => ({ status: 200, body: '<html>not an API</html>' })) };
  let tree;
  await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
    instance: 'https://default.example', setInstance: select, logIn: jest.fn(), logInGuest: jest.fn(),
  }}><Login /></AuthContext.Provider>); });
  const open = tree.root.findAllByType(Pressable).find(p => p.props.accessibilityLabel === 'server.label');
  await act(async () => { open.props.onPress(); });
  const addOption = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'server.add'));
  await act(async () => { addOption.props.onPress(); });
  const add = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'server.save'));
  await act(async () => { await add.props.onPress(); });
  expect(NativeModules.ServerTransport.discover).not.toHaveBeenCalled();
  await act(async () => { tree.root.findByType(TextInput).props.onChangeText('https://invalid.example'); });
  await act(async () => { await add.props.onPress(); });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(Text).some(t => t.props.children === 'server.unavailable')).toBe(true);
  await act(async () => tree.unmount());
});

test('shows the configured server first and selects an existing server', async () => {
  const previous = process.env.EXPO_PUBLIC_API_URI;
  process.env.EXPO_PUBLIC_API_URI = 'https://default.example';
  AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['https://other.example']));
  const select = jest.fn();
  let tree;
  try {
    await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
      instance: 'https://default.example', setInstance: select, logIn: jest.fn(), logInGuest: jest.fn(),
    }}><Login /></AuthContext.Provider>); });
    const open = tree.root.findAllByType(Pressable).find(p => p.props.accessibilityLabel === 'server.label');
    await act(async () => { open.props.onPress(); });
    const options = tree.root.findAllByType(Text).filter(t =>
      typeof t.props.children === 'string' && t.props.children.includes('.example'));
    expect(options[0].props.children).toContain('https://default.example');
    const other = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
      .some(t => t.props.children === 'https://other.example'));
    await act(async () => { other.props.onPress(); });
    expect(select).toHaveBeenCalledWith('https://other.example');
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URI;
    else process.env.EXPO_PUBLIC_API_URI = previous;
    if (tree) await act(async () => tree.unmount());
  }
});

test('a generic OK response without the login endpoint signature is rejected', async () => {
  const select = jest.fn();
  NativeModules.ServerTransport = { discover: jest.fn(async () => ({ status: 200, body: JSON.stringify({ status: 'OK', data: {} }) })) };
  let tree;
  await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
    instance: 'https://default.example', setInstance: select, logIn: jest.fn(), logInGuest: jest.fn(),
  }}><Login /></AuthContext.Provider>); });
  await act(async () => { tree.root.findAllByType(Pressable).find(p => p.props.accessibilityLabel === 'server.label').props.onPress(); });
  await act(async () => { tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'server.add')).props.onPress(); });
  await act(async () => { tree.root.findByType(TextInput).props.onChangeText('https://other.example'); });
  await act(async () => { await tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'server.save')).props.onPress(); });
  expect(select).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});

test('closing the server dialog cancels validation and ignores a late response', async () => {
  const select = jest.fn();
  let resolveRequest;
  NativeModules.ServerTransport = { discover: jest.fn(() => new Promise(resolve => { resolveRequest = resolve; })), cancelDiscovery: jest.fn() };
  let tree;
  await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
    instance: 'https://default.example', setInstance: select, logIn: jest.fn(), logInGuest: jest.fn(),
  }}><Login /></AuthContext.Provider>); });
  await act(async () => { tree.root.findAllByType(Pressable).find(p => p.props.accessibilityLabel === 'server.label').props.onPress(); });
  await act(async () => { tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'server.add')).props.onPress(); });
  await act(async () => { tree.root.findByType(TextInput).props.onChangeText('https://other.example'); });
  let pending;
  await act(async () => { pending = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'server.save')).props.onPress(); });
  await act(async () => { tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'ok')).props.onPress(); });
  expect(NativeModules.ServerTransport.cancelDiscovery).toHaveBeenCalledTimes(1);
  await act(async () => { resolveRequest({ status: 200, body: JSON.stringify({ openapi:'3', paths: {
    '/api/user/login': { post: {} }, '/api/user/profile': { get: {} },
  } }) }); await pending; });
  expect(select).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});

test('does not navigate when guest initialization fails', async () => {
  const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
  let tree;
  await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
    instance: 'https://default.example', setInstance: jest.fn(), logIn: jest.fn(),
    logInGuest: jest.fn(async () => { throw new Error('context unavailable'); }),
  }}><Login /></AuthContext.Provider>); });
  const guest = tree.root.findAllByType(Pressable).find(p => p.findAllByType(Text)
    .some(t => t.props.children === 'login.guest'));
  await act(async () => { await guest.props.onPress(); });
  expect(router.replace).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(Text).some(t => t.props.children === 'login.genericError')).toBe(true);
  await act(async () => tree.unmount());
  logger.mockRestore();
});

test('deduplicates configured and saved URLs after normalization', async () => {
  const previous = process.env.EXPO_PUBLIC_API_URI;
  process.env.EXPO_PUBLIC_API_URI = 'https://default.example/';
  AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['https://default.example']));
  let tree;
  try {
    await act(async () => { tree = renderer.create(<AuthContext.Provider value={{
      instance: 'https://default.example', setInstance: jest.fn(), logIn: jest.fn(), logInGuest: jest.fn(),
    }}><Login /></AuthContext.Provider>); });
    await act(async () => { tree.root.findAllByType(Pressable).find(p => p.props.accessibilityLabel === 'server.label').props.onPress(); });
    const options = tree.root.findAllByType(Pressable).filter(p => p.findAllByType(Text)
      .some(t => typeof t.props.children === 'string' && t.props.children.startsWith('server.official —')));
    expect(options).toHaveLength(1);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URI;
    else process.env.EXPO_PUBLIC_API_URI = previous;
    if (tree) await act(async () => tree.unmount());
  }
});
