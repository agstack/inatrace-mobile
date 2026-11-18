import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import NetworkNotice from '@/components/home/NetworkNotice';

jest.mock('@/locales/i18n', () => ({ t: (key) => key }));
jest.mock('lucide-react-native', () => ({ WifiOff: () => null }));

global.IS_REACT_ACT_ENVIRONMENT = true;

async function render(networkState) {
  let tree;
  await act(async () => {
    tree = renderer.create(<NetworkNotice networkState={networkState} />);
  });
  return tree;
}

function texts(tree) {
  return tree.root.findAllByType(Text).map((node) => node.props.children);
}

test('shows the offline message when the network is offline', async () => {
  const tree = await render('offline');

  expect(texts(tree)).toContain('home.networkNotice.offline');
});

test('shows nothing while online or before the probe answered', async () => {
  expect((await render('online')).toJSON()).toBeNull();
  expect((await render('unknown')).toJSON()).toBeNull();
});
