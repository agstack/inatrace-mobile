import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import SessionNotice from '@/components/home/SessionNotice';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/locales/i18n', () => ({ t: (key) => key }));
jest.mock('lucide-react-native', () => ({
  ChevronRight: () => null,
  LogIn: () => null,
  UserRound: () => null,
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => jest.clearAllMocks());

async function render(state, onGuest = jest.fn()) {
  let tree;
  await act(async () => {
    tree = renderer.create(<SessionNotice state={state} onGuest={onGuest} />);
  });
  return tree;
}

function texts(tree) {
  return tree.root.findAllByType(Text).map((node) => node.props.children);
}

function buttons(tree) {
  return tree.root.findAll((node) => typeof node.props?.onPress === 'function');
}

test('shows nothing for an authenticated or unknown session', async () => {
  expect((await render('authenticated')).toJSON()).toBeNull();
  expect((await render('unknown')).toJSON()).toBeNull();
});

test('offers login and guest when there is no session', async () => {
  const onGuest = jest.fn();
  const tree = await render('none', onGuest);

  expect(texts(tree)).toContain('home.sessionNotice.none');
  const [guestButton, loginButton] = buttons(tree);

  await act(async () => {
    guestButton.props.onPress();
  });
  expect(onGuest).toHaveBeenCalled();

  await act(async () => {
    loginButton.props.onPress();
  });
  expect(router.push).toHaveBeenCalledWith('/login');
});

test('offers only login when the session expired', async () => {
  const tree = await render('expired');

  expect(texts(tree)).toContain('home.sessionNotice.expired');
  expect(buttons(tree)).toHaveLength(1);

  await act(async () => {
    buttons(tree)[0].props.onPress();
  });
  expect(router.push).toHaveBeenCalledWith('/login');
});

test('offers the guest area while in guest mode', async () => {
  const tree = await render('guest');

  expect(texts(tree)).toContain('home.sessionNotice.guest');
  expect(buttons(tree)).toHaveLength(1);

  await act(async () => {
    buttons(tree)[0].props.onPress();
  });
  expect(router.push).toHaveBeenCalledWith('/(app)/(farmers)/info/0');
});
