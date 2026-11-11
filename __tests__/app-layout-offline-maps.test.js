import React from 'react';
import renderer, { act } from 'react-test-renderer';

import AppLayout from '../app/(app)/_layout';
import { AuthContext } from '@/context/AuthContext';
import { router } from 'expo-router';

jest.mock('expo-router', () => {
  const Stack = ({ children }) => children ?? null;
  Stack.Screen = () => null;

  return {
    Stack,
    router: { push: jest.fn() },
    useSegments: () => ['(app)'],
  };
});
jest.mock('@/locales/i18n', () => ({ t: (key) => key }));
jest.mock('lucide-react-native', () => ({ ChevronLeft: () => null }));
jest.mock('@/context/AuthContext', () => ({
  AuthContext: require('react').createContext({}),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => jest.clearAllMocks());

function renderLayout(auth) {
  return (
    <AuthContext.Provider value={auth}>
      <AppLayout />
    </AuthContext.Provider>
  );
}

test('does not redirect to map download when the user has no offline map', async () => {
  const checkAuth = jest.fn(async () => true);
  const auth = {
    accessToken: 'token-a',
    checkAuth,
    guestAccess: false,
    logInGuest: jest.fn(async () => {}),
  };

  let tree;
  await act(async () => {
    tree = renderer.create(renderLayout(auth));
  });

  await act(async () => {
    tree.update(renderLayout({ ...auth, accessToken: 'token-b' }));
  });

  expect(checkAuth).toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
});

test('does not redirect guest users to map download', async () => {
  const auth = {
    accessToken: 'guest-a',
    checkAuth: jest.fn(async () => true),
    guestAccess: true,
    logInGuest: jest.fn(async () => {}),
  };

  let tree;
  await act(async () => {
    tree = renderer.create(renderLayout(auth));
  });

  await act(async () => {
    tree.update(renderLayout({ ...auth, accessToken: 'guest-b' }));
  });

  expect(auth.logInGuest).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
});
