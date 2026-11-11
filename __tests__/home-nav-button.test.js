import React from 'react';
import renderer, { act } from 'react-test-renderer';

import HomeNavButton from '@/components/home/HomeNavButton';

jest.mock('expo-router', () => ({
  Link: ({ children }) => children,
}));
jest.mock('@/locales/i18n', () => ({ t: (key) => key }));

global.IS_REACT_ACT_ENVIRONMENT = true;

const Icon = () => null;

async function render(disabled) {
  let tree;
  await act(async () => {
    tree = renderer.create(
      <HomeNavButton
        title="Farmers"
        icon={Icon}
        link="/(farmers)/farmers"
        disabled={disabled}
      />
    );
  });
  return tree;
}

test('disables the navigation when there is no session', async () => {
  const tree = await render(true);
  const blocked = tree.root.findAll(
    (node) => node.props?.disabled === true
  );

  expect(blocked.length).toBeGreaterThan(0);
});

test('keeps the navigation enabled for an authenticated session', async () => {
  const tree = await render(false);
  const blocked = tree.root.findAll(
    (node) => node.props?.disabled === true
  );

  expect(blocked).toHaveLength(0);
});
