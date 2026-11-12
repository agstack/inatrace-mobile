import React from 'react';
import { NativeModules, Text, TextInput } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Login from '../app/login';
import { AuthContext } from '@/context/AuthContext';
import { router } from 'expo-router';

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


function pressableWithText(root, text) {
  const textNode = root.findAllByType(Text).find((node) => node.props.children === text);
  let node = textNode;
  while (node && typeof node.props?.onPress !== 'function') node = node.parent;
  return node;
}

function pressableWithLabel(root, label) {
  let node = root.findAll((candidate) => candidate.props?.accessibilityLabel === label)[0];
  while (node && typeof node.props?.onPress !== 'function') node = node.parent;
  return node;
}

/**
 * A ServerTransport mock whose discoveries stay pending until the test
 * settles them. This keeps the validation deterministic (no timing) and
 * lets us verify cancellation on unmount.
 */
function createTransport() {
  const pending = [];
  const discover = jest.fn((url, id) => new Promise((resolve, reject) => {
    pending.push({ url, id, resolve, reject });
  }));
  const cancelDiscovery = jest.fn((id) => {
    pending
      .filter((entry) => entry.id === id)
      .forEach((entry) => entry.reject(new Error('cancelled')));
  });
  const cancelAll = () => {
    pending.forEach((entry) => entry.reject(new Error('cancelled')));
    pending.length = 0;
  };

  return { discover, cancelDiscovery, cancelAll, clearCookies: jest.fn(), pending };
}

let originalTransport;
let currentTransport;
let trees;

beforeAll(() => {
  originalTransport = NativeModules.ServerTransport;
});

beforeEach(() => {
  jest.clearAllMocks();
  trees = [];
  currentTransport = createTransport();
  NativeModules.ServerTransport = currentTransport;
});

afterEach(async () => {
  // Settle whatever the test left pending before unmounting, so a late
  // promise cannot reach the next test through the shared native module.
  currentTransport.cancelAll();
  await act(async () => {});

  for (const tree of trees) {
    try {
      await act(async () => tree.unmount());
    } catch (_) {
      // The tree was already unmounted by the test.
    }
  }

  trees = [];
  NativeModules.ServerTransport = originalTransport;
  jest.clearAllMocks();
});

async function renderLogin(contextValue = {}) {
  let tree;
  await act(async () => {
    tree = renderer.create(
      <AuthContext.Provider
        value={{
          instance: 'https://default.example',
          setInstance: jest.fn(),
          logIn: jest.fn(),
          logInGuest: jest.fn(),
          ...contextValue,
        }}
      >
        <Login />
      </AuthContext.Provider>
    );
  });
  trees.push(tree);
  return tree;
}

async function openServerDialog(tree) {
  await act(async () => {
    pressableWithLabel(tree.root, 'server.label').props.onPress();
  });
  await act(async () => {
    pressableWithText(tree.root, 'server.add').props.onPress();
  });
}

global.IS_REACT_ACT_ENVIRONMENT = true;

test('adding a compatible server validates it, persists it and selects it', async () => {
  const select = jest.fn();
  const tree = await renderLogin({ setInstance: select });
  await openServerDialog(tree);

  await act(async () => {
    tree.root.findByType(TextInput).props.onChangeText('https://server.example/');
  });
  await act(async () => {
    pressableWithText(tree.root, 'server.save').props.onPress();
  });

  expect(currentTransport.pending).toHaveLength(1);
  expect(currentTransport.pending[0].url).toContain('/v3/api-docs');
  await act(async () => {
    currentTransport.pending.shift().resolve({ status: 200, body: '<html>frontend</html>' });
  });

  expect(currentTransport.pending).toHaveLength(1);
  expect(currentTransport.pending[0].url).toContain('/api/public/globalSettings/MOBILE_SERVER_CHECK');
  await act(async () => {
    currentTransport.pending.shift().resolve({ status: 200, body: JSON.stringify({ status: 'OK', data: {} }) });
  });

  expect(currentTransport.pending).toHaveLength(1);
  expect(currentTransport.pending[0].url).toContain('/api/user/login');
  await act(async () => {
    currentTransport.pending.shift().resolve({ status: 405, body: JSON.stringify({ status: 'ERROR', errorMessage: "Request method 'GET' is not supported" }) });
  });
  await act(async () => {});

  expect(currentTransport.discover).toHaveBeenCalledTimes(3);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('saved_server_urls_v1', JSON.stringify(['https://server.example']));
  expect(select).toHaveBeenCalledWith('https://server.example');
}, 15000);

test('invalid and incompatible addresses are not saved or selected', async () => {
  const select = jest.fn();
  currentTransport.discover.mockImplementation(async () => ({ status: 200, body: '<html>not an API</html>' }));
  const tree = await renderLogin({ setInstance: select });
  await openServerDialog(tree);

  await act(async () => {
    await pressableWithText(tree.root, 'server.save').props.onPress();
  });
  expect(currentTransport.discover).not.toHaveBeenCalled();

  await act(async () => {
    tree.root.findByType(TextInput).props.onChangeText('https://invalid.example');
  });
  await act(async () => {
    await pressableWithText(tree.root, 'server.save').props.onPress();
  });

  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(Text).some(t => t.props.children === 'server.unavailable')).toBe(true);
});

test('shows the configured server first and selects an existing server', async () => {
  const previous = process.env.EXPO_PUBLIC_API_URI;
  process.env.EXPO_PUBLIC_API_URI = 'https://default.example';
  AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['https://other.example']));
  const select = jest.fn();

  try {
    const tree = await renderLogin({ setInstance: select });
    await act(async () => {
      pressableWithLabel(tree.root, 'server.label').props.onPress();
    });
    const options = tree.root.findAllByType(Text).filter(t =>
      typeof t.props.children === 'string' && t.props.children.includes('.example'));
    expect(options[0].props.children).toContain('https://default.example');
    const other = pressableWithText(tree.root, 'https://other.example');
    await act(async () => {
      other.props.onPress();
    });
    expect(select).toHaveBeenCalledWith('https://other.example');
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URI;
    else process.env.EXPO_PUBLIC_API_URI = previous;
  }
});

test('a generic OK response without the login endpoint signature is rejected', async () => {
  const select = jest.fn();
  currentTransport.discover.mockImplementation(async () => ({
    status: 200,
    body: JSON.stringify({ status: 'OK', data: {} }),
  }));
  const tree = await renderLogin({ setInstance: select });
  await openServerDialog(tree);
  await act(async () => {
    tree.root.findByType(TextInput).props.onChangeText('https://other.example');
  });
  await act(async () => {
    await pressableWithText(tree.root, 'server.save').props.onPress();
  });

  expect(select).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('closing the server dialog cancels validation and ignores a late response', async () => {
  const select = jest.fn();
  currentTransport.cancelDiscovery.mockImplementation(() => {});
  const tree = await renderLogin({ setInstance: select });
  await openServerDialog(tree);
  await act(async () => {
    tree.root.findByType(TextInput).props.onChangeText('https://other.example');
  });

  let pending;
  await act(async () => {
    pending = pressableWithText(tree.root, 'server.save').props.onPress();
  });
  expect(currentTransport.pending).toHaveLength(1);
  const id = currentTransport.pending[0].id;

  await act(async () => {
    pressableWithText(tree.root, 'ok').props.onPress();
  });
  expect(currentTransport.cancelDiscovery).toHaveBeenCalledWith(id);

  await act(async () => {
    currentTransport.pending[0].resolve({ status: 200, body: JSON.stringify({ openapi: '3', paths: {
      '/api/user/login': { post: {} }, '/api/user/profile': { get: {} },
    } }) });
    await pending;
  });

  expect(select).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('cancels a pending discovery when the screen unmounts', async () => {
  const select = jest.fn();
  const tree = await renderLogin({ setInstance: select });
  await openServerDialog(tree);
  await act(async () => {
    tree.root.findByType(TextInput).props.onChangeText('https://server.example');
  });
  await act(async () => {
    pressableWithText(tree.root, 'server.save').props.onPress();
  });

  expect(currentTransport.pending).toHaveLength(1);
  const id = currentTransport.pending[0].id;

  await act(async () => {
    tree.unmount();
  });
  trees = trees.filter((candidate) => candidate !== tree);

  expect(currentTransport.cancelDiscovery).toHaveBeenCalledWith(id);
  expect(currentTransport.discover).toHaveBeenCalledTimes(1);
  expect(select).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
}, 15000);

test('does not navigate when guest initialization fails', async () => {
  const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const tree = await renderLogin({
      logInGuest: jest.fn(async () => { throw new Error('context unavailable'); }),
    });
    const guest = pressableWithText(tree.root, 'login.guest');
    await act(async () => {
      await guest.props.onPress();
    });
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(tree.root.findAllByType(Text).some(t => t.props.children === 'login.genericError')).toBe(true);
  } finally {
    logger.mockRestore();
  }
});

test('deduplicates configured and saved URLs after normalization', async () => {
  const previous = process.env.EXPO_PUBLIC_API_URI;
  process.env.EXPO_PUBLIC_API_URI = 'https://default.example/';
  AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['https://default.example']));

  try {
    const tree = await renderLogin();
    await act(async () => {
      pressableWithLabel(tree.root, 'server.label').props.onPress();
    });
    const options = tree.root.findAllByType(Text).filter(t =>
      typeof t.props.children === 'string' && t.props.children.startsWith('server.official —'));
    expect(options).toHaveLength(1);
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URI;
    else process.env.EXPO_PUBLIC_API_URI = previous;
  }
});
