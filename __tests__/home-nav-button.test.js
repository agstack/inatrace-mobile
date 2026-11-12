import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import HomeNavButton from '@/components/home/HomeNavButton';

jest.mock('expo-router', () => ({
  Link: ({ children }) => children,
}));

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
        hint="Log in to use"
      />
    );
  });
  return tree;
}

test('disables the navigation and explains why when there is no session', async () => {
  const tree = await render(true);
  const blocked = tree.root.findAll(
    (node) => node.props?.disabled === true
  );
  const texts = tree.root.findAllByType(Text).map((node) => node.props.children);

  expect(blocked.length).toBeGreaterThan(0);
  expect(texts).toContain('Log in to use');
});

test('keeps the navigation enabled for an authenticated session', async () => {
  const tree = await render(false);
  const blocked = tree.root.findAll(
    (node) => node.props?.disabled === true
  );
  const texts = tree.root.findAllByType(Text).map((node) => node.props.children);

  expect(blocked).toHaveLength(0);
  expect(texts).not.toContain('Log in to use');
});
